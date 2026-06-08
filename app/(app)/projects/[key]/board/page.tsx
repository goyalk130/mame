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
    .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*), parent:issues!parent_id(id, key, title, type)")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  if (project.type === "scrum" && sprintId) {
    query = query.eq("sprint_id", sprintId);
  }

  const { data: issues } = await query;
  console.log("BOARD ISSUES PARENT CHECK:", issues?.slice(0,3).map(i => ({ key: i.key, parent_id: i.parent_id, parent: (i as any).parent })));

  return (
    <BoardView
      project={project}
      initialIssues={issues || []}
      members={members}
      virtualMembers={virtualMembers}
      sprintId={sprintId}
      sprintName={sprintName}
      sprints={allSprints}
      userId={user.id}
    />
  );
}
