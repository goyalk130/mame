import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectsHome } from "@/components/projects/projects-home";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: memberProjects } = await supabase
    .from("project_members")
    .select("projects(*)")
    .eq("user_id", user.id);

  const allProjects = [
    ...(ownedProjects || []),
    ...((memberProjects || []).map((m: any) => m.projects).filter(Boolean)),
  ].filter((p, i, arr) => arr.findIndex((x: any) => x.id === p.id) === i);

  return <ProjectsHome projects={allProjects} userId={user.id} />;
}
