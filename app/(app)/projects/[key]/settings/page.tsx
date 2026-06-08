import { redirect } from "next/navigation";
import { ProjectSettings } from "@/components/projects/project-settings";
import { getUser, getProject, getProjectMembers } from "@/lib/data";

export default async function SettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const [project, members] = await Promise.all([
    getProject(key),
    getProject(key).then((p) => p ? getProjectMembers(p.id, p.owner_id) : []),
  ]);

  if (!project) redirect("/");

  return <ProjectSettings project={project} members={members} userId={user.id} />;
}
