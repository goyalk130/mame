"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Issue, IssueStatus, IssueType, IssuePriority, VirtualMember } from "@/types";
import { TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/types";
import { Check, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectKey: string;
  defaultStatus: IssueStatus;
  sprintId: string | null;
  members: any[];
  virtualMembers?: VirtualMember[];
  userId: string;
  onCreated: (issue: Issue) => void;
  parentId?: string;
  sprints?: import("@/types").Sprint[];
}

export function CreateIssueDialog({
  open, onClose, projectId, projectKey, defaultStatus, sprintId, members, virtualMembers = [], userId, onCreated, parentId, sprints = []
}: Props) {
  const activeSprint = sprints.find((s) => s.status === "active");
  const visibleSprints = sprints.filter((s) => s.status !== "completed");
  // Default: use passed sprintId, or fall back to active sprint
  const defaultSprintId = sprintId ?? activeSprint?.id ?? null;
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(defaultSprintId);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<IssueType>("task");
  const [status, setStatus] = useState<IssueStatus>(defaultStatus);
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]); // "real:uuid" | "virtual:uuid"
  const [storyPoints, setStoryPoints] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>(parentId || "none");
  const [selectedParent, setSelectedParent] = useState<Issue | null>(null);
  const [parentSearch, setParentSearch] = useState("");
  const [parentOptions, setParentOptions] = useState<Issue[]>([]);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentLoading, setParentLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Valid parent types for the current issue type
  function getParentTypes(): IssueType[] {
    if (type === "story") return ["epic"];
    if (type === "task" || type === "bug") return ["story", "epic"];
    if (type === "subtask") return ["task"];
    return [];
  }

  // Search parent issues — runs on open + on every keystroke
  useEffect(() => {
    if (parentId) return;
    const types = getParentTypes();
    if (!types.length) { setParentOptions([]); return; }
    const supabase = createClient();
    setParentLoading(true);
    let q = supabase
      .from("issues")
      .select("id, key, title, type")
      .eq("project_id", projectId)
      .in("type", types)
      .order("type")
      .order("created_at", { ascending: false });
    if (parentSearch.trim()) {
      q = q.or(`title.ilike.%${parentSearch.trim()}%,key.ilike.%${parentSearch.trim()}%`);
    }
    q.limit(40).then(({ data }) => {
      setParentOptions((data as Issue[]) || []);
      setParentLoading(false);
    });
  }, [type, projectId, parentId, parentSearch]);

  // Reset parent when type changes (previously selected parent may no longer be valid)
  useEffect(() => {
    if (!parentId) {
      setSelectedParentId("none");
      setSelectedParent(null);
      setParentSearch("");
    }
  }, [type]);

  function toggleAssignee(val: string) {
    setAssigneeIds(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const { data: keyNum } = await supabase.rpc("get_next_issue_key", { p_project_id: projectId });
    const issueKey = `${projectKey}-${keyNum}`;

    // For legacy fields, use first real/virtual assignee
    const firstReal = assigneeIds.find(v => v.startsWith("real:"))?.replace("real:", "") ?? null;
    const firstVirtual = assigneeIds.find(v => v.startsWith("virtual:"))?.replace("virtual:", "") ?? null;

    const { data, error } = await supabase
      .from("issues")
      .insert({
        key: issueKey,
        title: title.trim(),
        type,
        status,
        priority,
        project_id: projectId,
        sprint_id: selectedSprintId,
        assignee_id: firstReal,
        virtual_assignee_id: firstVirtual,
        reporter_id: userId,
        parent_id: parentId || (selectedParentId !== "none" ? selectedParentId : null),
        story_points: storyPoints ? parseInt(storyPoints) : null,
        start_date: startDate || null,
        due_date: dueDate || null,
        sort_order: Date.now(),
      })
      .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)")
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Insert multi-assignees
    if (assigneeIds.length > 0 && data) {
      const rows = assigneeIds.map(v => {
        const [kind, id] = v.split(":");
        return kind === "virtual"
          ? { issue_id: (data as Issue).id, virtual_member_id: id }
          : { issue_id: (data as Issue).id, user_id: id };
      });
      await supabase.from("issue_assignees").insert(rows as any);
    }

    toast.success(`${issueKey} created`);
    onCreated(data as Issue);
    setTitle(""); setType("task"); setPriority("medium"); setAssigneeIds([]); setStoryPoints(""); setStartDate(""); setDueDate(""); setSelectedParentId("none"); setSelectedSprintId(defaultSprintId);
    setLoading(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" autoFocus required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_LABELS) as [IssueType, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_LABELS) as [IssuePriority, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_LABELS) as [IssueStatus, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Story points (days)</label>
              <Input
                type="number"
                min={0}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          </div>
          {/* Sprint selector — only shown when sprints are available */}
          {visibleSprints.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
              <Select value={selectedSprintId ?? "backlog"} onValueChange={(v) => setSelectedSprintId(v === "backlog" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog (no sprint)</SelectItem>
                  {visibleSprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.status === "active" ? " (Active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Parent issue picker — searchable combobox */}
          {!parentId && getParentTypes().length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === "story" ? "Link to Epic" : type === "subtask" ? "Parent Task" : "Parent Story / Epic"}
              </label>
              <div className="relative">
                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setParentPickerOpen(v => !v)}
                  className="w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors"
                >
                  {selectedParent ? (
                    <span className="flex items-center gap-1.5 min-w-0">
                      <ParentTypeBadge type={selectedParent.type} />
                      <span className="font-mono text-xs text-gray-400 shrink-0">{selectedParent.key}</span>
                      <span className="truncate text-gray-800">{selectedParent.title}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">None (standalone)</span>
                  )}
                  <ChevronDown size={14} className="shrink-0 text-gray-400" />
                </button>

                {/* Dropdown */}
                {parentPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setParentPickerOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-full overflow-hidden">
                      {/* Search */}
                      <div className="p-2 border-b border-gray-100">
                        <Input
                          autoFocus
                          placeholder="Search by key or title…"
                          value={parentSearch}
                          onChange={e => setParentSearch(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      {/* Options */}
                      <div className="max-h-52 overflow-y-auto py-1">
                        {/* None option */}
                        <button
                          type="button"
                          onClick={() => { setSelectedParentId("none"); setSelectedParent(null); setParentPickerOpen(false); }}
                          className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors", selectedParentId === "none" && "bg-blue-50")}
                        >
                          <span className="text-gray-400 italic">None (standalone)</span>
                          {selectedParentId === "none" && <Check size={12} className="text-blue-500 ml-auto shrink-0" />}
                        </button>
                        {parentLoading && <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>}
                        {!parentLoading && parentOptions.length === 0 && (
                          <div className="px-3 py-2 text-xs text-gray-400">No matching issues found</div>
                        )}
                        {parentOptions.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => { setSelectedParentId(p.id); setSelectedParent(p); setParentPickerOpen(false); }}
                            className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors", selectedParentId === p.id && "bg-blue-50")}
                          >
                            <ParentTypeBadge type={p.type} />
                            <span className="font-mono text-xs text-gray-400 shrink-0">{p.key}</span>
                            <span className="flex-1 truncate text-gray-800">{p.title}</span>
                            {selectedParentId === p.id && <Check size={12} className="text-blue-500 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignees</label>
            {/* Selected chips */}
            {assigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {assigneeIds.map(v => {
                  const [kind, id] = v.split(":");
                  const label = kind === "virtual"
                    ? virtualMembers.find(vm => vm.id === id)?.name
                    : members.find((m: any) => m.user_id === id)?.profile?.full_name || members.find((m: any) => m.user_id === id)?.profile?.email;
                  const color = kind === "virtual" ? virtualMembers.find(vm => vm.id === id)?.color : undefined;
                  return (
                    <span key={v} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                      {color
                        ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        : <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      }
                      {label}
                      <button type="button" onClick={() => toggleAssignee(v)} className="text-gray-400 hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {/* Scrollable list */}
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
              {members.length === 0 && virtualMembers.length === 0 && (
                <p className="text-xs text-gray-400 p-3 text-center">No members yet.</p>
              )}
              {members.length > 0 && (
                <div className="px-3 pt-2 pb-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wide bg-gray-50">Team</div>
              )}
              {members.map((m: any) => {
                const v = `real:${m.user_id}`;
                const active = assigneeIds.includes(v);
                return (
                  <button
                    type="button"
                    key={m.user_id}
                    onClick={() => toggleAssignee(v)}
                    className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors text-left", active && "bg-blue-50")}
                  >
                    <span className="w-3 h-3 rounded-full bg-blue-400 shrink-0" />
                    <span className="flex-1 font-medium text-gray-800 truncate">{m.profile?.full_name || m.profile?.email}</span>
                    {active && <Check size={11} className="text-blue-500 shrink-0" />}
                  </button>
                );
              })}
              {virtualMembers.length > 0 && (
                <div className="px-3 pt-2 pb-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wide bg-gray-50 border-t border-gray-100">Virtual</div>
              )}
              {virtualMembers.map((vm) => {
                const v = `virtual:${vm.id}`;
                const active = assigneeIds.includes(v);
                return (
                  <button
                    type="button"
                    key={vm.id}
                    onClick={() => toggleAssignee(v)}
                    className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors text-left", active && "bg-blue-50")}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: vm.color }} />
                    <span className="flex-1 font-medium text-gray-800 truncate">{vm.name}</span>
                    {active && <Check size={11} className="text-blue-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ParentTypeBadge({ type }: { type: IssueType }) {
  const styles: Record<string, { label: string; cls: string }> = {
    epic:  { label: "E", cls: "text-purple-600 bg-purple-50 border-purple-200" },
    story: { label: "S", cls: "text-green-600 bg-green-50 border-green-200" },
    task:  { label: "T", cls: "text-blue-600 bg-blue-50 border-blue-200" },
  };
  const s = styles[type] ?? styles.task;
  return (
    <span className={cn("inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold border shrink-0", s.cls)}>
      {s.label}
    </span>
  );
}
