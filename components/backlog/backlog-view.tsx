"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, CheckCircle, ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Issue, Sprint, Project, IssueStatus } from "@/types";
import { STATUS_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { IssueDetailPanel } from "@/components/issues/issue-detail-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Props {
  project: Project;
  initialSprints: Sprint[];
  initialIssues: Issue[];
  members: any[];
  userId: string;
}

export function BacklogView({ project, initialSprints, initialIssues, members, userId }: Props) {
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [createIssueSprintId, setCreateIssueSprintId] = useState<string | "backlog" | null>(null);
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "", start_date: "", end_date: "" });
  const [savingSprint, setSavingSprint] = useState(false);

  const supabase = createClient();

  const backlogIssues = issues.filter((i) => !i.sprint_id);
  const sprintIssues = (sprintId: string) => issues.filter((i) => i.sprint_id === sprintId);
  const activeSprint = sprints.find((s) => s.status === "active");

  async function createSprint(e: React.FormEvent) {
    e.preventDefault();
    setSavingSprint(true);
    const { data, error } = await supabase
      .from("sprints")
      .insert({
        project_id: project.id,
        name: sprintForm.name || `Sprint ${sprints.length + 1}`,
        goal: sprintForm.goal || null,
        start_date: sprintForm.start_date || null,
        end_date: sprintForm.end_date || null,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); setSavingSprint(false); return; }
    setSprints((prev) => [...prev, data]);
    setCreateSprintOpen(false);
    setSprintForm({ name: "", goal: "", start_date: "", end_date: "" });
    setSavingSprint(false);
    toast.success("Sprint created");
  }

  async function startSprint(sprint: Sprint) {
    if (activeSprint && activeSprint.id !== sprint.id) {
      toast.error("Complete the active sprint first");
      return;
    }
    const { data, error } = await supabase
      .from("sprints")
      .update({ status: "active", start_date: sprint.start_date || new Date().toISOString().split("T")[0] })
      .eq("id", sprint.id)
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setSprints((prev) => prev.map((s) => s.id === sprint.id ? data : s));
    toast.success("Sprint started!");
    router.push(`/projects/${project.key}/board`);
  }

  async function completeSprint(sprint: Sprint) {
    if (!confirm("Complete this sprint? Unfinished issues will move to backlog.")) return;
    // Move unfinished issues to backlog
    const unfinished = issues.filter((i) => i.sprint_id === sprint.id && i.status !== "done");
    if (unfinished.length > 0) {
      await supabase.from("issues").update({ sprint_id: null }).in("id", unfinished.map((i) => i.id));
      setIssues((prev) => prev.map((i) => unfinished.find((u) => u.id === i.id) ? { ...i, sprint_id: null } : i));
    }
    const { data, error } = await supabase.from("sprints").update({ status: "completed" }).eq("id", sprint.id).select().single();
    if (error) { toast.error(error.message); return; }
    setSprints((prev) => prev.map((s) => s.id === sprint.id ? data : s));
    toast.success("Sprint completed!");
  }

  async function moveToSprint(issueId: string, targetSprintId: string | null) {
    await supabase.from("issues").update({ sprint_id: targetSprintId }).eq("id", issueId);
    setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, sprint_id: targetSprintId } : i));
  }

  function handleIssueCreated(issue: Issue) {
    setIssues((prev) => [...prev, issue]);
    setCreateIssueSprintId(null);
  }

  function handleIssueUpdated(updated: Issue) {
    setIssues((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    setSelectedIssue(updated);
  }

  function handleIssueDeleted(id: string) {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setSelectedIssue(null);
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Backlog</h1>
        <Button size="sm" onClick={() => setCreateSprintOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Create sprint
        </Button>
      </div>

      {/* Sprints */}
      {sprints.filter((s) => s.status !== "completed").map((sprint) => {
        const spIssues = sprintIssues(sprint.id);
        const isCollapsed = collapsed.has(sprint.id);
        const doneCount = spIssues.filter((i) => i.status === "done").length;

        return (
          <div key={sprint.id} className="mb-6 border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleCollapse(sprint.id)} className="text-gray-500">
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
                <span className="font-semibold text-gray-900">{sprint.name}</span>
                {sprint.status === "active" && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                )}
                <span className="text-xs text-gray-500">{spIssues.length} issues · {doneCount} done</span>
                {sprint.end_date && (
                  <span className="text-xs text-gray-400">· Due {format(new Date(sprint.end_date), "MMM d")}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreateIssueSprintId(sprint.id)}
                  className="h-7 text-xs gap-1"
                >
                  <Plus size={12} /> Add issue
                </Button>
                {sprint.status === "planned" && (
                  <Button size="sm" onClick={() => startSprint(sprint)} className="h-7 text-xs gap-1">
                    <Play size={12} /> Start sprint
                  </Button>
                )}
                {sprint.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => completeSprint(sprint)} className="h-7 text-xs gap-1">
                    <CheckCircle size={12} /> Complete
                  </Button>
                )}
              </div>
            </div>
            {!isCollapsed && (
              <div>
                {spIssues.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    No issues yet. Add issues from the backlog or create new ones.
                  </div>
                ) : (
                  <IssueList
                    issues={spIssues}
                    onSelect={setSelectedIssue}
                    onMoveToBacklog={(id) => moveToSprint(id, null)}
                    showMove
                    moveLabel="Move to backlog"
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Backlog */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button onClick={() => toggleCollapse("backlog")} className="text-gray-500">
              {collapsed.has("backlog") ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
            <span className="font-semibold text-gray-900">Backlog</span>
            <span className="text-xs text-gray-500">{backlogIssues.length} issues</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCreateIssueSprintId("backlog")}
            className="h-7 text-xs gap-1"
          >
            <Plus size={12} /> Add issue
          </Button>
        </div>
        {!collapsed.has("backlog") && (
          <div>
            {backlogIssues.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                Backlog is empty. Create issues to get started.
              </div>
            ) : (
              <IssueList
                issues={backlogIssues}
                onSelect={setSelectedIssue}
                sprints={sprints.filter((s) => s.status !== "completed")}
                onMoveToSprint={moveToSprint}
                showMove
              />
            )}
          </div>
        )}
      </div>

      {/* Create sprint dialog */}
      <Dialog open={createSprintOpen} onOpenChange={setCreateSprintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create sprint</DialogTitle></DialogHeader>
          <form onSubmit={createSprint} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprint name</label>
              <Input value={sprintForm.name} onChange={(e) => setSprintForm((p) => ({ ...p, name: e.target.value }))} placeholder={`Sprint ${sprints.length + 1}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
              <Input value={sprintForm.goal} onChange={(e) => setSprintForm((p) => ({ ...p, goal: e.target.value }))} placeholder="What does success look like?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <Input type="date" value={sprintForm.start_date} onChange={(e) => setSprintForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <Input type="date" value={sprintForm.end_date} onChange={(e) => setSprintForm((p) => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCreateSprintOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={savingSprint} className="flex-1">{savingSprint ? "Creating..." : "Create sprint"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create issue dialog */}
      {createIssueSprintId && (
        <CreateIssueDialog
          open={!!createIssueSprintId}
          onClose={() => setCreateIssueSprintId(null)}
          projectId={project.id}
          projectKey={project.key}
          defaultStatus="todo"
          sprintId={createIssueSprintId === "backlog" ? null : createIssueSprintId}
          members={members}
          userId={userId}
          onCreated={handleIssueCreated}
        />
      )}

      {/* Issue detail */}
      {selectedIssue && (
        <IssueDetailPanel
          issue={selectedIssue}
          project={project}
          members={members}
          userId={userId}
          onClose={() => setSelectedIssue(null)}
          onUpdated={handleIssueUpdated}
          onDeleted={handleIssueDeleted}
        />
      )}
    </div>
  );
}

function IssueList({
  issues,
  onSelect,
  onMoveToBacklog,
  onMoveToSprint,
  sprints,
  showMove,
  moveLabel,
}: {
  issues: Issue[];
  onSelect: (i: Issue) => void;
  onMoveToBacklog?: (id: string) => void;
  onMoveToSprint?: (id: string, sprintId: string) => void;
  sprints?: Sprint[];
  showMove?: boolean;
  moveLabel?: string;
}) {
  return (
    <div className="divide-y divide-gray-100">
      {issues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group cursor-pointer"
          onClick={() => onSelect(issue)}
        >
          <IssueTypeIcon type={issue.type} />
          <PriorityIcon priority={issue.priority} />
          <span className="text-xs font-mono text-gray-400 w-20 shrink-0">{issue.key}</span>
          <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{issue.title}</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full shrink-0",
            issue.status === "done" ? "bg-green-100 text-green-700" :
            issue.status === "in_progress" ? "bg-blue-100 text-blue-700" :
            issue.status === "in_review" ? "bg-yellow-100 text-yellow-700" :
            "bg-gray-100 text-gray-600"
          )}>
            {STATUS_LABELS[issue.status as IssueStatus]}
          </span>
          {issue.story_points != null && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">{issue.story_points}</span>
          )}
          {issue.assignee && (
            <Avatar className="w-5 h-5 shrink-0">
              <AvatarFallback className="text-[8px]">
                {(issue.assignee.full_name || issue.assignee.email).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
          {showMove && (onMoveToBacklog || onMoveToSprint) && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {onMoveToBacklog && (
                <button
                  onClick={() => onMoveToBacklog(issue.id)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100"
                >
                  → Backlog
                </button>
              )}
              {onMoveToSprint && sprints && sprints.length > 0 && sprints.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onMoveToSprint(issue.id, s.id)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100"
                >
                  → {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
