-- 나의 건강 기록장: Supabase SQL Editor에 통째로 붙여넣고 Run 하세요.
-- 모든 표는 로그인한 본인 기록만 읽고 쓸 수 있어요 (Row Level Security).

create table if not exists lab_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  dept text not null default '신장내과',
  "values" jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (user_id, date, dept)
);

create table if not exists daily (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  steps int, sbp int, dbp int, pulse int,
  weight numeric, lean numeric, smm numeric, fat numeric,
  water_ml int,
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists doses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  drug text not null default '마운자로',
  dose_mg numeric not null,
  site text,
  appetite int check (appetite between 1 and 5),
  side_effects text[] not null default '{}',
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists profile (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  start_weight numeric,
  target_weight numeric,
  start_date date,
  next_visit date,
  ref_overrides jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table lab_visits enable row level security;
alter table daily enable row level security;
alter table doses enable row level security;
alter table profile enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lab_visits','daily','doses','profile'] loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('create policy "own rows" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
