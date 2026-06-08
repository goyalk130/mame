import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BacklogView } from "@/components/backlog/backlog-view";
import { getUser, getProject, getProjectMembers, getVirtualMembers, getProjectSprints } from "@/lib/data";

export default async function BacklogPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(key);
  if (!project) redirect("/");

  // All parallel — issues is the only non-cached query (always fresh)
  const supabase = await createClient();
  const [sprints, members, virtualMembers, issuesRes] = await Promise.all([
    getProjectSprints(project.id),
    getProjectMembers(project.id, project.owner_id),
    getVirtualMembers(project.id),
    supabase
      .from("issues")
      .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)")
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <BacklogView
      project={project}
      initialSprints={sprints}
      initialIssues={issuesRes.data || []}
      members={members}
      virtualMembers={virtualMembers}
      userId={user.id}
    />
  );
}
