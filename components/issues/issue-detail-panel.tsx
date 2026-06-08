"use client";
import { useState, useEffect, useRef } from "react";
import { X, Trash2, Plus, ChevronRight, CheckCircle2, Circle, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Issue, Comment, Activity, Project, IssueStatus, IssuePriority, IssueType, VirtualMember, Sprint } from "@/types";
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "./rich-text-editor";
import { CreateIssueDialog } from "./create-issue-dialog";
import { cn, statusBadgeClass, getInitials } from "@/lib/utils";
import { getTimeStatus, getTimeInfo } from "@/lib/time-status";
import toast from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";

interface Props {
  issue: Issue;
  project: Project;
  members: any[];
  virtualMembers?: VirtualMember[];
  sprints?: Sprint[];
  userId: string;
  onClose: () => void;
  onUpdated: (issue: Issue) => void;
  onDeleted: (id: string) => void;
  onDuplicated?: (issue: Issue) => void;
  onNavigate?: (issue: Issue) => void;
}

export function IssueDetailPanel({ issue: initialIssue, project, members, virtualMembers = [], sprints = [], userId, onClose, onUpdated, onDeleted, onDuplicated, onNavigate }: Props) {
  const [issue, setIssue] = useState<Issue>(initialIssue);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityHasMore, setActivityHasMore] = useState(false);
  const ACTIVITY_PAGE_SIZE = 25;
  const [newComment, setNewComment] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [tab, setTab] = useState<"comments" | "activity">("comments");
  const [children, setChildren] = useState<Issue[]>([]);
  const [parentIssue, setParentIssue] = useState<Issue | null>(null);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [linkChildOpen, setLinkChildOpen] = useState(false);
  const [linkParentOpen, setLinkParentOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkOptions, setLinkOptions] = useState<Issue[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    setIssue(initialIssue);
    setTitleValue(initialIssue.title);
    setActivityPage(1);
    setActivityHasMore(false);
    fetchComments();
    fetchActivity(1);
    fetchChildren();
    fetchParentFresh();
  }, [initialIssue.id]);

  async function fetchChildren() {
    const { data } = await supabase
      .from("issues")
      .select("*, assignee:profiles!assignee_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*)")
      .eq("parent_id", initialIssue.id)
      .order("created_at", { ascending: true });
    setChildren((data as Issue[]) || []);
  }

  // Always fetch current parent_id from DB first (ignores stale client state)
  async function fetchParentFresh() {
    const { data: fresh } = await supabase
      .from("issues")
      .select("parent_id")
      .eq("id", initialIssue.id)
      .single();
    if (!fresh?.parent_id) { setParentIssue(null); return; }
    const { data } = await supabase
      .from("issues")
      .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*), parent:issues!issues_parent_id_fkey(id, key, title, type)")
      .eq("id", fresh.parent_id)
      .single();
    setParentIssue(data as Issue || null);
  }

  // Which types are valid parents for this issue type
  function validParentTypes(): IssueType[] {
    if (issue.type === "story") return ["epic"];
    if (issue.type === "task" || issue.type === "bug") return ["story", "epic"];
    if (issue.type === "subtask") return ["task", "story"];
    return [];
  }

  // Which types are valid children for this issue type
  function validChildTypes(): IssueType[] {
    if (issue.type === "epic") return ["story", "task", "bug"];
    if (issue.type === "story") return ["task", "bug", "subtask"];
    if (issue.type === "task") return ["subtask"];
    return [];
  }

  async function openLinkParent() {
    setLinkSearch("");
    setLinkOptions([]);
    setLinkParentOpen(true);
    setLinkLoading(true);
    const types = validParentTypes();
    if (types.length === 0) return;
    const { data } = await supabase
      .from("issues")
      .select("id, key, title, type, status, parent_id")
      .eq("project_id", issue.project_id)
      .in("type", types)
      .neq("id", issue.id)
      .order("key", { ascending: true });
    setLinkOptions((data as Issue[]) || []);
    setLinkLoading(false);
  }

  async function openLinkChild() {
    setLinkSearch("");
    setLinkOptions([]);
    setLinkChildOpen(true);
    setLinkLoading(true);
    const types = validChildTypes();
    if (types.length === 0) return;
    const { data } = await supabase
      .from("issues")
      .select("id, key, title, type, status, parent_id")
      .eq("project_id", issue.project_id)
      .in("type", types)
      .neq("id", issue.id)
      .order("key", { ascending: true });
    setLinkOptions((data as Issue[]) || []);
    setLinkLoading(false);
  }

  async function linkAsChild(child: Issue) {
    // Check if child already has a different parent — it will be re-parented
    const { data: freshChild } = await supabase
      .from("issues").select("parent_id").eq("id", child.id).single();
    const oldParentId = freshChild?.parent_id;

    const { error } = await supabase.from("issues").update({ parent_id: issue.id }).eq("id", child.id);
    if (error) { toast.error(error.message); return; }

    // Log on the child too so its activity tab is accurate
    await supabase.from("activity").insert([
      { issue_id: issue.id, actor_id: userId, action: "updated", field: "child linked", old_value: oldParentId ? "another issue" : null, new_value: `${child.key} ${child.title}` },
      { issue_id: child.id, actor_id: userId, action: "updated", field: "parent", old_value: oldParentId ? "previous parent" : null, new_value: `${issue.key} ${issue.title}` },
    ]);

    if (oldParentId && oldParentId !== issue.id) {
      toast.success(`${child.key} moved to ${issue.key} (removed from previous parent)`);
    } else {
      toast.success(`${child.key} linked as child`);
    }
    setLinkChildOpen(false);
    fetchChildren();
  }

  async function linkAsParent(parent: Issue) {
    // Get fresh current parent from DB
    const { data: freshSelf } = await supabase
      .from("issues").select("parent_id").eq("id", issue.id).single();
    const oldParentId = freshSelf?.parent_id;

    const { error } = await supabase.from("issues").update({ parent_id: parent.id }).eq("id", issue.id);
    if (error) { toast.error(error.message); return; }

    await supabase.from("activity").insert({
      issue_id: issue.id, actor_id: userId, action: "updated", field: "parent",
      old_value: oldParentId ? "previous parent" : "None",
      new_value: `${parent.key} ${parent.title}`,
    });

    toast.success(`Linked to ${parent.key}`);
    setLinkParentOpen(false);
    // Re-fetch parent fresh from DB to ensure consistency
    await fetchParentFresh();
    const updated = { ...issue, parent_id: parent.id };
    setIssue(updated as Issue);
    onUpdated(updated as Issue);
  }

  async function unlinkParent() {
    if (!parentIssue) return;
    const { error } = await supabase.from("issues").update({ parent_id: null }).eq("id", issue.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity").insert({
      issue_id: issue.id, actor_id: userId, action: "updated", field: "parent",
      old_value: `${parentIssue.key} ${parentIssue.title}`, new_value: "None",
    });
    toast.success("Parent unlinked");
    setParentIssue(null);
    const updated = { ...issue, parent_id: null };
    setIssue(updated as Issue);
    onUpdated(updated as Issue);
  }

  async function unlinkChild(child: Issue) {
    const { error } = await supabase.from("issues").update({ parent_id: null }).eq("id", child.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${child.key} unlinked`);
    setChildren((prev) => prev.filter((c) => c.id !== child.id));
  }

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*, author:profiles!author_id(*)")
      .eq("issue_id", initialIssue.id)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  }

  async function fetchActivity(page = 1) {
    const from = (page - 1) * ACTIVITY_PAGE_SIZE;
    const to = from + ACTIVITY_PAGE_SIZE - 1;
    const { data } = await supabase
      .from("activity")
      .select("*, actor:profiles!actor_id(*)")
      .eq("issue_id", initialIssue.id)
      .order("created_at", { ascending: false })
      .range(from, to + 1); // fetch one extra to detect if more exist
    const rows = (data as Activity[]) || [];
    const hasMore = rows.length > ACTIVITY_PAGE_SIZE;
    if (hasMore) rows.pop(); // remove the extra
    if (page === 1) {
      setActivity(rows);
    } else {
      setActivity((prev) => [...prev, ...rows]);
    }
    setActivityPage(page);
    setActivityHasMore(hasMore);
  }

  async function loadMoreActivity() {
    await fetchActivity(activityPage + 1);
  }

  async function updateField(field: string, value: any, displayOld?: string, displayNew?: string) {
    const { data, error } = await supabase
      .from("issues")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", issue.id)
      .select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), parent:issues!issues_parent_id_fkey(id, key, title, type)")
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

  async function handleDuplicate() {
    // Build unique title: append (2), or increment existing number
    const titleMatch = issue.title.match(/^(.*?)\s*\((\d+)\)$/);
    const newTitle = titleMatch
      ? `${titleMatch[1]} (${parseInt(titleMatch[2]) + 1})`
      : `${issue.title} (2)`;

    const { data: keyNum } = await (supabase as any).rpc("get_next_issue_key", { p_project_id: project.id });
    const issueKey = `${project.key}-${keyNum}`;

    const { data, error } = await supabase.from("issues").insert({
      key: issueKey,
      title: newTitle,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      priority: issue.priority,
      project_id: project.id,
      sprint_id: issue.sprint_id,
      assignee_id: issue.assignee_id,
      virtual_assignee_id: issue.virtual_assignee_id,
      reporter_id: userId,
      parent_id: issue.parent_id,
      story_points: issue.story_points,
      start_date: issue.start_date,
      due_date: issue.due_date,
      sort_order: Date.now(),
    } as any).select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*), parent:issues!issues_parent_id_fkey(id, key, title, type)").single();

    if (error) { toast.error(error.message); return; }
    toast.success(`Duplicated as ${issueKey}`);
    onDuplicated?.(data as Issue);
    onNavigate?.(data as Issue);
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
            <button
              className="text-sm font-mono text-gray-500 hover:text-blue-600 hover:underline transition-colors"
              title="Copy link to this ticket"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("issue", issue.key);
                navigator.clipboard.writeText(url.toString());
                toast.success("Link copied!");
              }}
            >
              {issue.key}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleDuplicate} title="Duplicate issue" className="text-gray-400 hover:text-blue-500">
              <Copy size={15} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete issue" className="text-gray-400 hover:text-red-500">
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

              {/* Parent breadcrumb */}
              {parentIssue && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-3 -mt-1">
                  <IssueTypeIcon type={parentIssue.type} />
                  <button
                    className="hover:text-blue-600 hover:underline font-mono cursor-pointer"
                    onClick={() => onNavigate?.(parentIssue as Issue)}
                    title={`Open ${parentIssue.key}: ${parentIssue.title}`}
                  >
                    {parentIssue.key}
                  </button>
                  <ChevronRight size={12} />
                  <button
                    className="text-gray-500 truncate max-w-[200px] hover:text-blue-600 hover:underline text-left cursor-pointer"
                    onClick={() => onNavigate?.(parentIssue as Issue)}
                  >
                    {parentIssue.title}
                  </button>
                </div>
              )}

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

              {/* Child issues */}
              {issue.type !== "subtask" && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">
                      {issue.type === "epic" ? "Stories" : issue.type === "story" ? "Tasks & Subtasks" : "Subtasks"}
                      {children.length > 0 && (
                        <span className="ml-1.5 text-gray-400 font-normal">
                          ({children.filter(c => c.status === "done").length}/{children.length} done)
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openLinkChild}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50"
                      >
                        Link existing
                      </button>
                      <button
                        onClick={() => setAddChildOpen(true)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Plus size={13} /> Create new
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {children.length > 0 && (
                    <div className="mb-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all"
                        style={{ width: `${(children.filter(c => c.status === "done").length / children.length) * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    {children.length === 0 && (
                      <p className="text-xs text-gray-400 py-2">No child issues yet. Click "Add" to create one.</p>
                    )}
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 group cursor-pointer"
                        onClick={() => onNavigate?.(child)}
                      >
                        {child.status === "done"
                          ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                          : <Circle size={14} className="text-gray-300 shrink-0" />
                        }
                        <IssueTypeIcon type={child.type} />
                        <span className="text-xs font-mono text-gray-400 shrink-0">{child.key}</span>
                        <span className="text-sm text-gray-700 flex-1 truncate">{child.title}</span>
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full shrink-0", statusBadgeClass(child.status))}>
                          {STATUS_LABELS[child.status]}
                        </span>
                        {child.assignee && (
                          <span className="text-xs text-gray-400 shrink-0 hidden group-hover:block">
                            {child.assignee.full_name || child.assignee.email}
                          </span>
                        )}
                        {!child.assignee && child.virtual_assignee && (
                          <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-white text-[7px] font-bold"
                            style={{ background: child.virtual_assignee.color }}
                            title={child.virtual_assignee.name}>
                            {getInitials(child.virtual_assignee.name)}
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); unlinkChild(child); }}
                          className="ml-auto text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Unlink"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                          <AvatarFallback className="text-[10px]">{getInitials(c.author?.full_name || c.author?.email)}</AvatarFallback>
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
                          <AvatarFallback className="text-[8px]">{getInitials(a.actor?.full_name || a.actor?.email)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900">{a.actor?.full_name || a.actor?.email}</span>
                          {" "}
                          <span className="text-gray-600">
                            {a.field ? (
                              <>
                                <span>updated </span>
                                <span className="font-medium text-gray-700">{a.field}</span>
                                {formatActivityValue(a.old_value) && (
                                  <> from <span className="bg-red-50 text-red-600 px-1 rounded line-through text-xs">{formatActivityValue(a.old_value)}</span></>
                                )}
                                {formatActivityValue(a.new_value) && (
                                  <> to <span className="bg-green-50 text-green-700 px-1 rounded text-xs">{formatActivityValue(a.new_value)}</span></>
                                )}
                              </>
                            ) : a.action}
                          </span>
                          {" · "}
                          <span className="text-gray-400">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                    {activityHasMore && (
                      <button
                        onClick={loadMoreActivity}
                        className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 border border-dashed border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        Load more activity
                      </button>
                    )}
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

              {sprints.length > 0 && (
                <Field label="Sprint">
                  <Select
                    value={issue.sprint_id ?? "none"}
                    onValueChange={(v) => {
                      const newSprintId = v === "none" ? null : v;
                      const oldSprint = sprints.find((s) => s.id === issue.sprint_id);
                      const newSprint = sprints.find((s) => s.id === newSprintId);
                      updateField(
                        "sprint_id",
                        newSprintId,
                        oldSprint?.name ?? "Backlog",
                        newSprint?.name ?? "Backlog"
                      );
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-gray-400">No sprint (Backlog)</span>
                      </SelectItem>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-1.5">
                            {s.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
                            {s.name}
                            {s.status === "active" && <span className="text-xs text-green-600 font-medium">(active)</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

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
                      supabase.from("issues").update({ assignee_id: null, virtual_assignee_id: null, updated_at: new Date().toISOString() }).eq("id", issue.id).select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*), parent:issues!issues_parent_id_fkey(id, key, title, type)").single().then(({ data }) => { if (data) { setIssue(data as Issue); onUpdated(data as Issue); } });
                    } else if (v.startsWith("virtual:")) {
                      const vmId = v.replace("virtual:", "");
                      const vm = virtualMembers.find(m => m.id === vmId);
                      supabase.from("issues").update({ assignee_id: null, virtual_assignee_id: vmId, updated_at: new Date().toISOString() }).eq("id", issue.id).select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*), parent:issues!issues_parent_id_fkey(id, key, title, type)").single().then(({ data }) => { if (data) { setIssue(data as Issue); onUpdated(data as Issue); } });
                    } else {
                      const userId = v.replace("real:", "");
                      const m = members.find((m: any) => m.user_id === userId);
                      supabase.from("issues").update({ assignee_id: userId, virtual_assignee_id: null, updated_at: new Date().toISOString() }).eq("id", issue.id).select("*, assignee:profiles!assignee_id(*), reporter:profiles!reporter_id(*), virtual_assignee:virtual_members!virtual_assignee_id(*), parent:issues!issues_parent_id_fkey(id, key, title, type)").single().then(({ data }) => { if (data) { setIssue(data as Issue); onUpdated(data as Issue); } });
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

              {/* Parent link (for tasks/subtasks) */}
              {validParentTypes().length > 0 && (
                <Field label={
                  issue.type === "subtask" ? "Parent Task" :
                  issue.type === "story" ? "Parent Epic" :
                  issue.type === "task" || issue.type === "bug" ? "Parent Story / Epic" :
                  "Parent"
                }>
                  <button
                    onClick={openLinkParent}
                    className={cn(
                      "w-full flex items-center gap-1.5 h-7 px-2 rounded-md border text-xs text-left transition-colors",
                      "border-input bg-background hover:bg-accent hover:border-gray-300",
                      parentIssue ? "text-gray-800" : "text-gray-400"
                    )}
                  >
                    {parentIssue ? (
                      <>
                        <IssueTypeIcon type={parentIssue.type} />
                        <span className="font-mono text-gray-400 shrink-0">{parentIssue.key}</span>
                        <span className="truncate flex-1">{parentIssue.title}</span>
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); unlinkParent(); }}
                          className="text-gray-300 hover:text-red-400 shrink-0 ml-auto"
                          title="Remove parent"
                        >
                          <X size={11} />
                        </span>
                      </>
                    ) : (
                      <>
                        <Plus size={11} />
                        <span>Set parent…</span>
                      </>
                    )}
                  </button>
                </Field>
              )}

              <div className="pt-2 border-t border-gray-200 space-y-1 text-xs text-gray-400">
                {issue.created_at && <div>Created {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</div>}
                {issue.updated_at && <div>Updated {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add child issue dialog */}
      {addChildOpen && (
        <CreateIssueDialog
          open={addChildOpen}
          onClose={() => setAddChildOpen(false)}
          projectId={issue.project_id}
          projectKey={issue.key.split("-")[0]}
          defaultStatus="todo"
          sprintId={issue.sprint_id}
          members={members}
          virtualMembers={virtualMembers}
          userId={userId}
          parentId={issue.id}
          onCreated={(child) => {
            setChildren((prev) => [...prev, child]);
            setAddChildOpen(false);
          }}
        />
      )}

      {/* Link existing child modal */}
      {linkChildOpen && (
        <LinkIssueModal
          title={`Link existing issue as child of ${issue.key}`}
          options={linkOptions}
          loading={linkLoading}
          search={linkSearch}
          onSearch={setLinkSearch}
          onSelect={linkAsChild}
          onClose={() => setLinkChildOpen(false)}
          showReParentWarning={true}
        />
      )}

      {/* Link parent modal */}
      {linkParentOpen && (
        <LinkIssueModal
          title={`Link parent for ${issue.key}`}
          options={linkOptions}
          loading={linkLoading}
          search={linkSearch}
          onSearch={setLinkSearch}
          onSelect={linkAsParent}
          onClose={() => setLinkParentOpen(false)}
        />
      )}
    </>
  );
}

function LinkIssueModal({
  title, options, loading, search, onSearch, onSelect, onClose, showReParentWarning = false,
}: {
  title: string;
  showReParentWarning?: boolean;
  options: Issue[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (issue: Issue) => void;
  onClose: () => void;
}) {
  const filtered = options.filter((o) =>
    !search || o.key.toLowerCase().includes(search.toLowerCase()) || o.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed z-[70] left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/3 w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
        </div>
        <div className="px-4 py-2 border-b border-gray-100">
          <Input
            autoFocus
            placeholder="Search by key or title..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="overflow-y-auto max-h-72">
          {loading && <div className="text-xs text-gray-400 px-4 py-3">Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-xs text-gray-400 px-4 py-3">No matching issues found</div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt)}
              className="w-full flex flex-col px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center gap-2 w-full">
                <IssueTypeIcon type={opt.type} />
                <span className="text-xs font-mono text-gray-400 shrink-0">{opt.key}</span>
                <span className="text-sm text-gray-800 flex-1 truncate">{opt.title}</span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full shrink-0",
                  opt.status === "done" ? "bg-green-100 text-green-700" :
                  opt.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                  opt.status === "triage" ? "bg-purple-100 text-purple-700" :
                  "bg-gray-100 text-gray-500"
                )}>{STATUS_LABELS[opt.status]}</span>
              </div>
              {showReParentWarning && opt.parent_id && (
                <span className="text-xs text-orange-500 mt-0.5 pl-5">
                  ⚠ Already has a parent — will be re-parented
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")   // remove tags
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")       // collapse whitespace
    .trim();
}

function formatActivityValue(val: string | null | undefined): string {
  if (!val || val === "null" || val === "undefined") return "";
  const stripped = stripHtml(val);
  if (!stripped) return "";
  return stripped.length > 60 ? stripped.slice(0, 60) + "…" : stripped;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      {children}
    </div>
  );
}
