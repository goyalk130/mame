"use client";
import { useState, useEffect, useRef } from "react";
import { X, Trash2, ExternalLink, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Issue, Comment, Activity, Project, IssueStatus, IssuePriority, IssueType, VirtualMember } from "@/types";
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "./rich-text-editor";
import { cn } from "@/lib/utils";
import { getTimeStatus, getTimeInfo } from "@/lib/time-status";
import toast from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";

interface Props {
  issue: Issue;
  project: Project;
  members: any[];
  virtualMembers?: VirtualMember[];
  userId: string;
  onClose: () => void;
  onUpdated: (issue: Issue) => void;
  onDeleted: (id: string) => void;
}

export function IssueDetailPanel({ issue: initialIssue, project, members, virtualMembers = [], userId, onClose, onUpdated, onDeleted }: Props) {
  const [issue, setIssue] = useState<Issue>(initialIssue);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [tab, setTab] = useState<"comments" | "activity">("comments");
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    setIssue(initialIssue);
    setTitleValue(initialIssue.title);
    fetchComments();
    fetchActivity();
  }, [initialIssue.id]);

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*, author:profiles!author_id(*)")
      .eq("issue_id", initialIssue.id)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  }

  async function fetchActivity() {
    const { data } = await supabase
      .from("activity")
      .select("*, actor:profiles!actor_id(*)")
      .eq("issue_id", initialIssue.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setActivity((data as Activity[]) || []);
  }

  async function updateField(field: string, value: any, displayOld?: string, displayNew?: string) {
    const { data, error } = await supabase
      .from("issues")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", issue.id)
      .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*)")
      .single();
    if (error) { toast.error(error.message); return; }
    // Log activity
    await supabase.from("activity").insert({
      issue_id: issue.id,
      actor_id: userId,
      action: "updated",
      field,
      old_value: displayOld,
      new_value: displayNew || String(value),
    });
    const updated = data as Issue;
    setIssue(updated);
    onUpdated(updated);
  }

  async function saveTitle() {
    if (!titleValue.trim() || titleValue === issue.title) { setEditingTitle(false); return; }
    setSavingTitle(true);
    await updateField("title", titleValue.trim(), issue.title, titleValue.trim());
    setSavingTitle(false);
    setEditingTitle(false);
  }

  async function saveDescription(html: string) {
    await updateField("description", html || null);
  }

  async function addComment() {
    if (!newComment.trim()) return;
    setAddingComment(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ issue_id: issue.id, author_id: userId, body: newComment.trim() })
      .select("*, author:profiles!author_id(*)")
      .single();
    if (error) { toast.error(error.message); setAddingComment(false); return; }
    setComments((prev) => [...prev, data as Comment]);
    setNewComment("");
    setAddingComment(false);
  }

  async function deleteComment(commentId: string) {
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleDelete() {
    if (!confirm("Delete this issue? This cannot be undone.")) return;
    const { error } = await supabase.from("issues").delete().eq("id", issue.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Issue deleted");
    onDeleted(issue.id);
  }

  function initials(profile: any) {
    return (profile?.full_name || profile?.email || "?")
      .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <IssueTypeIcon type={issue.type} />
            <span className="text-sm font-mono text-gray-500">{issue.key}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-gray-400 hover:text-red-500">
              <Trash2 size={15} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={15} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-0">
            {/* Main content */}
            <div className="flex-1 px-6 py-5 min-w-0">
              {/* Title */}
              {editingTitle ? (
                <div className="mb-4">
                  <Input
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                    className="text-xl font-semibold border-blue-400 focus-visible:ring-0"
                    autoFocus
                    disabled={savingTitle}
                  />
                </div>
              ) : (
                <h2
                  className="text-xl font-semibold text-gray-900 mb-4 cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {issue.title}
                </h2>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Description</h3>
                <RichTextEditor
                  content={issue.description || ""}
                  onSave={saveDescription}
                  placeholder="Add a description..."
                />
              </div>

              {/* Comments / Activity tabs */}
              <div>
                <div className="flex gap-4 border-b border-gray-200 mb-4">
                  {(["comments", "activity"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        "pb-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
                        tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {tab === "comments" && (
                  <div className="space-y-4">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarFallback className="text-[10px]">{initials(c.author)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {c.author?.full_name || c.author?.email}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</div>
                          {c.author_id === userId && (
                            <button onClick={() => deleteComment(c.id)} className="text-xs text-gray-400 hover:text-red-500 mt-1">Delete</button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className="text-[10px]">Me</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          rows={2}
                          className="text-sm"
                          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addComment(); }}
                        />
                        {newComment.trim() && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={addComment} disabled={addingComment}>
                              {addingComment ? "Saving..." : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setNewComment("")}>Cancel</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "activity" && (
                  <div className="space-y-2">
                    {activity.length === 0 && <p className="text-sm text-gray-400">No activity yet</p>}
                    {activity.map((a) => (
                      <div key={a.id} className="flex gap-2 text-sm">
                        <Avatar className="w-5 h-5 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[8px]">{initials(a.actor)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-gray-900">{a.actor?.full_name || a.actor?.email}</span>
                          {" "}
                          <span className="text-gray-600">
                            {a.field ? `changed ${a.field} from "${a.old_value}" to "${a.new_value}"` : a.action}
                          </span>
                          {" · "}
                          <span className="text-gray-400">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar fields */}
            <div className="w-56 shrink-0 border-l border-gray-100 px-4 py-5 space-y-5 bg-gray-50">

              {/* Time tracking summary */}
              {(() => {
                const timeInfo = getTimeInfo(issue);
                const timeStatus = getTimeStatus(issue);
                if (!timeInfo) return null;
                return (
                  <div className={cn(
                    "rounded-lg p-3 text-xs border",
                    timeStatus === "overdue" ? "bg-red-50 border-red-200 text-red-700" :
                    timeStatus === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                    "bg-blue-50 border-blue-100 text-blue-700"
                  )}>
                    <div className="font-semibold mb-1">
                      {timeStatus === "overdue" ? "⚠ Over budget" :
                       timeStatus === "warning" ? "⏳ Nearing limit" :
                       "✓ On track"}
                    </div>
                    <div>Budget: <strong>{timeInfo.pts} days</strong></div>
                    <div>Elapsed: <strong>{timeInfo.elapsed} days</strong></div>
                    {timeStatus === "overdue" && (
                      <div className="font-bold text-red-600 mt-1">+{timeInfo.overflow} days over</div>
                    )}
                    {timeStatus === "warning" && (
                      <div className="font-bold text-yellow-600 mt-1">{timeInfo.remaining} day{timeInfo.remaining !== 1 ? "s" : ""} remaining</div>
                    )}
                    {timeStatus === "normal" && (
                      <div className="text-blue-600 mt-1">{timeInfo.remaining} day{timeInfo.remaining !== 1 ? "s" : ""} remaining</div>
                    )}
                  </div>
                );
              })()}

              <Field label="Status">
                <Select value={issue.status} onValueChange={(v: IssueStatus) => updateField("status", v, issue.status, STATUS_LABELS[v])}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_LABELS) as [IssueStatus, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Priority">
                <Select value={issue.priority} onValueChange={(v: IssuePriority) => updateField("priority", v, issue.priority, PRIORITY_LABELS[v])}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PRIORITY_LABELS) as [IssuePriority, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        <span className="flex items-center gap-1.5"><PriorityIcon priority={v} />{l}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Type">
                <Select value={issue.type} onValueChange={(v: IssueType) => updateField("type", v, issue.type, TYPE_LABELS[v])}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_LABELS) as [IssueType, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Assignee">
                <Select
                  value={
                    issue.virtual_assignee_id
                      ? `virtual:${issue.virtual_assignee_id}`
                      : issue.assignee_id
                      ? `real:${issue.assignee_id}`
                      : "unassigned"
                  }
                  onValueChange={(v) => {
                    if (v === "unassigned") {
                      supabase.from("issues").update({ assignee_id: null, virtual_assignee_id: null, updated_at: new Date().toISOString() }).eq("id", issue.id).select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)").single().then(({ data }) => { if (data) { setIssue(data as Issue); onUpdated(data as Issue); } });
                    } else if (v.startsWith("virtual:")) {
                      const vmId = v.replace("virtual:", "");
                      const vm = virtualMembers.find(m => m.id === vmId);
                      supabase.from("issues").update({ assignee_id: null, virtual_assignee_id: vmId, updated_at: new Date().toISOString() }).eq("id", issue.id).select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)").single().then(({ data }) => { if (data) { setIssue(data as Issue); onUpdated(data as Issue); } });
                    } else {
                      const userId = v.replace("real:", "");
                      const m = members.find((m: any) => m.user_id === userId);
                      supabase.from("issues").update({ assignee_id: userId, virtual_assignee_id: null, updated_at: new Date().toISOString() }).eq("id", issue.id).select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)").single().then(({ data }) => { if (data) { setIssue(data as Issue); onUpdated(data as Issue); } });
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.length > 0 && <div className="px-2 py-1 text-xs text-gray-400 font-medium">Team members</div>}
                    {members.map((m: any) => (
                      <SelectItem key={m.user_id} value={`real:${m.user_id}`}>
                        {m.profile?.full_name || m.profile?.email}
                      </SelectItem>
                    ))}
                    {virtualMembers.length > 0 && <div className="px-2 py-1 text-xs text-gray-400 font-medium">Virtual members</div>}
                    {virtualMembers.map((vm) => (
                      <SelectItem key={vm.id} value={`virtual:${vm.id}`}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: vm.color }} />
                          {vm.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Reporter">
                <div className="text-xs text-gray-600">
                  {issue.reporter?.full_name || issue.reporter?.email || "Unknown"}
                </div>
              </Field>

              <Field label="Story Points (days)">
                <Input
                  type="number"
                  min={0}
                  className="h-7 text-xs"
                  defaultValue={issue.story_points ?? ""}
                  onBlur={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    if (val !== issue.story_points) updateField("story_points", val);
                  }}
                />
              </Field>

              <Field label="Start Date">
                <Input
                  type="date"
                  className="h-7 text-xs"
                  defaultValue={issue.start_date || ""}
                  onBlur={(e) => {
                    const val = e.target.value || null;
                    if (val !== issue.start_date) updateField("start_date", val);
                  }}
                />
              </Field>

              <Field label="Due Date">
                <Input
                  type="date"
                  className="h-7 text-xs"
                  defaultValue={issue.due_date || ""}
                  onBlur={(e) => {
                    const val = e.target.value || null;
                    if (val !== issue.due_date) updateField("due_date", val);
                  }}
                />
              </Field>

              <div className="pt-2 border-t border-gray-200 space-y-1 text-xs text-gray-400">
                <div>Created {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</div>
                <div>Updated {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      {children}
    </div>
  );
}
