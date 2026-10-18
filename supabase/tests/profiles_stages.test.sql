begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Two users; the signup trigger creates their profiles and stages.
insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com');

-- Trigger (checked as the superuser, which bypasses RLS)
select is(
  (select count(*)::int from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a'),
  1, 'new user gets a profile');
select is(
  (select stale_after_days from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a'),
  14, 'profile has default stale threshold');
select results_eq(
  $$select name from public.stages where user_id = '00000000-0000-0000-0000-00000000000a' order by position$$,
  $$values ('Wishlist'), ('Applied'), ('Interviewing'), ('Offer')$$,
  'new user gets the four default stages in order');
select results_eq(
  $$select position from public.stages where user_id = '00000000-0000-0000-0000-00000000000a' order by position$$,
  $$values (0), (1), (2), (3)$$,
  'default stage positions are 0..3');

-- RLS as user A
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'A sees only one profile');
select is((select count(*)::int from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'),
  0, 'A cannot see B''s profile');
select is((select count(*)::int from public.stages), 4, 'A sees only their 4 stages');
select is((select count(*)::int from public.stages where user_id = '00000000-0000-0000-0000-00000000000b'),
  0, 'A cannot see B''s stages');

select throws_ok(
  $$insert into public.stages (user_id, name, position) values ('00000000-0000-0000-0000-00000000000b', 'Sneaky', 9)$$,
  '42501', null, 'A cannot insert a stage for B (user_id not grantable)');

-- A's own insert gets user_id from the default
select lives_ok(
  $$insert into public.stages (name, position) values ('Archive', 4)$$,
  'A can insert own stage');

update public.stages set name = 'Hacked' where user_id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set stale_after_days = 99 where user_id = '00000000-0000-0000-0000-00000000000b';
delete from public.stages where user_id = '00000000-0000-0000-0000-00000000000b';

reset role;
select is(
  (select count(*)::int from public.stages where user_id = '00000000-0000-0000-0000-00000000000b' and name <> 'Hacked'),
  4, 'A cannot update or delete B''s stages');
select is(
  (select stale_after_days from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'),
  14, 'A cannot update B''s profile');

-- Anonymous users get nothing
set local role anon;
select throws_ok($$select * from public.stages$$, '42501', null, 'anon has no access to stages');

select * from finish();
rollback;
