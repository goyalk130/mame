import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusView } from "@/components/status/status-view";
import { getUser, getProject, getProjectMembers, getVirtualMembers } from "@/lib/data";

export default async function StatusPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(key);
  if (!project) notFound();

  const supabase = await createClient();
  const [members, virtualMembers, issuesRes] = await Promise.all([
    getProjectMembers(project.id, project.owner_id),
    getVirtualMembers(project.id),
    supabase
      .from("issues")
      .select("id, type, status, assignee_id, virtual_assignee_id, parent_id, title, key, story_points, start_date, due_date, created_at")
      .eq("project_id", project.id),
  ]);

  return (
    <StatusView
      project={project}
      issues={issuesRes.data || []}
      members={members}
      virtualMembers={virtualMembers}
    />
  );
}
