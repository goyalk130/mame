"use client";
import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Filter, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Issue, IssueStatus, Project, BoardColumn, IssuePriority, IssueType, VirtualMember } from "@/types";
import { STATUS_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IssueCard } from "./issue-card";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { IssueDetailPanel } from "@/components/issues/issue-detail-panel";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const COLUMNS: { id: IssueStatus; color: string }[] = [
  { id: "todo", color: "bg-gray-400" },
  { id: "in_progress", color: "bg-blue-400" },
  { id: "in_review", color: "bg-yellow-400" },
  { id: "done", color: "bg-green-400" },
];

interface Props {
  project: Project;
  initialIssues: Issue[];
  members: any[];
  virtualMembers?: VirtualMember[];
  sprintId: string | null;
  userId: string;
}

export function BoardView({ project, initialIssues, members, virtualMembers = [], sprintId, userId }: Props) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [createColumn, setCreateColumn] = useState<IssueStatus | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const filtered = issues.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.key.toLowerCase().includes(search.toLowerCase())
  );

  const columns: BoardColumn[] = COLUMNS.map((col) => ({
    id: col.id,
    title: STATUS_LABELS[col.id],
    issues: filtered.filter((i) => i.status === col.id),
  }));

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId as IssueStatus;
    const issue = issues.find((i) => i.id === draggableId);
    if (!issue) return;

    // Optimistic update
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
    }
  }

  function handleIssueCreated(issue: Issue) {
    setIssues((prev) => [...prev, issue]);
    setCreateColumn(null);
  }

  function handleIssueUpdated(updated: Issue) {
    setIssues((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    setSelectedIssue(updated);
  }

  function handleIssueDeleted(id: string) {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setSelectedIssue(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {project.type === "scrum" ? "Sprint Board" : "Kanban Board"}
            </h1>
            {project.type === "scrum" && !sprintId && (
              <p className="text-sm text-orange-500 mt-0.5">No active sprint. Start a sprint from the Backlog.</p>
            )}
          </div>
          <div className="flex items-center gap-3">
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
      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 h-full min-h-0" style={{ minWidth: "max-content" }}>
            {columns.map((col) => {
              const colConfig = COLUMNS.find((c) => c.id === col.id)!;
              return (
                <div key={col.id} className="w-72 flex flex-col rounded-lg bg-gray-100 overflow-hidden">
                  {/* Column header */}
                  <div className="px-3 py-2.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", colConfig.color)} />
                      <span className="text-sm font-medium text-gray-700">{col.title}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                        {col.issues.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setCreateColumn(col.id)}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[40px]",
                          snapshot.isDraggingOver && "bg-blue-50"
                        )}
                      >
                        {col.issues.map((issue, idx) => (
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
                                  onClick={() => setSelectedIssue(issue)}
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
        </DragDropContext>
      </div>

      {/* Create issue dialog */}
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

      {/* Issue detail panel */}
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
