import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IssuesListView } from "@/components/issues/issues-list-view";
import { getUser, getProject, getProjectMembers, getVirtualMembers, getProjectSprints } from "@/lib/data";

export default async function IssuesPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(key);
  if (!project) notFound();

  const supabase = await createClient();
  const [members, virtualMembers, sprints, issuesRes] = await Promise.all([
    getProjectMembers(project.id, project.owner_id),
    getVirtualMembers(project.id),
    getProjectSprints(project.id),
    supabase
      .from("issues")
      .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <IssuesListView
      project={project}
      initialIssues={issuesRes.data || []}
      members={members}
      virtualMembers={virtualMembers}
      sprints={sprints}
      userId={user.id}
    />
  );
}
