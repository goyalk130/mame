export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; avatar_url: string | null; created_at: string };
        Insert: { id: string; email: string; full_name?: string | null; avatar_url?: string | null; created_at?: string };
        Update: { id?: string; email?: string; full_name?: string | null; avatar_url?: string | null; created_at?: string };
      };
      projects: {
        Row: { id: string; name: string; key: string; description: string | null; type: string; owner_id: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; key: string; description?: string | null; type?: string; owner_id: string; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; key?: string; description?: string | null; type?: string; owner_id?: string; updated_at?: string };
      };
      project_members: {
        Row: { id: string; project_id: string; user_id: string; role: string; created_at: string };
        Insert: { id?: string; project_id: string; user_id: string; role?: string; created_at?: string };
        Update: { role?: string };
      };
      sprints: {
        Row: { id: string; project_id: string; name: string; goal: string | null; status: string; start_date: string | null; end_date: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; project_id: string; name: string; goal?: string | null; status?: string; start_date?: string | null; end_date?: string | null };
        Update: { name?: string; goal?: string | null; status?: string; start_date?: string | null; end_date?: string | null; updated_at?: string };
      };
      labels: {
        Row: { id: string; project_id: string; name: string; color: string; created_at: string };
        Insert: { id?: string; project_id: string; name: string; color?: string };
        Update: { name?: string; color?: string };
      };
      issues: {
        Row: { id: string; key: string; title: string; description: string | null; type: string; status: string; priority: string; project_id: string; sprint_id: string | null; assignee_id: string | null; reporter_id: string | null; parent_id: string | null; story_points: number | null; due_date: string | null; sort_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; key: string; title: string; description?: string | null; type?: string; status?: string; priority?: string; project_id: string; sprint_id?: string | null; assignee_id?: string | null; reporter_id?: string | null; parent_id?: string | null; story_points?: number | null; due_date?: string | null; sort_order?: number };
        Update: { title?: string; description?: string | null; type?: string; status?: string; priority?: string; sprint_id?: string | null; assignee_id?: string | null; reporter_id?: string | null; parent_id?: string | null; story_points?: number | null; due_date?: string | null; sort_order?: number; updated_at?: string };
      };
      issue_labels: {
        Row: { issue_id: string; label_id: string };
        Insert: { issue_id: string; label_id: string };
        Update: never;
      };
      comments: {
        Row: { id: string; issue_id: string; author_id: string; body: string; created_at: string; updated_at: string };
        Insert: { id?: string; issue_id: string; author_id: string; body: string };
        Update: { body?: string; updated_at?: string };
      };
      activity: {
        Row: { id: string; issue_id: string; actor_id: string; action: string; field: string | null; old_value: string | null; new_value: string | null; created_at: string };
        Insert: { id?: string; issue_id: string; actor_id: string; action: string; field?: string | null; old_value?: string | null; new_value?: string | null };
        Update: never;
      };
      issue_counters: {
        Row: { project_id: string; count: number };
        Insert: { project_id: string; count?: number };
        Update: { count?: number };
      };
    };
    Functions: {
      get_next_issue_key: { Args: { p_project_id: string }; Returns: number };
    };
  };
}
