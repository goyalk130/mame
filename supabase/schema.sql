-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  key text not null unique,
  description text,
  type text not null default 'scrum' check (type in ('scrum', 'kanban')),
  owner_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Project members
create table if not exists project_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

-- Sprints
create table if not exists sprints (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  goal text,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Labels
create table if not exists labels (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default now()
);

-- Issues
create table if not exists issues (
  id uuid default uuid_generate_v4() primary key,
  key text not null,
  title text not null,
  description text,
  type text not null default 'task' check (type in ('epic', 'story', 'task', 'bug', 'subtask')),
  status text not null default 'triage' check (status in ('triage', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'not_done', 'completed')),
  priority text not null default 'medium' check (priority in ('highest', 'high', 'medium', 'low', 'lowest')),
  project_id uuid references projects(id) on delete cascade not null,
  sprint_id uuid references sprints(id) on delete set null,
  assignee_id uuid references profiles(id) on delete set null,
  reporter_id uuid references profiles(id) on delete set null,
  parent_id uuid references issues(id) on delete set null,
  virtual_assignee_id uuid references virtual_members(id) on delete set null,
  story_points integer,
  due_date date,
  sort_order bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, key)
);

-- Virtual members (dummy/fake team members for personal tracking)
create table if not exists virtual_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_by uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- Issue labels
create table if not exists issue_labels (
  issue_id uuid references issues(id) on delete cascade not null,
  label_id uuid references labels(id) on delete cascade not null,
  primary key (issue_id, label_id)
);

-- Comments
create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  issue_id uuid references issues(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity log
create table if not exists activity (
  id uuid default uuid_generate_v4() primary key,
  issue_id uuid references issues(id) on delete cascade not null,
  actor_id uuid references profiles(id) on delete cascade not null,
  action text not null,
  field text,
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

-- Issue counter per project (for generating keys like PROJ-1, PROJ-2)
create table if not exists issue_counters (
  project_id uuid references projects(id) on delete cascade primary key,
  count integer not null default 0
);

-- Function to auto-create profile on signup
-- set search_path = public ensures the trigger finds the right schema
-- on conflict handles re-runs; exception swallows any remaining errors so auth never 500s
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Function to get next issue key
create or replace function get_next_issue_key(p_project_id uuid)
returns integer as $$
declare
  next_count integer;
begin
  insert into issue_counters (project_id, count)
  values (p_project_id, 1)
  on conflict (project_id)
  do update set count = issue_counters.count + 1
  returning count into next_count;
  return next_count;
end;
$$ language plpgsql;

-- Helper functions (security definer = bypass RLS, breaks circular reference)
create or replace function is_project_member(p_project_id uuid)
returns boolean language sql security definer set search_path = public as $f$
  select exists (select 1 from project_members where project_id = p_project_id and user_id = auth.uid());
$f$;

create or replace function is_project_owner(p_project_id uuid)
returns boolean language sql security definer set search_path = public as $f$
  select exists (select 1 from projects where id = p_project_id and owner_id = auth.uid());
$f$;

-- RLS Policies
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table sprints enable row level security;
alter table labels enable row level security;
alter table issues enable row level security;
alter table issue_labels enable row level security;
alter table comments enable row level security;
alter table activity enable row level security;
alter table issue_counters enable row level security;
alter table virtual_members enable row level security;

-- Drop all policies before recreating (idempotent)
do $$ declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute 'drop policy if exists "' || r.policyname || '" on ' || r.tablename;
  end loop;
end $$;

-- All policies use is_project_owner() / is_project_member() (security definer).
-- These functions bypass RLS when querying their tables, so there is zero
-- possibility of cross-policy recursion anywhere in the schema.

-- PROFILES
create policy "profiles_select" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- PROJECTS
create policy "projects_select"  on projects for select using (auth.uid() = owner_id or is_project_member(id));
create policy "projects_insert"  on projects for insert with check (auth.uid() = owner_id);
create policy "projects_update"  on projects for update using (auth.uid() = owner_id);
create policy "projects_delete"  on projects for delete using (auth.uid() = owner_id);

-- PROJECT_MEMBERS
create policy "members_select"  on project_members for select using (user_id = auth.uid() or is_project_owner(project_id));
create policy "members_insert"  on project_members for insert with check (is_project_owner(project_id));
create policy "members_delete"  on project_members for delete using (is_project_owner(project_id));

-- SPRINTS
create policy "sprints_all" on sprints for all using (is_project_owner(project_id) or is_project_member(project_id));

-- LABELS
create policy "labels_all" on labels for all using (is_project_owner(project_id) or is_project_member(project_id));

-- ISSUES
create policy "issues_all" on issues for all using (is_project_owner(project_id) or is_project_member(project_id));

-- ISSUE COUNTERS
create policy "counters_all" on issue_counters for all using (is_project_owner(project_id) or is_project_member(project_id));

-- VIRTUAL MEMBERS
create policy "virtual_members_all" on virtual_members for all using (is_project_owner(project_id) or is_project_member(project_id));

-- ISSUE_LABELS: look up the issue's project_id then use helpers
create policy "issue_labels_all" on issue_labels for all using (
  exists (select 1 from issues where id = issue_id and (is_project_owner(project_id) or is_project_member(project_id)))
);

-- COMMENTS
create policy "comments_all" on comments for all using (
  exists (select 1 from issues where id = issue_id and (is_project_owner(project_id) or is_project_member(project_id)))
);

-- ACTIVITY
create policy "activity_select" on activity for select using (
  exists (select 1 from issues where id = issue_id and (is_project_owner(project_id) or is_project_member(project_id)))
);
create policy "activity_insert" on activity for insert with check (
  exists (select 1 from issues where id = issue_id and (is_project_owner(project_id) or is_project_member(project_id)))
);

-- Indexes for query performance
create index if not exists idx_issues_project_id       on issues(project_id);
create index if not exists idx_issues_sprint_id        on issues(sprint_id);
create index if not exists idx_issues_parent_id        on issues(parent_id);
create index if not exists idx_issues_assignee_id      on issues(assignee_id);
create index if not exists idx_issues_status           on issues(project_id, status);
create index if not exists idx_issues_sort_order       on issues(project_id, sort_order);
create index if not exists idx_activity_issue_id       on activity(issue_id);
create index if not exists idx_activity_created_at     on activity(issue_id, created_at desc);
create index if not exists idx_comments_issue_id       on comments(issue_id);
create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_user    on project_members(user_id);
create index if not exists idx_sprints_project_id      on sprints(project_id);
create index if not exists idx_virtual_members_project on virtual_members(project_id);

-- Migrations (idempotent — safe to run on existing databases)
alter table issues add column if not exists virtual_assignee_id uuid references virtual_members(id) on delete set null;
alter table issues add column if not exists start_date date;
alter table issues alter column sort_order type bigint using sort_order::bigint;
alter table issues alter column status set default 'triage';
do $$ begin
  alter table issues drop constraint if exists issues_status_check;
  alter table issues add constraint issues_status_check check (status = any(array['triage','todo','in_progress','in_review','blocked','done','not_done','completed']));
exception when others then null;
end $$;
