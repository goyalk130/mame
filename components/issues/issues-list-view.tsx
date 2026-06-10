"use client";
import { useState, useMemo, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import type { Issue, Project, IssueType, IssuePriority, IssueStatus, VirtualMember, Sprint } from "@/types";
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateIssueDialog } from "./create-issue-dialog";
import { IssueDetailPanel } from "./issue-detail-panel";
import { cn, statusBadgeClass, getInitials } from "@/lib/utils";
import { AssigneeAvatars } from "@/components/ui/assignee-avatars";
import { formatDistanceToNow } from "date-fns";

interface Props {
  project: Project;
  initialIssues: Issue[];
  members: any[];
  virtualMembers?: VirtualMember[];
  sprints?: Sprint[];
  userId: string;
}

function issueMatchesAssignee(issue: Issue, k: string): boolean {
  if (k === "unassigned") {
    if (issue.assignees && issue.assignees.length > 0) return false;
    if (issue.assignee_id || (issue as any).virtual_assignee_id) return false;
    return true;
  }
  const isVirtual = k.startsWith("v:");
  const id = isVirtual ? k.slice(2) : k;
  if (issue.assignees && issue.assignees.length > 0) {
    return issue.assignees.some((a) =>
      isVirtual ? a.virtual_member_id === id : a.user_id === id
    );
  }
  if (isVirtual) return (issue as any).virtual_assignee_id === id;
  return issue.assignee_id === id;
}

export function IssuesListView({ project, initialIssues, members, virtualMembers = [], sprints = [], userId }: Props) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.key.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && i.type !== filterType) return false;
      if (filterPriority !== "all" && i.priority !== filterPriority) return false;
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterAssignee !== "all") {
        if (!issueMatchesAssignee(i, filterAssignee)) return false;
      }
      return true;
    });
  }, [issues, search, filterType, filterPriority, filterStatus, filterAssignee]);

  function handleIssueUpdated(updated: Issue) {
    setIssues((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    setSelectedIssue(updated);
  }

  function handleIssueDeleted(id: string) {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setSelectedIssue(null);
  }

  function handleIssueCreated(issue: Issue) {
    setIssues((prev) => [issue, ...prev]);
    setCreateOpen(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">Issues</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus size={14} />
            <span className="hidden sm:inline">Create issue</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 w-36 sm:w-48 text-sm" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-28 sm:w-32 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(Object.entries(TYPE_LABELS) as [IssueType, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {(Object.entries(PRIORITY_LABELS) as [IssuePriority, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.entries(STATUS_LABELS) as [IssueStatus, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((m: any) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email}
                </SelectItem>
              ))}
              {virtualMembers.map((vm) => (
                <SelectItem key={vm.id} value={`v:${vm.id}`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: vm.color }} />
                    {vm.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterType !== "all" || filterPriority !== "all" || filterStatus !== "all" || filterAssignee !== "all" || search) && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterType("all"); setFilterPriority("all"); setFilterStatus("all"); setFilterAssignee("all"); }}>
              Clear filters
            </Button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} issue{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-gray-500 w-16 sm:w-24">Key</th>
              <th className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-gray-500">Title</th>
              <th className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-gray-500 w-24 sm:w-28">Status</th>
              <th className="hidden sm:table-cell text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-24">Priority</th>
              <th className="hidden md:table-cell text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-32">Assignee</th>
              <th className="hidden lg:table-cell text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-32">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No issues found</td>
              </tr>
            )}
            {filtered.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => openIssue(issue)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-3 sm:px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <IssueTypeIcon type={issue.type} />
                    <span className="font-mono text-xs text-gray-500 hidden sm:inline">{issue.key}</span>
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-2.5">
                  <span className="text-gray-900 line-clamp-1 text-xs sm:text-sm">{issue.title}</span>
                </td>
                <td className="px-3 sm:px-4 py-2.5">
                  <span className={cn("text-xs px-1.5 sm:px-2 py-0.5 rounded-full", statusBadgeClass(issue.status))}>
                    {STATUS_LABELS[issue.status as IssueStatus]}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <PriorityIcon priority={issue.priority} />
                    <span className="text-xs text-gray-600">{PRIORITY_LABELS[issue.priority as IssuePriority]}</span>
                  </div>
                </td>
                <td className="hidden md:table-cell px-4 py-2.5">
                  {(issue.assignees && issue.assignees.length > 0) || issue.assignee || issue.virtual_assignee ? (
                    <AssigneeAvatars issue={issue} size={5} />
                  ) : (
                    <span className="text-xs text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="hidden lg:table-cell px-4 py-2.5 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateIssueDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={project.id}
          projectKey={project.key}
          defaultStatus="todo"
          sprintId={null}
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
