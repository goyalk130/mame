import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusView } from "@/components/status/status-view";

export default async function StatusPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase.from("projects").select("*").eq("key", key).single();
  if (!project) notFound();

  const { data: issues } = await supabase
    .from("issues")
    .select("id, type, status, assignee_id, virtual_assignee_id, parent_id, title, key, story_points, start_date, due_date, created_at")
    .eq("project_id", project.id);

  const { data: members } = await supabase
    .from("project_members")
    .select("*, profile:profiles(*)")
    .eq("project_id", project.id);

  const { data: ownerProfile } = await supabase
    .from("profiles").select("*").eq("id", project.owner_id).single();

  const { data: virtualMembers } = await supabase
    .from("virtual_members").select("*").eq("project_id", project.id).order("created_at");

  const allMembers = [
    ...(ownerProfile ? [{ id: "owner", project_id: project.id, user_id: project.owner_id, role: "admin", created_at: "", profile: ownerProfile }] : []),
    ...((members || []).filter((m: any) => m.user_id !== project.owner_id)),
  ];

  return (
    <StatusView
      project={project}
      issues={issues || []}
      members={allMembers}
      virtualMembers={virtualMembers || []}
    />
  );
}
