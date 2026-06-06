"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, CheckCircle, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { getTimeStatus, getTimeInfo, TIME_STATUS_BG } from "@/lib/time-status";
import { createClient } from "@/lib/supabase/client";
import type { Issue, Sprint, Project, IssueStatus, VirtualMember } from "@/types";
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
  virtualMembers?: VirtualMember[];
  userId: string;
}

export function BacklogView({ project, initialSprints, initialIssues, members, virtualMembers = [], userId }: Props) {
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
  const visibleSprints = sprints.filter((s) => s.status !== "completed");

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const targetSprintId = destination.droppableId === "backlog" ? null : destination.droppableId;

    // Optimistic update
    setIssues((prev) =>
      prev.map((i) => (i.id === draggableId ? { ...i, sprint_id: targetSprintId } : i))
    );

    const { error } = await supabase
      .from("issues")
      .update({ sprint_id: targetSprintId })
      .eq("id", draggableId);

    if (error) {
      toast.error("Failed to move issue");
      // Revert
      const originalSprintId = source.droppableId === "backlog" ? null : source.droppableId;
      setIssues((prev) =>
        prev.map((i) => (i.id === draggableId ? { ...i, sprint_id: originalSprintId } : i))
      );
    }
  }

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

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Sprints */}
        {visibleSprints.map((sprint) => {
          const spIssues = sprintIssues(sprint.id);
          const isCollapsed = collapsed.has(sprint.id);
          const doneCount = spIssues.filter((i) => i.status === "done").length;

          return (
            <div key={sprint.id} className="mb-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleCollapse(sprint.id)} className="text-gray-500 hover:text-gray-700">
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
                  <Button size="sm" variant="ghost" onClick={() => setCreateIssueSprintId(sprint.id)} className="h-7 text-xs gap-1">
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

              <Droppable droppableId={sprint.id} isDropDisabled={isCollapsed}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[44px] transition-colors",
                      snapshot.isDraggingOver && "bg-blue-50",
                      isCollapsed && "hidden"
                    )}
                  >
                    {spIssues.length === 0 && !snapshot.isDraggingOver ? (
                      <div className="py-6 text-center text-sm text-gray-400">
                        No issues yet — drag from backlog or click Add issue
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {spIssues.map((issue, idx) => (
                          <IssueRow
                            key={issue.id}
                            issue={issue}
                            index={idx}
                            onSelect={setSelectedIssue}
                          />
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        {/* Backlog */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <button onClick={() => toggleCollapse("backlog")} className="text-gray-500 hover:text-gray-700">
                {collapsed.has("backlog") ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
              <span className="font-semibold text-gray-900">Backlog</span>
              <span className="text-xs text-gray-500">{backlogIssues.length} issues</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCreateIssueSprintId("backlog")} className="h-7 text-xs gap-1">
              <Plus size={12} /> Add issue
            </Button>
          </div>

          <Droppable droppableId="backlog" isDropDisabled={collapsed.has("backlog")}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "min-h-[44px] transition-colors",
                  snapshot.isDraggingOver && "bg-blue-50",
                  collapsed.has("backlog") && "hidden"
                )}
              >
                {backlogIssues.length === 0 && !snapshot.isDraggingOver ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    Backlog is empty — create issues to get started
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {backlogIssues.map((issue, idx) => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        index={idx}
                        onSelect={setSelectedIssue}
                      />
                    ))}
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

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
          virtualMembers={virtualMembers}
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
          virtualMembers={virtualMembers}
          userId={userId}
          onClose={() => setSelectedIssue(null)}
          onUpdated={handleIssueUpdated}
          onDeleted={handleIssueDeleted}
        />
      )}
    </div>
  );
}

function IssueRow({ issue, index, onSelect }: { issue: Issue; index: number; onSelect: (i: Issue) => void }) {
  return (
    <Draggable draggableId={issue.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 group cursor-pointer transition-colors border-b border-gray-100 last:border-0",
            !snapshot.isDragging && TIME_STATUS_BG[getTimeStatus(issue)],
            snapshot.isDragging && "bg-blue-50 shadow-md rounded border border-blue-200 opacity-90"
          )}
          onClick={() => onSelect(issue)}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </div>

          <IssueTypeIcon type={issue.type} />
          <PriorityIcon priority={issue.priority} />
          <span className="text-xs font-mono text-gray-400 w-20 shrink-0">{issue.key}</span>
          <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{issue.title}</span>

          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full shrink-0",
            issue.status === "completed" ? "bg-emerald-100 text-emerald-700" :
            issue.status === "done" ? "bg-green-100 text-green-700" :
            issue.status === "in_progress" ? "bg-blue-100 text-blue-700" :
            issue.status === "in_review" ? "bg-yellow-100 text-yellow-700" :
            issue.status === "triage" ? "bg-purple-100 text-purple-700" :
            "bg-gray-100 text-gray-600"
          )}>
            {STATUS_LABELS[issue.status as IssueStatus]}
          </span>

          {(() => {
            const timeInfo = getTimeInfo(issue);
            const timeStatus = getTimeStatus(issue);
            if (timeInfo) return (
              <span className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5",
                timeStatus === "overdue" ? "bg-red-100 text-red-600" :
                timeStatus === "warning" ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-gray-500"
              )}>
                {timeInfo.pts}pt
                {timeStatus === "overdue" && <span className="font-bold"> +{timeInfo.overflow}d</span>}
                {timeStatus === "warning" && <span> {timeInfo.remaining}d</span>}
              </span>
            );
            if (issue.story_points != null) return (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">{issue.story_points}pt</span>
            );
            return null;
          })()}

          {issue.assignee && (
            <Avatar className="w-5 h-5 shrink-0">
              <AvatarFallback className="text-[8px]">
                {(issue.assignee.full_name || issue.assignee.email).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
          {!issue.assignee && issue.virtual_assignee && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
              style={{ background: issue.virtual_assignee.color }}
              title={issue.virtual_assignee.name}
            >
              {issue.virtual_assignee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
