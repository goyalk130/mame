export type IssueType = "epic" | "story" | "task" | "bug" | "subtask";
export type IssueStatus = "todo" | "in_progress" | "in_review" | "done";
export type IssuePriority = "highest" | "high" | "medium" | "low" | "lowest";
export type ProjectType = "scrum" | "kanban";
export type SprintStatus = "planned" | "active" | "completed";
export type MemberRole = "admin" | "member";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  type: ProjectType;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  profile?: Profile;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Issue {
  id: string;
  key: string;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  project_id: string;
  sprint_id: string | null;
  assignee_id: string | null;
  reporter_id: string | null;
  parent_id: string | null;
  story_points: number | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  reporter?: Profile | null;
  virtual_assignee_id?: string | null;
  virtual_assignee?: VirtualMember | null;
  labels?: Label[];
  subtasks?: Issue[];
  parent?: Issue | null;
}

export interface VirtualMember {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Activity {
  id: string;
  issue_id: string;
  actor_id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  actor?: Profile;
}

export interface BoardColumn {
  id: IssueStatus;
  title: string;
  issues: Issue[];
}

export const STATUS_LABELS: Record<IssueStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  highest: "Highest",
  high: "High",
  medium: "Medium",
  low: "Low",
  lowest: "Lowest",
};

export const TYPE_LABELS: Record<IssueType, string> = {
  epic: "Epic",
  story: "Story",
  task: "Task",
  bug: "Bug",
  subtask: "Subtask",
};
