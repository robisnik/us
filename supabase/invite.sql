-- Run this after schema.sql.
--
-- IMPORTANT: adding a row here sends nobody anything. It is a guest list, not
-- an invitation. It only means that IF that person signs in, they are let
-- through instead of seeing an empty app.
--
-- An email is sent in exactly one situation: someone types their address into
-- the app and asks for a sign-in link. Nothing does that on its own, and no
-- code in this project currently can — the client that knows how is written
-- but deliberately not wired to anything yet.
--
-- Pookie's line is commented out until he says it is ready. Uncomment it then.

insert into invited (email, name, role) values
  ('robis.nik@gmail.com', 'Robis', 'him')
  -- , ('HER_EMAIL_HERE', 'Pookie', 'her')
on conflict (email) do update
  set name = excluded.name, role = excluded.role;

select * from invited;

-- ---------------------------------------------------------------- check up
-- Whether the photos bucket really got created cannot be told from outside:
-- to an anonymous caller a private bucket and a missing one look identical.
-- Ask from in here instead.

select id, name, public, created_at from storage.buckets;

select tablename, policyname
  from pg_policies
 where schemaname in ('public', 'storage')
 order by tablename, policyname;

