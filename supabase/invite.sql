-- Run this after schema.sql, with the real addresses.
--
-- Nobody can reach anything in the app until their email is listed here, so
-- this is the door. Adding a row does not create an account — it means that
-- when that person signs in with a magic link, they are let through.

insert into invited (email, name, role) values
  ('robis.nik@gmail.com', 'Robis',  'him'),
  ('REPLACE_WITH_HER_EMAIL', 'Pookie', 'her')
on conflict (email) do update
  set name = excluded.name, role = excluded.role;

select * from invited;
