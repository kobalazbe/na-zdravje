-- Leaderboard: top shots per player across all sessions
-- Anonymous inserts allowed (no auth required to play).

create table if not exists public.leaderboard (
  id          bigserial primary key,
  player_name text      not null,
  emoji       text      not null default '🍺',
  sips        int       not null check (sips >= 0),
  session_id  uuid      not null,           -- client-generated per game session
  played_at   timestamptz not null default now()
);

-- No sensitive data — public read, anonymous insert, no update/delete.
alter table public.leaderboard enable row level security;

drop policy if exists "Anyone can read leaderboard" on public.leaderboard;
create policy "Anyone can read leaderboard"
  on public.leaderboard for select
  using (true);

drop policy if exists "Anyone can insert leaderboard" on public.leaderboard;
create policy "Anyone can insert leaderboard"
  on public.leaderboard for insert
  with check (true);

-- Index for the top-N query (order by sips desc)
create index if not exists leaderboard_sips_idx on public.leaderboard (sips desc);
