import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectsHome } from "@/components/projects/projects-home";
import { LayoutShell } from "@/components/layout/layout-shell";
import { runSchema } from "@/lib/db";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "karranngoyal@gmail.com";

export default async function ProjectsPage() {
  await runSchema();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: ownedProjects } = await supabase
    .from("projects").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  const { data: memberProjects } = await supabase
    .from("project_members").select("projects(*)").eq("user_id", user.id);

  const allProjects = [
    ...(ownedProjects || []),
    ...((memberProjects || []).map((m: any) => m.projects).filter(Boolean)),
  ].filter((p, i, arr) => arr.findIndex((x: any) => x.id === p.id) === i);

  const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  return (
    <LayoutShell projects={allProjects} user={{ id: user.id, email: user.email!, full_name: profile?.full_name }} isSuperAdmin={isSuperAdmin}>
      <ProjectsHome projects={allProjects} userId={user.id} />
    </LayoutShell>
  );
}
