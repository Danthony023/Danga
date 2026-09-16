-- Danga initial schema

-- profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'creator', 'pro')),
  style_traits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- assets
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('video', 'audio', 'image')),
  storage_path text not null,
  size_bytes bigint not null,
  duration_seconds numeric,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.assets enable row level security;

create policy "Users can view own assets"
  on public.assets for select
  using (auth.uid() = user_id);

create policy "Users can insert own assets"
  on public.assets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own assets"
  on public.assets for update
  using (auth.uid() = user_id);

create policy "Users can delete own assets"
  on public.assets for delete
  using (auth.uid() = user_id);

-- projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  status text not null default 'drafting' check (status in ('drafting', 'rendering', 'done')),
  chat_history jsonb not null default '[]'::jsonb,
  edit_plan jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- versions
create table if not exists public.versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  version_number integer not null,
  render_job_id text,
  status text not null default 'pending' check (status in ('pending', 'rendering', 'done', 'failed')),
  output_url text,
  resolution text check (resolution in ('720p', '1080p', '4k')),
  pinned boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.versions enable row level security;

create policy "Users can view own versions"
  on public.versions for select
  using (auth.uid() = user_id);

create policy "Users can insert own versions"
  on public.versions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own versions"
  on public.versions for update
  using (auth.uid() = user_id);

create policy "Users can delete own versions"
  on public.versions for delete
  using (auth.uid() = user_id);

-- usage
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  renders_used integer not null default 0,
  messages_used integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, period_start)
);

alter table public.usage enable row level security;

create policy "Users can view own usage"
  on public.usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage"
  on public.usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own usage"
  on public.usage for update
  using (auth.uid() = user_id);

-- Auto-create profile + usage row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.usage (user_id, period_start)
  values (new.id, date_trunc('month', now())::date);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for creator assets
insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

create policy "Users can upload own assets"
  on storage.objects for insert
  with check (
    bucket_id = 'assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own assets in storage"
  on storage.objects for select
  using (
    bucket_id = 'assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own assets in storage"
  on storage.objects for update
  using (
    bucket_id = 'assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own assets in storage"
  on storage.objects for delete
  using (
    bucket_id = 'assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
