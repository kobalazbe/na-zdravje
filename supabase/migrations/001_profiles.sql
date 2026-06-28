-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.

-- 1. Profiles table — one row per auth user, owns the entitlement tier
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  tier                  text not null default 'free',
  pass_expiry           timestamptz,
  stripe_subscription_id text,
  created_at            timestamptz default now()
);

-- Add stripe_subscription_id if the table already existed without it
alter table public.profiles
  add column if not exists stripe_subscription_id text;

-- 2. Row-level security — users can only read their own profile row
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Service-role (used by the Edge Function) bypasses RLS, so no extra policy needed.

-- 3. Trigger: auto-create a free profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Back-fill: create profile rows for any existing users who don't have one yet
insert into public.profiles (id)
select id from auth.users
where id not in (select id from public.profiles)
on conflict do nothing;
