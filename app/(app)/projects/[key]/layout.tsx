import { redirect } from "next/navigation";
import { LayoutShell } from "@/components/layout/layout-shell";
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
    <LayoutShell
      projects={allProjects}
      currentProject={project}
      user={{ id: user.id, email: user.email!, full_name: profile?.full_name }}
    >
      {children}
    </LayoutShell>
  );
}
