import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoardView } from "@/components/board/board-view";
import { getUser, getProject, getProjectMembers, getVirtualMembers, getProjectSprints, getActiveSprint } from "@/lib/data";

export default async function BoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(key);
  if (!project) redirect("/");

  // Cached helpers + issues in parallel
  const supabase = await createClient();
  const [members, virtualMembers, allSprints, activeSprint] = await Promise.all([
    getProjectMembers(project.id, project.owner_id),
    getVirtualMembers(project.id),
    getProjectSprints(project.id),
    project.type === "scrum" ? getActiveSprint(project.id) : Promise.resolve(null),
  ]);

  const sprintId = activeSprint?.id ?? null;
  const sprintName = activeSprint?.name ?? null;

  // No active sprint for scrum — nothing to show
  if (project.type === "scrum" && !sprintId) {
    return (
      <BoardView
        project={project}
        initialIssues={[]}
        members={members}
        virtualMembers={virtualMembers}
        sprintId={null}
        sprintName={null}
        sprints={allSprints}
        userId={user.id}
      />
    );
  }

  let query = supabase
    .from("issues")
    .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  if (project.type === "scrum" && sprintId) {
    query = query.eq("sprint_id", sprintId);
  }

  const { data: issues } = await query;

  const issueList = issues || [];
  const issueIds = issueList.map(i => i.id);
  const parentIds = [...new Set(issueList.map(i => i.parent_id).filter(Boolean))] as string[];

  // Fetch parents, issue labels, and all project labels in parallel
  const [parentsResult, labelsResult, allLabelsResult] = await Promise.all([
    parentIds.length > 0
      ? supabase.from("issues").select("id, key, title, type").in("id", parentIds)
      : Promise.resolve({ data: [] }),
    issueIds.length > 0
      ? supabase.from("issue_labels").select("issue_id, label:labels(*)").in("issue_id", issueIds)
      : Promise.resolve({ data: [] }),
    supabase.from("labels").select("*").eq("project_id", project.id).order("created_at"),
  ]);

  const parentMap = Object.fromEntries((parentsResult.data || []).map((p: any) => [p.id, p]));

  // Group labels by issue_id
  const labelsByIssue: Record<string, any[]> = {};
  for (const row of (labelsResult.data || []) as any[]) {
    if (!labelsByIssue[row.issue_id]) labelsByIssue[row.issue_id] = [];
    if (row.label) labelsByIssue[row.issue_id].push(row.label);
  }

  const issuesWithParent = issueList.map(i => ({
    ...i,
    parent: i.parent_id ? (parentMap[i.parent_id] ?? null) : null,
    labels: labelsByIssue[i.id] || [],
  }));

  return (
    <BoardView
      project={project}
      initialIssues={issuesWithParent}
      initialLabels={allLabelsResult.data || []}
      members={members}
      virtualMembers={virtualMembers}
      sprintId={sprintId}
      sprintName={sprintName}
      sprints={allSprints}
      userId={user.id}
    />
  );
}
