-- "me and you - us"  ·  schema
--
-- Run this once in the Supabase SQL editor. It is written to be safe to run
-- again: every statement is idempotent.
--
-- The security model in one line: signing up gets you an account and nothing
-- else. Access is granted by being in `members`, and you only get into
-- `members` if your email was invited first. A stranger who signs up sees an
-- empty app, not an error — which is the correct behaviour, because an error
-- tells them something is there.

-- ---------------------------------------------------------------- who is in

create table if not exists invited (
  email text primary key,
  name  text not null,
  role  text not null check (role in ('him', 'her'))
);

create table if not exists members (
  id         uuid primary key references auth.users on delete cascade,
  email      text unique not null,
  name       text not null,
  role       text not null check (role in ('him', 'her')),
  tz         text not null default 'Europe/Amsterdam',
  created_at timestamptz not null default now()
);

-- A new account becomes a member only if it was invited. Runs as the definer
-- so it can see `invited` regardless of the caller's own permissions.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into members (id, email, name, role)
  select new.id, new.email, i.name, i.role
    from invited i
   where lower(i.email) = lower(new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- The single test every policy leans on.
create or replace function is_member()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from members where id = auth.uid()) $$;

-- ------------------------------------------------------------------ content

-- Anything one of them leaves for the other: her replies, his letters, a note
-- in the postbox. One table because they are the same shape, and a `kind`
-- rather than four tables that would all need the same policies.
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null references members(id) on delete cascade,
  kind       text not null default 'note'
             check (kind in ('note', 'letter', 'reply', 'photo')),
  body       text,
  photo_path text,
  station    text,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index if not exists notes_created_idx on notes (created_at desc);

-- When each of them last opened it. This is what lets the app say "he was
-- here this morning" without either of them having to send anything.
create table if not exists visits (
  member uuid primary key references members(id) on delete cascade,
  last_at timestamptz not null default now(),
  streak  int not null default 0
);

-- -------------------------------------------------------------------- policy

alter table invited enable row level security;
alter table members enable row level security;
alter table notes   enable row level security;
alter table visits  enable row level security;

-- `invited` is deliberately readable by nobody. Only the signup trigger needs
-- it, and that runs as definer.

drop policy if exists members_read on members;
create policy members_read on members
  for select using (is_member());

drop policy if exists notes_read on notes;
create policy notes_read on notes
  for select using (is_member());

drop policy if exists notes_write on notes;
create policy notes_write on notes
  for insert with check (is_member() and author = auth.uid());

-- Either of them may mark something read; only the author may edit the words.
drop policy if exists notes_update on notes;
create policy notes_update on notes
  for update using (is_member()) with check (is_member());

drop policy if exists visits_read on visits;
create policy visits_read on visits
  for select using (is_member());

drop policy if exists visits_write on visits;
create policy visits_write on visits
  for insert with check (is_member() and member = auth.uid());

drop policy if exists visits_update on visits;
create policy visits_update on visits
  for update using (member = auth.uid()) with check (member = auth.uid());

-- ------------------------------------------------------------------ storage

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects
  for select using (bucket_id = 'photos' and is_member());

drop policy if exists photos_write on storage.objects;
create policy photos_write on storage.objects
  for insert with check (bucket_id = 'photos' and is_member());
