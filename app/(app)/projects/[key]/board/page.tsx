import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoardView } from "@/components/board/board-view";

export default async function BoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase.from("projects").select("*").eq("key", key).single();
  if (!project) notFound();

  // Get active sprint for scrum
  let sprintId: string | null = null;
  if (project.type === "scrum") {
    const { data: sprint } = await supabase
      .from("sprints")
      .select("*")
      .eq("project_id", project.id)
      .eq("status", "active")
      .single();
    sprintId = sprint?.id ?? null;
  }

  // Fetch issues for this board
  let query = supabase
    .from("issues")
    .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*)")
    .eq("project_id", project.id)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

  if (project.type === "scrum") {
    if (sprintId) {
      query = query.eq("sprint_id", sprintId);
    } else {
      query = query.is("sprint_id", null).eq("status", "todo"); // show nothing meaningful
      const { data: issues } = await query;
      return <BoardView project={project} initialIssues={[]} members={[]} sprintId={null} userId={user.id} />;
    }
  }

  const { data: issues } = await query;

  // Fetch members
  const { data: members } = await supabase
    .from("project_members")
    .select("*, profile:profiles(*)")
    .eq("project_id", project.id);

  const { data: ownerProfile } = await supabase.from("profiles").select("*").eq("id", project.owner_id).single();

  const allMembers = [
    ...(ownerProfile ? [{ id: "owner", project_id: project.id, user_id: project.owner_id, role: "admin", created_at: "", profile: ownerProfile }] : []),
    ...(members || []).filter((m: any) => m.user_id !== project.owner_id),
  ];

  return (
    <BoardView
      project={project}
      initialIssues={issues || []}
      members={allMembers}
      sprintId={sprintId}
      userId={user.id}
    />
  );
}
