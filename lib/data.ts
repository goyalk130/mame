/**
 * Cached data fetchers for server components.
 *
 * React.cache() deduplicates identical calls within a single request/render tree.
 * Layout + page both calling getProject("KA") → only ONE Supabase round-trip.
 *
 * Note: unstable_cache cannot be used here because Supabase needs cookies()
 * for auth, and Next.js forbids dynamic data sources inside unstable_cache.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Project, Sprint, Profile } from "@/types";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface MemberWithProfile {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: Profile | null;
}

export interface VirtualMemberRow {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

// ─── Per-request deduplicated fetchers ───────────────────────────────────────
// React.cache() ensures each function is called at most once per request,
// no matter how many server components invoke it.

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data ? (data as unknown as Profile) : null;
});

export const getProject = cache(async (key: string): Promise<Project | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("key", key).single();
  return data ? (data as unknown as Project) : null;
});

export const getUserProjects = cache(async (userId: string): Promise<Project[]> => {
  const supabase = await createClient();
  const [ownedRes, memberRes] = await Promise.all([
    supabase.from("projects").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase.from("project_members").select("projects(*)").eq("user_id", userId),
  ]);
  const owned = (ownedRes.data as unknown as Project[]) || [];
  const member = ((memberRes.data || []) as any[]).map((m) => m.projects).filter(Boolean) as Project[];
  return [...owned, ...member].filter(
    (p, i, arr) => p && arr.findIndex((x) => x?.id === p.id) === i
  );
});

export const getProjectMembers = cache(async (projectId: string, ownerId: string): Promise<MemberWithProfile[]> => {
  const supabase = await createClient();
  const [membersRes, ownerRes] = await Promise.all([
    supabase.from("project_members").select("*, profile:profiles(*)").eq("project_id", projectId),
    supabase.from("profiles").select("*").eq("id", ownerId).single(),
  ]);
  const members = (membersRes.data as any[]) || [];
  const owner = ownerRes.data as Profile | null;
  return [
    ...(owner ? [{ id: "owner", project_id: projectId, user_id: ownerId, role: "admin", created_at: "", profile: owner }] : []),
    ...members.filter((m) => m.user_id !== ownerId),
  ];
});

export const getVirtualMembers = cache(async (projectId: string): Promise<VirtualMemberRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("virtual_members").select("*").eq("project_id", projectId).order("created_at");
  return (data as unknown as VirtualMemberRow[]) || [];
});

export const getProjectSprints = cache(async (projectId: string): Promise<Sprint[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("sprints").select("*").eq("project_id", projectId).order("created_at");
  return (data as unknown as Sprint[]) || [];
});

export const getActiveSprint = cache(async (projectId: string): Promise<Sprint | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("sprints").select("*").eq("project_id", projectId).eq("status", "active").single();
  return data ? (data as unknown as Sprint) : null;
});
