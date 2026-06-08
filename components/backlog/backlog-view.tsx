"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, CheckCircle, ChevronDown, ChevronRight, GripVertical, Pencil, Trash2, Tag, Users } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { getTimeStatus, getTimeInfo, TIME_STATUS_BG } from "@/lib/time-status";
import { createClient } from "@/lib/supabase/client";
import type { Issue, Sprint, Project, IssueStatus, VirtualMember, Label } from "@/types";
import { STATUS_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { IssueDetailPanel } from "@/components/issues/issue-detail-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, statusBadgeClass, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Props {
  project: Project;
  initialSprints: Sprint[];
  initialIssues: Issue[];
  initialLabels?: Label[];
  members: any[];
  virtualMembers?: VirtualMember[];
  userId: string;
}

export function BacklogView({ project, initialSprints, initialIssues, initialLabels = [], members, virtualMembers = [], userId }: Props) {
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelFilterOpen, setLabelFilterOpen] = useState(false);
  const [projectLabels, setProjectLabels] = useState<Label[]>(initialLabels);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [userFilterOpen, setUserFilterOpen] = useState(false);

  function openIssue(issue: Issue) {
    setSelectedIssue(issue);
    const url = new URL(window.location.href);
    url.searchParams.set("issue", issue.key);
    window.history.pushState({ issueKey: issue.key }, "", url.toString());
  }

  function closeIssue() {
    setSelectedIssue(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("issue");
    window.history.pushState({}, "", url.toString());
  }

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("issue");
    if (key) {
      const found = initialIssues.find((i) => i.key === key);
      if (found) setSelectedIssue(found);
    }
    function onPopState() {
      const k = new URLSearchParams(window.location.search).get("issue");
      setSelectedIssue(k ? (issues.find((i) => i.key === k) ?? null) : null);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [createIssueSprintId, setCreateIssueSprintId] = useState<string | "backlog" | null>(null);
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "", start_date: "", end_date: "" });
  const [savingSprint, setSavingSprint] = useState(false);
  const [editSprintOpen, setEditSprintOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editForm, setEditForm] = useState({ name: "", goal: "", start_date: "", end_date: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteSprintId, setDeleteSprintId] = useState<string | null>(null);
  const [deletingSprint, setDeletingSprint] = useState(false);

  const supabase = createClient();

  function issueMatch(i: Issue) {
    if (selectedLabels.length > 0) {
      const ids = (i.labels || []).map((l: Label) => l.id);
      if (!selectedLabels.every((id) => ids.includes(id))) return false;
    }
    if (selectedTypes.length > 0 && !selectedTypes.includes(i.type)) return false;
    if (selectedUser !== "all") {
      const ak = i.assignee_id ? i.assignee_id
        : i.virtual_assignee_id ? `v:${i.virtual_assignee_id}`
        : "unassigned";
      if (ak !== selectedUser) return false;
    }
    return true;
  }

  const backlogIssues = issues.filter((i) => !i.sprint_id && issueMatch(i));
  const sprintIssues = (sprintId: string) => issues.filter((i) => i.sprint_id === sprintId && issueMatch(i));
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

    const issue = issues.find((i) => i.id === draggableId);
    const { error } = await supabase
      .from("issues")
      .update({ sprint_id: targetSprintId })
      .eq("id", draggableId);

    if (error) {
      toast.error("Failed to move issue");
      const originalSprintId = source.droppableId === "backlog" ? null : source.droppableId;
      setIssues((prev) =>
        prev.map((i) => (i.id === draggableId ? { ...i, sprint_id: originalSprintId } : i))
      );
      return;
    }

    // Log activity
    if (issue && issue.sprint_id !== targetSprintId) {
      const oldSprint = sprints.find((s) => s.id === issue.sprint_id);
      const newSprint = sprints.find((s) => s.id === targetSprintId);
      await supabase.from("activity").insert({
        issue_id: draggableId,
        actor_id: userId,
        action: "updated",
        field: "sprint",
        old_value: oldSprint ? oldSprint.name : "Backlog",
        new_value: newSprint ? newSprint.name : "Backlog",
      });
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

  function openEditSprint(sprint: Sprint) {
    setEditingSprint(sprint);
    setEditForm({
      name: sprint.name,
      goal: sprint.goal || "",
      start_date: sprint.start_date || "",
      end_date: sprint.end_date || "",
    });
    setEditSprintOpen(true);
  }

  async function saveEditSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSprint) return;
    if (!editForm.name.trim()) { toast.error("Sprint name is required"); return; }
    setSavingEdit(true);
    const { data, error } = await supabase
      .from("sprints")
      .update({
        name: editForm.name.trim(),
        goal: editForm.goal.trim() || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingSprint.id)
      .select()
      .single();
    setSavingEdit(false);
    if (error) { toast.error("Failed to save sprint"); return; }
    setSprints((prev) => prev.map((s) => s.id === editingSprint.id ? { ...s, ...data } : s));
    setEditSprintOpen(false);
    setEditingSprint(null);
    toast.success("Sprint updated");
  }

  async function deleteSprint() {
    if (!deleteSprintId) return;
    setDeletingSprint(true);

    // Find the next sprint to move issues to (next planned/active sprint after this one)
    const currentIndex = sprints.findIndex((s) => s.id === deleteSprintId);
    const nextSprint = sprints.find((s, i) => i > currentIndex && s.status !== "completed") ?? null;
    const targetSprintId = nextSprint?.id ?? null; // null = backlog

    // Move all issues from deleted sprint to next sprint or backlog
    const { error: moveError } = await supabase
      .from("issues")
      .update({ sprint_id: targetSprintId })
      .eq("sprint_id", deleteSprintId);

    if (moveError) { toast.error("Failed to move issues"); setDeletingSprint(false); return; }

    // Delete the sprint
    const { error } = await supabase.from("sprints").delete().eq("id", deleteSprintId);
    if (error) { toast.error("Failed to delete sprint"); setDeletingSprint(false); return; }

    // Update local state
    setIssues((prev) => prev.map((i) => i.sprint_id === deleteSprintId ? { ...i, sprint_id: targetSprintId } : i));
    setSprints((prev) => prev.filter((s) => s.id !== deleteSprintId));
    setDeleteSprintId(null);
    setDeletingSprint(false);
    toast.success(nextSprint
      ? `Sprint deleted — issues moved to ${nextSprint.name}`
      : "Sprint deleted — issues moved to backlog"
    );
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
        <div className="flex items-center gap-2">

          {/* Type filter */}
          {(() => {
            const TYPES = [
              { value: "epic",    label: "Epic",    color: "bg-purple-500" },
              { value: "story",   label: "Story",   color: "bg-green-500"  },
              { value: "task",    label: "Task",    color: "bg-blue-500"   },
              { value: "bug",     label: "Bug",     color: "bg-red-500"    },
              { value: "subtask", label: "Subtask", color: "bg-gray-400"   },
            ];
            return (
              <div className="relative">
                <button
                  onClick={() => setTypeFilterOpen((v) => !v)}
                  className={cn("flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors h-8",
                    selectedTypes.length > 0 ? "border-blue-400 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-600")}
                >
                  <span className="font-medium">{selectedTypes.length > 0 ? selectedTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ") : "Type"}</span>
                  <ChevronDown size={12} className="text-gray-400 shrink-0" />
                </button>
                {typeFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTypeFilterOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-40 overflow-hidden py-1">
                      {selectedTypes.length > 0 && (
                        <button onClick={() => setSelectedTypes([])} className="w-full text-xs text-left px-3 py-1.5 text-blue-500 hover:bg-gray-50 font-medium">Clear filter</button>
                      )}
                      {TYPES.map((t) => {
                        const active = selectedTypes.includes(t.value);
                        return (
                          <button key={t.value}
                            onClick={() => setSelectedTypes((prev) => active ? prev.filter((x) => x !== t.value) : [...prev, t.value])}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className={cn("w-2 h-2 rounded-full shrink-0", t.color)} />
                            <span className="flex-1 font-medium text-gray-800">{t.label}</span>
                            {active && <span className="text-blue-500">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Assignee filter */}
          {(() => {
            const userMap: Record<string, { name: string; color?: string }> = { unassigned: { name: "Unassigned" } };
            members.forEach((m: any) => { userMap[m.user_id] = { name: m.profile?.full_name || m.profile?.email || "Unknown" }; });
            virtualMembers.forEach((vm) => { userMap[`v:${vm.id}`] = { name: vm.name, color: vm.color }; });
            return (
              <div className="relative">
                <button
                  onClick={() => setUserFilterOpen((v) => !v)}
                  className={cn("flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors h-8",
                    selectedUser !== "all" ? "border-blue-400 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-600")}
                >
                  <Users size={13} />
                  <span className="font-medium max-w-[100px] truncate">{selectedUser === "all" ? "Assignee" : (userMap[selectedUser]?.name || selectedUser)}</span>
                  <ChevronDown size={12} className="text-gray-400 shrink-0" />
                </button>
                {userFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserFilterOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-48 overflow-hidden">
                      <div className="max-h-64 overflow-y-auto py-1">
                        {["all", ...Object.keys(userMap)].map((k) => {
                          const info = k === "all" ? { name: "All people" } : (userMap[k] || { name: k });
                          const isSelected = selectedUser === k;
                          return (
                            <button key={k}
                              onClick={() => { setSelectedUser(k); setUserFilterOpen(false); }}
                              className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors", isSelected && "bg-blue-50 text-blue-700")}
                            >
                              {(info as any).color
                                ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: (info as any).color }} />
                                : <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
                              <span className="flex-1 truncate font-medium text-xs">{info.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Label filter */}
          <div className="relative">
            <button
              onClick={async () => {
                if (!labelFilterOpen && projectLabels.length === 0) {
                  const supabase = createClient();
                  const { data } = await supabase.from("labels").select("*").eq("project_id", project.id).order("created_at");
                  setProjectLabels(data || []);
                }
                setLabelFilterOpen((v) => !v);
              }}
              className={cn(
                "flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors h-8",
                selectedLabels.length > 0 ? "border-blue-400 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-600"
              )}
            >
              <Tag size={13} />
              <span className="font-medium">{selectedLabels.length > 0 ? `${selectedLabels.length} label${selectedLabels.length > 1 ? "s" : ""}` : "Labels"}</span>
              <ChevronDown size={12} className="text-gray-400 shrink-0" />
            </button>
            {labelFilterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLabelFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-48 overflow-hidden">
                  {projectLabels.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">No labels. Create in Settings.</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto py-1">
                      {selectedLabels.length > 0 && (
                        <button onClick={() => setSelectedLabels([])} className="w-full text-xs text-left px-3 py-1.5 text-blue-500 hover:bg-gray-50 font-medium">Clear filter</button>
                      )}
                      {projectLabels.map((label) => {
                        const active = selectedLabels.includes(label.id);
                        return (
                          <button
                            key={label.id}
                            onClick={() => setSelectedLabels((prev) => active ? prev.filter((id) => id !== label.id) : [...prev, label.id])}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: label.color }} />
                            <span className="flex-1 truncate font-medium text-gray-800">{label.name}</span>
                            {active && <span className="text-blue-500">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <Button size="sm" onClick={() => setCreateSprintOpen(true)} className="gap-1.5">
            <Plus size={14} />
            Create sprint
          </Button>
        </div>
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
                  <button
                    onClick={() => openEditSprint(sprint)}
                    className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Edit sprint"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteSprintId(sprint.id)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete sprint"
                  >
                    <Trash2 size={13} />
                  </button>
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
                            onSelect={openIssue}
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
                        onSelect={openIssue}
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

      {/* Edit sprint dialog */}
      <Dialog open={editSprintOpen} onOpenChange={setEditSprintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit sprint</DialogTitle></DialogHeader>
          <form onSubmit={saveEditSprint} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprint name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Sprint name" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
              <Input value={editForm.goal} onChange={(e) => setEditForm((p) => ({ ...p, goal: e.target.value }))} placeholder="What does success look like?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <Input type="date" value={editForm.start_date} onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <Input type="date" value={editForm.end_date} onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditSprintOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={savingEdit} className="flex-1">{savingEdit ? "Saving..." : "Save changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete sprint confirm dialog */}
      <Dialog open={!!deleteSprintId} onOpenChange={(o) => !o && setDeleteSprintId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete sprint</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <p className="text-sm text-gray-600">
              All issues in this sprint will be moved to{" "}
              <span className="font-medium text-gray-900">
                {(() => {
                  const idx = sprints.findIndex((s) => s.id === deleteSprintId);
                  const next = sprints.find((s, i) => i > idx && s.status !== "completed");
                  return next ? next.name : "the backlog";
                })()}
              </span>.
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setDeleteSprintId(null)} disabled={deletingSprint}>
                Cancel
              </Button>
              <Button size="sm" onClick={deleteSprint} disabled={deletingSprint}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingSprint ? "Deleting…" : "Delete sprint"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          sprints={sprints}
          userId={userId}
          onClose={closeIssue}
          onUpdated={handleIssueUpdated}
          onDeleted={handleIssueDeleted}
          onDuplicated={(issue) => { handleIssueCreated(issue); }}
          onNavigate={openIssue}
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

          {/* Label pills */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {issue.labels.map((label: Label) => (
                <span key={label.id} className="text-[9px] font-semibold text-white px-1.5 py-0.5 rounded-full" style={{ background: label.color }}>
                  {label.name}
                </span>
              ))}
            </div>
          )}

          <span className={cn("text-xs px-2 py-0.5 rounded-full shrink-0", statusBadgeClass(issue.status))}>
            {STATUS_LABELS[issue.status as IssueStatus]}
          </span>

          {(() => {
            const timeInfo = getTimeInfo(issue);
            const timeStatus = getTimeStatus(issue);
            if (timeInfo) return (
              <span className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5",
                timeStatus === "overdue"      ? "bg-red-100 text-red-600" :
                timeStatus === "warning"      ? "bg-yellow-100 text-yellow-700" :
                timeStatus === "late_done"    ? "bg-red-50 text-red-400" :
                timeStatus === "on_time_done" ? "bg-green-50 text-green-600" :
                "bg-gray-100 text-gray-500"
              )}>
                {timeStatus === "late_done"    ? <>✓ {timeInfo.daysLate}d late</> :
                 timeStatus === "on_time_done" ? <>✓ on time</> :
                 timeStatus === "overdue"      ? <>{timeInfo.pts}pt +{timeInfo.daysOverdue}d</> :
                 timeStatus === "warning"      ? <>{timeInfo.pts}pt · {timeInfo.daysLeft}d left</> :
                 <>{timeInfo.pts}pt</>}
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
                {getInitials(issue.assignee.full_name || issue.assignee.email)}
              </AvatarFallback>
            </Avatar>
          )}
          {!issue.assignee && issue.virtual_assignee && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
              style={{ background: issue.virtual_assignee.color }}
              title={issue.virtual_assignee.name}
            >
              {getInitials(issue.virtual_assignee.name)}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
