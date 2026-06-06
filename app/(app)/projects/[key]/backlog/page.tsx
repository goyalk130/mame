import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BacklogView } from "@/components/backlog/backlog-view";

export default async function BacklogPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projectData } = await supabase.from("projects").select("*").eq("key", key).single();
  if (!projectData) notFound();
  const project = projectData as NonNullable<typeof projectData>;

  const { data: sprints } = await supabase
    .from("sprints")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  const { data: issues } = await supabase
    .from("issues")
    .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*)")
    .eq("project_id", project.id)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

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
    <BacklogView
      project={project}
      initialSprints={sprints || []}
      initialIssues={issues || []}
      members={allMembers}
      userId={user.id}
    />
  );
}
