import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getUser, getProfile, getProject, getUserProjects } from "@/lib/data";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  // Run in parallel — was 5 sequential round-trips, now 3 parallel
  const [profile, project, allProjects] = await Promise.all([
    getProfile(user.id),
    getProject(key),
    getUserProjects(user.id),
  ]);

  if (!project) redirect("/");

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
