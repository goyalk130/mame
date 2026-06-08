import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdeasView } from "@/components/ideas/ideas-view";
import { getUser, getProject, getActiveSprint } from "@/lib/data";

export default async function IdeasPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(key);
  if (!project) redirect("/");

  const activeSprint = await getActiveSprint(project.id);

  const supabase = await createClient();
  const { data: ideas } = await supabase
    .from("ideas")
    .select("*, creator:profiles!created_by(*)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <IdeasView
      project={project}
      initialIdeas={ideas ?? []}
      activeSprint={activeSprint}
      userId={user.id}
    />
  );
}
