import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IssuesListView } from "@/components/issues/issues-list-view";
import { getUser, getProject, getProjectMembers, getVirtualMembers, getProjectSprints } from "@/lib/data";

export default async function IssuesPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(key);
  if (!project) redirect("/");

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

  const issueList = issuesRes.data || [];
  const issueIds = issueList.map((i: any) => i.id);
  let issuesWithAssignees = issueList;
  if (issueIds.length > 0) {
    const { data: assigneeRows } = await supabase
      .from("issue_assignees")
      .select("*, profile:profiles!user_id(*), virtual_member:virtual_members!virtual_member_id(*)")
      .in("issue_id", issueIds);
    const assigneesByIssue: Record<string, any[]> = {};
    for (const row of (assigneeRows || []) as any[]) {
      if (!assigneesByIssue[row.issue_id]) assigneesByIssue[row.issue_id] = [];
      assigneesByIssue[row.issue_id].push(row);
    }
    issuesWithAssignees = issueList.map((i: any) => ({ ...i, assignees: assigneesByIssue[i.id] || [] }));
  }

  return (
    <IssuesListView
      project={project}
      initialIssues={issuesWithAssignees}
      members={members}
      virtualMembers={virtualMembers}
      sprints={sprints}
      userId={user.id}
    />
  );
}
