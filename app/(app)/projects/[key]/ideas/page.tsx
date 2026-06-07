import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdeasView } from "@/components/ideas/ideas-view";
import { getUser, getProject, getActiveSprint, getProfile } from "@/lib/data";

export default async function IdeasPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(key);
  if (!project) notFound();

  const [activeSprint, userProfile] = await Promise.all([
    getActiveSprint(project.id),
    getProfile(user.id),
  ]);

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
      userProfile={userProfile}
    />
  );
}
