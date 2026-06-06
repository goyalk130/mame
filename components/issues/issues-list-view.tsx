"use client";
import { useState, useMemo } from "react";
import { Plus, Search, Filter } from "lucide-react";
import type { Issue, Project, IssueType, IssuePriority, IssueStatus } from "@/types";
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateIssueDialog } from "./create-issue-dialog";
import { IssueDetailPanel } from "./issue-detail-panel";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Props {
  project: Project;
  initialIssues: Issue[];
  members: any[];
  userId: string;
}

export function IssuesListView({ project, initialIssues, members, userId }: Props) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.key.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && i.type !== filterType) return false;
      if (filterPriority !== "all" && i.priority !== filterPriority) return false;
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterAssignee !== "all") {
        if (filterAssignee === "unassigned" && i.assignee_id !== null) return false;
        if (filterAssignee !== "unassigned" && i.assignee_id !== filterAssignee) return false;
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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-900">Issues</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus size={14} />
            Create issue
          </Button>
        </div>
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 w-48 text-sm" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
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
              {members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email}</SelectItem>)}
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
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-24">Key</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Title</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-28">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-24">Priority</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-32">Assignee</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-32">Updated</th>
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
                onClick={() => setSelectedIssue(issue)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <IssueTypeIcon type={issue.type} />
                    <span className="font-mono text-xs text-gray-500">{issue.key}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-gray-900 line-clamp-1">{issue.title}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    issue.status === "done" ? "bg-green-100 text-green-700" :
                    issue.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    issue.status === "in_review" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {STATUS_LABELS[issue.status as IssueStatus]}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <PriorityIcon priority={issue.priority} />
                    <span className="text-xs text-gray-600">{PRIORITY_LABELS[issue.priority as IssuePriority]}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {issue.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[8px]">
                          {(issue.assignee.full_name || issue.assignee.email).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600 truncate max-w-[80px]">{issue.assignee.full_name || issue.assignee.email}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">
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
          userId={userId}
          onCreated={handleIssueCreated}
        />
      )}

      {selectedIssue && (
        <IssueDetailPanel
          issue={selectedIssue}
          project={project}
          members={members}
          userId={userId}
          onClose={() => setSelectedIssue(null)}
          onUpdated={handleIssueUpdated}
          onDeleted={handleIssueDeleted}
        />
      )}
    </div>
  );
}
