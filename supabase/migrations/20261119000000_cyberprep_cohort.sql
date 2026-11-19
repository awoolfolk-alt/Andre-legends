create table if not exists public.cyberprep_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  is_shared boolean not null default false,
  best_wpm integer not null default 0 check (best_wpm >= 0),
  quiz_accuracy integer not null default 0 check (quiz_accuracy between 0 and 100),
  fence_tiles integer not null default 0 check (fence_tiles >= 0),
  best_raid_score integer not null default 0 check (best_raid_score between 0 and 3),
  updated_at timestamptz not null default now()
);

alter table public.cyberprep_profiles enable row level security;

create policy "Players read shared profiles or their own"
  on public.cyberprep_profiles for select to authenticated
  using (is_shared or user_id = auth.uid());

create policy "Players create their own profile"
  on public.cyberprep_profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "Players update their own profile"
  on public.cyberprep_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.cyberprep_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (topic in ('terminal', 'phishing', 'network', 'study')),
  note text not null check (char_length(note) between 8 and 500),
  created_at timestamptz not null default now()
);

alter table public.cyberprep_notes enable row level security;

create policy "Signed-in players read Mentor Notes"
  on public.cyberprep_notes for select to authenticated
  using (auth.uid() is not null);

create policy "Players post notes after joining the cohort"
  on public.cyberprep_notes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.cyberprep_profiles
      where cyberprep_profiles.user_id = auth.uid()
        and cyberprep_profiles.is_shared = true
    )
  );

create policy "Players delete their own Mentor Notes"
  on public.cyberprep_notes for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update on public.cyberprep_profiles to authenticated;
grant select, insert, delete on public.cyberprep_notes to authenticated;
