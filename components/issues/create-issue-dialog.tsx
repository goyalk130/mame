"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Issue, IssueStatus, IssueType, IssuePriority, VirtualMember } from "@/types";
import { TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/types";
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
}

export function CreateIssueDialog({
  open, onClose, projectId, projectKey, defaultStatus, sprintId, members, virtualMembers = [], userId, onCreated, parentId
}: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<IssueType>("task");
  const [status, setStatus] = useState<IssueStatus>(defaultStatus);
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("unassigned");
  const [storyPoints, setStoryPoints] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>(parentId || "none");
  const [parentOptions, setParentOptions] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  // When type changes, load valid parent options
  useEffect(() => {
    if (parentId) return; // already set externally
    const supabase = createClient();
    let parentTypes: IssueType[] = [];
    if (type === "story") parentTypes = ["epic"];
    else if (type === "task" || type === "bug") parentTypes = ["story", "epic"];
    else if (type === "subtask") parentTypes = ["task"];
    if (!parentTypes.length) { setParentOptions([]); setSelectedParentId("none"); return; }
    supabase.from("issues").select("id, key, title, type").eq("project_id", projectId).in("type", parentTypes).order("type").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setParentOptions((data as Issue[]) || []));
  }, [type, projectId, parentId]);

  // assigneeId format: "real:uuid" | "virtual:uuid" | "unassigned"
  function parseAssignee(val: string) {
    if (val === "unassigned") return { assignee_id: null, virtual_assignee_id: null };
    const [type, id] = val.split(":");
    if (type === "virtual") return { assignee_id: null, virtual_assignee_id: id };
    return { assignee_id: id, virtual_assignee_id: null };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const { data: keyNum } = await supabase.rpc("get_next_issue_key", { p_project_id: projectId });
    const issueKey = `${projectKey}-${keyNum}`;
    const assigneeFields = parseAssignee(assigneeId);

    const { data, error } = await supabase
      .from("issues")
      .insert({
        key: issueKey,
        title: title.trim(),
        type,
        status,
        priority,
        project_id: projectId,
        sprint_id: sprintId,
        ...assigneeFields,
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

    toast.success(`${issueKey} created`);
    onCreated(data as Issue);
    setTitle(""); setType("task"); setPriority("medium"); setAssigneeId("unassigned"); setStoryPoints(""); setStartDate(""); setDueDate(""); setSelectedParentId("none");
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
          {/* Parent issue picker — shown when relevant parent types exist */}
          {!parentId && parentOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === "story" ? "Link to Epic" : type === "subtask" ? "Parent Task" : "Parent Story / Epic"}
              </label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="None (standalone)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (standalone)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className={`font-mono text-xs mr-1 ${p.type === "epic" ? "text-purple-500" : "text-green-500"}`}>[{p.type === "epic" ? "E" : "S"}]</span>
                      <span className="font-mono text-xs text-gray-400 mr-1">{p.key}</span> {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.length > 0 && (
                  <div className="px-2 py-1 text-xs text-gray-400 font-medium">Team members</div>
                )}
                {members.map((m: any) => (
                  <SelectItem key={m.user_id} value={`real:${m.user_id}`}>
                    {m.profile?.full_name || m.profile?.email}
                  </SelectItem>
                ))}
                {virtualMembers.length > 0 && (
                  <div className="px-2 py-1 text-xs text-gray-400 font-medium">Virtual members</div>
                )}
                {virtualMembers.map((vm) => (
                  <SelectItem key={vm.id} value={`virtual:${vm.id}`}>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: vm.color }} />
                      {vm.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
