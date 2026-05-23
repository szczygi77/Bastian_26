-- BASTION — schemat Supabase (PostgreSQL)
-- Uruchom w Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

create extension if not exists "pgcrypto";

-- ─── Audit log ───────────────────────────────────────────────────────────────
create table if not exists public.audit_entries (
  id text primary key,
  timestamp timestamptz not null,
  operator text not null,
  action text not null,
  details text not null,
  mode text not null,
  severity text not null,
  affected_object text,
  incident_id text,
  alert_id text,
  export_hash text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_entries_timestamp_idx on public.audit_entries (timestamp desc);

-- ─── Alerty ──────────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id text primary key,
  title text not null,
  severity text not null,
  status text not null,
  source text not null,
  timestamp timestamptz not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists alerts_status_idx on public.alerts (status);
create index if not exists alerts_timestamp_idx on public.alerts (timestamp desc);

-- ─── Incydenty ───────────────────────────────────────────────────────────────
create table if not exists public.incidents (
  id text primary key,
  title text not null,
  severity text not null,
  status text not null,
  started_at timestamptz not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─── Misje dronów ────────────────────────────────────────────────────────────
create table if not exists public.drone_missions (
  id text primary key,
  drone_id text not null,
  target_object_id text not null,
  mission_type text not null,
  status text not null,
  assigned_at timestamptz not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists drone_missions_status_idx on public.drone_missions (status);
create index if not exists drone_missions_assigned_idx on public.drone_missions (assigned_at desc);

-- ─── Stany obiektów IK (nadpisania runtime) ───────────────────────────────────
create table if not exists public.ik_object_states (
  id text primary key,
  status text not null,
  coordinates jsonb,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── Scenariusze ─────────────────────────────────────────────────────────────
create table if not exists public.scenario_runs (
  id text primary key,
  scenario_id text not null,
  status text not null,
  started_at timestamptz not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─── Rekomendacje AI ─────────────────────────────────────────────────────────
create table if not exists public.recommendations (
  id text primary key,
  incident_id text,
  priority text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- ─── RLS (MVP / hackathon — otwarte dla anon; produkcja: auth + polityki) ─────
alter table public.audit_entries enable row level security;
alter table public.alerts enable row level security;
alter table public.incidents enable row level security;
alter table public.drone_missions enable row level security;
alter table public.ik_object_states enable row level security;
alter table public.scenario_runs enable row level security;
alter table public.recommendations enable row level security;

create policy "bastion_audit_all" on public.audit_entries for all using (true) with check (true);
create policy "bastion_alerts_all" on public.alerts for all using (true) with check (true);
create policy "bastion_incidents_all" on public.incidents for all using (true) with check (true);
create policy "bastion_missions_all" on public.drone_missions for all using (true) with check (true);
create policy "bastion_ik_states_all" on public.ik_object_states for all using (true) with check (true);
create policy "bastion_scenarios_all" on public.scenario_runs for all using (true) with check (true);
create policy "bastion_recommendations_all" on public.recommendations for all using (true) with check (true);
