-- Foundation: profiles and stages, plus the signup trigger that seeds them.

create function public.is_valid_time_zone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select tz is null or exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

-- profiles ---------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  time_zone text check (public.is_valid_time_zone(time_zone)),
  stale_after_days int not null default 14
    check (stale_after_days between 1 and 365)
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Rows are created by the signup trigger only, so no insert/delete policy.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (time_zone, stale_after_days) on public.profiles to authenticated;

-- stages -----------------------------------------------------------------

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  position int not null,
  unique (id, user_id)
);

create unique index stages_user_id_lower_name_key
  on public.stages (user_id, lower(name));

alter table public.stages enable row level security;

create policy "stages: select own" on public.stages
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "stages: insert own" on public.stages
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "stages: update own" on public.stages
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "stages: delete own" on public.stages
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- user_id comes from its column default (auth.uid()), so it is not granted.
revoke all on public.stages from anon, authenticated;
grant select, delete on public.stages to authenticated;
grant insert (name, position), update (name, position) on public.stages to authenticated;

-- signup trigger ---------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);

  insert into public.stages (user_id, name, position)
  values
    (new.id, 'Wishlist', 0),
    (new.id, 'Applied', 1),
    (new.id, 'Interviewing', 2),
    (new.id, 'Offer', 3);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
