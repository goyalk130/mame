import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LayoutShell } from "@/components/layout/layout-shell";
import { runSchema } from "@/lib/db";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "karranngoyal@gmail.com";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await runSchema();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) redirect("/projects");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: ownedProjects } = await supabase
    .from("projects").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  const { data: memberProjects } = await supabase
    .from("project_members").select("projects(*)").eq("user_id", user.id);

  const allProjects = [
    ...(ownedProjects || []),
    ...((memberProjects || []).map((m: any) => m.projects).filter(Boolean)),
  ].filter((p, i, arr) => arr.findIndex((x: any) => x.id === p.id) === i);

  return (
    <LayoutShell
      projects={allProjects}
      user={{ id: user.id, email: user.email!, full_name: profile?.full_name }}
      isSuperAdmin
    >
      {children}
    </LayoutShell>
  );
}
