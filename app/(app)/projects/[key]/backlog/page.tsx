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
  const [sprints, members, virtualMembers, issuesRes, labelsRes] = await Promise.all([
    getProjectSprints(project.id),
    getProjectMembers(project.id, project.owner_id),
    getVirtualMembers(project.id),
    supabase
      .from("issues")
      .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)")
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true }),
    supabase.from("labels").select("*").eq("project_id", project.id).order("created_at"),
  ]);

  const issueList = issuesRes.data || [];
  const issueIds = issueList.map((i: any) => i.id);
  let issuesWithLabels = issueList;
  if (issueIds.length > 0) {
    const { data: ilRows } = await supabase
      .from("issue_labels")
      .select("issue_id, label:labels(*)")
      .in("issue_id", issueIds);
    const labelsByIssue: Record<string, any[]> = {};
    for (const row of (ilRows || []) as any[]) {
      if (!labelsByIssue[row.issue_id]) labelsByIssue[row.issue_id] = [];
      if (row.label) labelsByIssue[row.issue_id].push(row.label);
    }
    issuesWithLabels = issueList.map((i: any) => ({ ...i, labels: labelsByIssue[i.id] || [] }));
  }

  // Fetch multi-assignees (reuse issueIds already declared above)
  let issuesWithAssignees = issuesWithLabels;
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
    issuesWithAssignees = issuesWithLabels.map((i: any) => ({ ...i, assignees: assigneesByIssue[i.id] || [] }));
  }

  return (
    <BacklogView
      project={project}
      initialSprints={sprints}
      initialIssues={issuesWithAssignees}
      initialLabels={labelsRes.data || []}
      members={members}
      virtualMembers={virtualMembers}
      userId={user.id}
    />
  );
}
