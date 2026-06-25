import { redirect } from "next/navigation";
import { LayoutShell } from "@/components/layout/layout-shell";
import { getUser, getProfile, getProject, getUserProjects } from "@/lib/data";
import { runSchema } from "@/lib/db";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "goyalkaran130@gmail.com";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  // Apply any pending DB migrations on first request after cold start.
  // runSchema() is hash-guarded — no-op (instant) if schema is already up to date.
  // We await it so the table always exists before any DB queries on this page.
  await runSchema();

  const user = await getUser();
  if (!user) redirect("/login");

  // Run in parallel — was 5 sequential round-trips, now 3 parallel
  const [profile, project, allProjects] = await Promise.all([
    getProfile(user.id),
    getProject(key),
    getUserProjects(user.id),
  ]);

  if (!project) redirect("/");

  const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  return (
    <LayoutShell
      projects={allProjects}
      currentProject={project}
      user={{ id: user.id, email: user.email!, full_name: profile?.full_name }}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </LayoutShell>
  );
}
