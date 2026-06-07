-- Ideas table
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  converted boolean not null default false,
  converted_at timestamptz,
  converted_issue_id uuid references public.issues(id) on delete set null
);

alter table public.ideas enable row level security;

-- Project members and owners can view ideas
create policy "Project members can view ideas"
  on public.ideas for select
  using (
    exists (
      select 1 from public.project_members
      where project_id = ideas.project_id and user_id = auth.uid()
    ) or
    exists (
      select 1 from public.projects
      where id = ideas.project_id and owner_id = auth.uid()
    )
  );

-- Project members and owners can create ideas
create policy "Project members can create ideas"
  on public.ideas for insert
  with check (
    auth.uid() = created_by and (
      exists (
        select 1 from public.project_members
        where project_id = ideas.project_id and user_id = auth.uid()
      ) or
      exists (
        select 1 from public.projects
        where id = ideas.project_id and owner_id = auth.uid()
      )
    )
  );

-- Owners and admins can update any idea (e.g. mark converted); creators can update their own
create policy "Members can update ideas"
  on public.ideas for update
  using (
    auth.uid() = created_by or
    exists (
      select 1 from public.project_members
      where project_id = ideas.project_id and user_id = auth.uid() and role = 'admin'
    ) or
    exists (
      select 1 from public.projects
      where id = ideas.project_id and owner_id = auth.uid()
    )
  );

-- Creators and admins can delete ideas
create policy "Members can delete ideas"
  on public.ideas for delete
  using (
    auth.uid() = created_by or
    exists (
      select 1 from public.project_members
      where project_id = ideas.project_id and user_id = auth.uid() and role = 'admin'
    ) or
    exists (
      select 1 from public.projects
      where id = ideas.project_id and owner_id = auth.uid()
    )
  );
