import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const { data: project } = await supabase.from("projects").select("*").eq("key", key).single();
  if (!project) notFound();

  const { data: ownedProjects } = await supabase.from("projects").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  const { data: memberProjects } = await supabase.from("project_members").select("projects(*)").eq("user_id", user.id);

  const allProjects = [
    ...(ownedProjects || []),
    ...((memberProjects || []).map((m: any) => m.projects).filter(Boolean)),
  ].filter((p, i, arr) => arr.findIndex((x: any) => x.id === p.id) === i);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        projects={allProjects}
        currentProject={project}
        user={{ id: user.id, email: user.email!, full_name: profile?.full_name }}
      />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
