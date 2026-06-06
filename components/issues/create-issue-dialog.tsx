"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Issue, IssueStatus, IssueType, IssuePriority } from "@/types";
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
  userId: string;
  onCreated: (issue: Issue) => void;
  parentId?: string;
}

export function CreateIssueDialog({
  open, onClose, projectId, projectKey, defaultStatus, sprintId, members, userId, onCreated, parentId
}: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<IssueType>("task");
  const [status, setStatus] = useState<IssueStatus>(defaultStatus);
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("unassigned");
  const [storyPoints, setStoryPoints] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const supabase = createClient();

    // Get next key number
    const { data: keyNum } = await supabase.rpc("get_next_issue_key", { p_project_id: projectId });
    const issueKey = `${projectKey}-${keyNum}`;

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
        assignee_id: assigneeId === "unassigned" ? null : assigneeId,
        reporter_id: userId,
        parent_id: parentId || null,
        story_points: storyPoints ? parseInt(storyPoints) : null,
        sort_order: Date.now(),
      })
      .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*)")
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success(`${issueKey} created`);
    onCreated(data as Issue);
    setTitle(""); setType("task"); setPriority("medium"); setAssigneeId("unassigned"); setStoryPoints("");
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Story points</label>
              <Input
                type="number"
                min={0}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((m: any) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.profile?.email || m.user_id}
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
