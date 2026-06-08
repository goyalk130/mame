import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusView } from "@/components/status/status-view";
import { getUser, getProject, getProjectMembers, getVirtualMembers } from "@/lib/data";

export default async function StatusPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(key);
  if (!project) redirect("/");

  const supabase = await createClient();
  const [members, virtualMembers, issuesRes, labelsRes] = await Promise.all([
    getProjectMembers(project.id, project.owner_id),
    getVirtualMembers(project.id),
    supabase
      .from("issues")
      .select("id, type, status, assignee_id, virtual_assignee_id, parent_id, title, key, story_points, start_date, due_date, created_at")
      .eq("project_id", project.id),
    supabase.from("labels").select("*").eq("project_id", project.id).order("created_at"),
  ]);

  // Merge labels into issues
  const issueIds = (issuesRes.data || []).map((i: any) => i.id);
  let issuesWithLabels = issuesRes.data || [];
  if (issueIds.length > 0) {
    const { data: ilRows } = await supabase
      .from("issue_labels")
      .select("issue_id, label:labels(id, name, color)")
      .in("issue_id", issueIds);
    const labelsByIssue: Record<string, any[]> = {};
    for (const row of (ilRows || []) as any[]) {
      if (!labelsByIssue[row.issue_id]) labelsByIssue[row.issue_id] = [];
      if (row.label) labelsByIssue[row.issue_id].push(row.label);
    }
    issuesWithLabels = issuesWithLabels.map((i: any) => ({ ...i, labels: labelsByIssue[i.id] || [] }));
  }

  return (
    <StatusView
      project={project}
      issues={issuesWithLabels}
      members={members}
      virtualMembers={virtualMembers}
      projectLabels={labelsRes.data || []}
    />
  );
}
