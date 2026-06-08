"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Search, ChevronDown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Issue, IssueStatus, Project, Sprint, VirtualMember } from "@/types";
import { STATUS_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IssueCard } from "./issue-card";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { IssueDetailPanel } from "@/components/issues/issue-detail-panel";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// Grouped columns — each group is one visual column with stacked sub-sections
const COLUMN_GROUPS: { sections: { id: IssueStatus; color: string }[] }[] = [
  {
    sections: [
      { id: "triage",   color: "bg-purple-400" },
      { id: "todo",     color: "bg-gray-400" },
    ],
  },
  {
    sections: [
      { id: "in_progress", color: "bg-blue-400" },
    ],
  },
  {
    sections: [
      { id: "in_review", color: "bg-yellow-400" },
      { id: "blocked",   color: "bg-red-400" },
    ],
  },
  {
    sections: [
      { id: "done",     color: "bg-green-400" },
      { id: "not_done", color: "bg-orange-400" },
    ],
  },
];

interface Props {
  project: Project;
  initialIssues: Issue[];
  members: any[];
  virtualMembers?: VirtualMember[];
  sprintId: string | null;
  sprintName?: string | null;
  sprints?: Sprint[];
  userId: string;
}

export function BoardView({ project, initialIssues, members, virtualMembers = [], sprintId, sprintName, sprints = [], userId }: Props) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<IssueStatus | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Build user map for the filter dropdown
  const userMap: Record<string, { name: string; color?: string }> = { unassigned: { name: "Unassigned" } };
  members.forEach((m: any) => {
    userMap[m.user_id] = { name: m.profile?.full_name || m.profile?.email || "Unknown" };
  });
  virtualMembers.forEach((vm) => {
    userMap[`v:${vm.id}`] = { name: vm.name, color: vm.color };
  });

  // URL-based navigation
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
    // Open issue from URL on mount
    const key = new URLSearchParams(window.location.search).get("issue");
    if (key) {
      const found = initialIssues.find((i) => i.key === key);
      if (found) setSelectedIssue(found);
    }
    // Handle browser back/forward
    function onPopState() {
      const k = new URLSearchParams(window.location.search).get("issue");
      if (k) {
        const found = issues.find((i) => i.key === k);
        if (found) setSelectedIssue(found);
      } else {
        setSelectedIssue(null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Auto-scroll refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number>();

  const filtered = issues.filter((i) => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.key.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedUser !== "all") {
      const assigneeKey = i.assignee_id ? i.assignee_id
        : (i as any).virtual_assignee_id ? `v:${(i as any).virtual_assignee_id}`
        : "unassigned";
      if (assigneeKey !== selectedUser) return false;
    }
    return true;
  });

  // Auto-scroll while dragging near left/right edges
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current || !scrollRef.current) return;
      const container = scrollRef.current;
      const rect = container.getBoundingClientRect();
      const threshold = 100;
      const maxSpeed = 18;

      cancelAnimationFrame(rafRef.current!);

      const scroll = () => {
        if (!draggingRef.current || !scrollRef.current) return;
        const distLeft = e.clientX - rect.left;
        const distRight = rect.right - e.clientX;

        if (distLeft < threshold) {
          const speed = Math.round(maxSpeed * (1 - distLeft / threshold));
          scrollRef.current.scrollLeft -= speed;
        } else if (distRight < threshold) {
          const speed = Math.round(maxSpeed * (1 - distRight / threshold));
          scrollRef.current.scrollLeft += speed;
        }
        rafRef.current = requestAnimationFrame(scroll);
      };

      rafRef.current = requestAnimationFrame(scroll);
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current!);
    };
  }, []);

  async function onDragEnd(result: DropResult) {
    draggingRef.current = false;
    cancelAnimationFrame(rafRef.current!);

    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId as IssueStatus;
    const issue = issues.find((i) => i.id === draggableId);
    if (!issue) return;

    setIssues((prev) =>
      prev.map((i) => i.id === draggableId ? { ...i, status: newStatus, sort_order: destination.index } : i)
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("issues")
      .update({ status: newStatus, sort_order: destination.index, updated_at: new Date().toISOString() })
      .eq("id", draggableId);

    if (error) {
      toast.error("Failed to update issue");
      setIssues((prev) => prev.map((i) => i.id === draggableId ? issue : i));
      return;
    }

    if (issue.status !== newStatus) {
      await supabase.from("activity").insert({
        issue_id: draggableId,
        actor_id: userId,
        action: "updated",
        field: "status",
        old_value: STATUS_LABELS[issue.status],
        new_value: STATUS_LABELS[newStatus],
      });
    }
  }

  function handleIssueCreated(issue: Issue) {
    setIssues((prev) => [...prev, issue]);
    setCreateColumn(null);
  }

  function handleIssueUpdated(updated: Issue) {
    // If sprint changed away from current sprint, remove from board
    if (project.type === "scrum" && sprintId && updated.sprint_id !== sprintId) {
      setIssues((prev) => prev.filter((i) => i.id !== updated.id));
      setSelectedIssue(null);
      closeIssue();
    } else {
      setIssues((prev) => prev.map((i) => i.id === updated.id ? updated : i));
      setSelectedIssue(updated);
    }
  }

  function handleIssueDeleted(id: string) {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setSelectedIssue(null);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">
                {project.type === "scrum" ? "Board" : "Kanban Board"}
              </h1>
              {project.type === "scrum" && sprintName && (
                <span className="text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  {sprintName}
                </span>
              )}
            </div>
            {project.type === "scrum" && !sprintId && (
              <p className="text-sm text-orange-500 mt-0.5">No active sprint. Start a sprint from the Backlog.</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Person filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors h-8",
                  selectedUser !== "all" ? "border-blue-400 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-600"
                )}
              >
                <Users size={13} />
                <span className="font-medium max-w-[110px] truncate">
                  {selectedUser === "all" ? "All people" : (userMap[selectedUser]?.name || selectedUser)}
                </span>
                <ChevronDown size={12} className="text-gray-400 shrink-0" />
              </button>

              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-48 overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {["all", ...Object.keys(userMap)].map((k) => {
                        const info = k === "all" ? { name: "All people" } : (userMap[k] || { name: k });
                        const isSelected = selectedUser === k;
                        // count issues for this person
                        const count = k === "all" ? issues.length : issues.filter((i) => {
                          const ak = i.assignee_id ? i.assignee_id
                            : (i as any).virtual_assignee_id ? `v:${(i as any).virtual_assignee_id}`
                            : "unassigned";
                          return ak === k;
                        }).length;
                        if (k !== "all" && count === 0) return null;
                        return (
                          <button
                            key={k}
                            onClick={() => { setSelectedUser(k); setFilterOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors",
                              isSelected && "bg-blue-50 text-blue-700"
                            )}
                          >
                            {(info as any).color ? (
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: (info as any).color }} />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                            )}
                            <span className="flex-1 truncate font-medium">{info.name}</span>
                            <span className="text-xs text-gray-400 shrink-0">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issues..."
                className="pl-8 w-56 h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => setCreateColumn("todo")} className="gap-1.5">
              <Plus size={14} />
              Create issue
            </Button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden p-4 min-h-0">
        <DragDropContext
          onDragStart={() => { draggingRef.current = true; }}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-3 h-full min-h-0" style={{ minWidth: "max-content" }}>
            {COLUMN_GROUPS.map((group, gi) => (
              <div key={gi} className="w-72 flex flex-col gap-2 min-h-0 max-h-full">
                {group.sections.map((sec, si) => {
                  const sectionIssues = filtered.filter((i) => i.status === sec.id);
                  return (
                    <div
                      key={sec.id}
                      className="flex flex-col rounded-lg bg-gray-100 overflow-hidden min-h-0 flex-1"
                    >
                      {/* Section header */}
                      <div className="px-3 py-2 flex items-center justify-between shrink-0 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", sec.color)} />
                          <span className="text-sm font-medium text-gray-700">{STATUS_LABELS[sec.id]}</span>
                          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                            {sectionIssues.length}
                          </span>
                        </div>
                        <button
                          onClick={() => setCreateColumn(sec.id)}
                          className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Droppable cards area */}
                      <Droppable droppableId={sec.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "flex-1 overflow-y-auto px-2 py-1.5 space-y-2 min-h-[40px]",
                              snapshot.isDraggingOver && "bg-blue-50"
                            )}
                          >
                            {sectionIssues.map((issue, idx) => (
                              <Draggable key={issue.id} draggableId={issue.id} index={idx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(snapshot.isDragging && "opacity-80 rotate-1")}
                                  >
                                    <IssueCard
                                      issue={issue}
                                      onClick={() => openIssue(issue)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {createColumn && (
        <CreateIssueDialog
          open={!!createColumn}
          onClose={() => setCreateColumn(null)}
          projectId={project.id}
          projectKey={project.key}
          defaultStatus={createColumn}
          sprintId={sprintId}
          members={members}
          virtualMembers={virtualMembers}
          userId={userId}
          onCreated={handleIssueCreated}
        />
      )}

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
