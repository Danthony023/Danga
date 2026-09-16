alter table public.versions
  add column if not exists plan_snapshot jsonb;
