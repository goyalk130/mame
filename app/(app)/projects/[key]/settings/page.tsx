import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectSettings } from "@/components/projects/project-settings";

export default async function SettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase.from("projects").select("*").eq("key", key).single();
  if (!project) notFound();

  const { data: members } = await supabase
    .from("project_members")
    .select("*, profile:profiles(*)")
    .eq("project_id", project.id);

  return <ProjectSettings project={project} members={members || []} userId={user.id} />;
}
