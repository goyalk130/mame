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
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'medium' check (priority in ('highest', 'high', 'medium', 'low', 'lowest')),
  project_id uuid references projects(id) on delete cascade not null,
  sprint_id uuid references sprints(id) on delete set null,
  assignee_id uuid references profiles(id) on delete set null,
  reporter_id uuid references profiles(id) on delete set null,
  parent_id uuid references issues(id) on delete set null,
  story_points integer,
  due_date date,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, key)
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
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

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

-- Profiles: anyone can read, only self can update
create policy "Profiles are viewable by authenticated users" on profiles
  for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Projects: members can see their projects
create policy "Project members can view projects" on projects
  for select using (
    auth.uid() = owner_id or
    exists (select 1 from project_members where project_id = id and user_id = auth.uid())
  );
create policy "Authenticated users can create projects" on projects
  for insert with check (auth.uid() = owner_id);
create policy "Project admins can update projects" on projects
  for update using (
    auth.uid() = owner_id or
    exists (select 1 from project_members where project_id = id and user_id = auth.uid() and role = 'admin')
  );
create policy "Project owner can delete" on projects
  for delete using (auth.uid() = owner_id);

-- Project members
create policy "Members can view project members" on project_members
  for select using (
    exists (select 1 from project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
    or exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy "Project admins can manage members" on project_members
  for all using (
    exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- Sprints, labels, issues, comments, activity: project members
create policy "Project members can view sprints" on sprints
  for select using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id
      where p.id = project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );
create policy "Project members can manage sprints" on sprints
  for all using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id
      where p.id = project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );

create policy "Project members can view labels" on labels
  for select using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id
      where p.id = project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );
create policy "Project members can manage labels" on labels
  for all using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id
      where p.id = project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );

create policy "Project members can view issues" on issues
  for select using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id
      where p.id = project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );
create policy "Project members can manage issues" on issues
  for all using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id
      where p.id = project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );

create policy "Project members can view issue_labels" on issue_labels
  for select using (
    exists (
      select 1 from issues i
      join projects p on p.id = i.project_id
      left join project_members pm on pm.project_id = p.id
      where i.id = issue_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );
create policy "Project members can manage issue_labels" on issue_labels
  for all using (
    exists (
      select 1 from issues i
      join projects p on p.id = i.project_id
      left join project_members pm on pm.project_id = p.id
      where i.id = issue_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );

create policy "Project members can view comments" on comments
  for select using (
    exists (
      select 1 from issues i
      join projects p on p.id = i.project_id
      left join project_members pm on pm.project_id = p.id
      where i.id = issue_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );
create policy "Project members can manage comments" on comments
  for all using (
    exists (
      select 1 from issues i
      join projects p on p.id = i.project_id
      left join project_members pm on pm.project_id = p.id
      where i.id = issue_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );

create policy "Project members can view activity" on activity
  for select using (
    exists (
      select 1 from issues i
      join projects p on p.id = i.project_id
      left join project_members pm on pm.project_id = p.id
      where i.id = issue_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );
create policy "Project members can insert activity" on activity
  for insert with check (
    exists (
      select 1 from issues i
      join projects p on p.id = i.project_id
      left join project_members pm on pm.project_id = p.id
      where i.id = issue_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );

create policy "Project members can view issue_counters" on issue_counters
  for select using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id
      where p.id = project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );
create policy "Project members can manage issue_counters" on issue_counters
  for all using (
    exists (
      select 1 from projects p
      left join project_members pm on pm.project_id = p.id
      where p.id = project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
    )
  );
