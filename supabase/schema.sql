-- ============ MakeItHappen — Supabase schema ============
-- Run this in the Supabase SQL editor. All tables are RLS-scoped to auth.uid().

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('work', 'personal')),
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace text not null check (workspace in ('work', 'personal')),
  title text not null,
  description text default '',
  status text not null default 'active' check (status in ('active', 'hold', 'complete')),
  owner text default '',
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'active' check (status in ('active', 'hold', 'complete')),
  sort_order int not null default 0
);

create table if not exists subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone_id uuid not null references milestones (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  is_next_action boolean not null default false,
  flow_state text check (flow_state in ('delegated', 'waiting')),
  delegated_to text,
  waiting_for text,
  assignee text default '',
  calendar_link text,
  sort_order int not null default 0
);

create table if not exists status_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  author_id uuid references auth.users (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace text not null check (workspace in ('work', 'personal')),
  title text not null,
  due_date date,
  context_tag text default '',
  project_id uuid references projects (id) on delete set null,
  is_next_action boolean not null default false,
  flow_state text check (flow_state in ('delegated', 'waiting')),
  delegated_to text,
  waiting_for text,
  reminder_at timestamptz,
  done boolean not null default false,
  someday boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace text not null check (workspace in ('work', 'personal')),
  name text not null,
  company text default '',
  role text default '',
  email text default '',
  phone text default '',
  relationship_type text not null default 'Other'
    check (relationship_type in ('Colleague', 'Client', 'Vendor', 'Friend', 'Family', 'Other')),
  remember_this text default '',
  last_interaction_date date,
  last_interaction_note text default '',
  follow_up_flag boolean not null default false,
  avatar_color text default '#4F6BED',
  created_at timestamptz not null default now()
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace text not null check (workspace in ('work', 'personal')),
  name text not null,
  emoji text default '🎯',
  cadence_type text not null default 'daily' check (cadence_type in ('daily', 'weekly', 'specific_days', 'every_n_days')),
  cadence_days int[] default null,
  cadence_interval int default null,
  created_at timestamptz not null default now()
);

create table if not exists habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references habits (id) on delete cascade,
  completed_date date not null default current_date,
  unique (habit_id, completed_date)
);

create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  milestone_collapsible boolean not null default true,
  milestone_default_state text not null default 'active' check (milestone_default_state in ('all', 'active', 'none')),
  milestone_count_collapsed boolean not null default true,
  anthropic_key text
);

-- Migration: add anthropic_key to existing databases
alter table user_preferences add column if not exists anthropic_key text;

-- ---- Row Level Security ----
do $$
declare t text;
begin
  foreach t in array array[
    'workspaces', 'projects', 'milestones', 'subtasks', 'status_updates',
    'tasks', 'contacts', 'habits', 'habit_completions', 'user_preferences'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t
    );
  end loop;
end $$;

-- Seed default workspaces on first login
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into workspaces (user_id, kind) values (new.id, 'work'), (new.id, 'personal')
  on conflict do nothing;
  insert into user_preferences (user_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---- Full app-state store (JSONB blob, synced from the client store) ----
-- The relational tables above are the long-term schema target; this table
-- is used by the client today for fast, schema-free persistence.
create table if not exists user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table user_data enable row level security;
drop policy if exists "own rows" on user_data;
create policy "own rows" on user_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists user_data_updated_at on user_data;
create trigger user_data_updated_at
  before update on user_data
  for each row execute function touch_updated_at();
