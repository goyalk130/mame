"use client";
import type { Issue } from "@/types";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  issue: Issue;
  onClick: () => void;
}

export function IssueCard({ issue, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-md border border-gray-200 p-3 cursor-pointer hover:shadow-sm hover:border-blue-300 transition-all group"
    >
      <div className="text-sm text-gray-900 font-medium leading-snug mb-2 line-clamp-2">
        {issue.title}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IssueTypeIcon type={issue.type} />
          <PriorityIcon priority={issue.priority} />
          <span className="text-xs text-gray-400 font-mono">{issue.key}</span>
        </div>
        {issue.assignee && (
          <Avatar className="w-5 h-5">
            <AvatarImage src={issue.assignee.avatar_url || undefined} />
            <AvatarFallback className="text-[8px]">
              {(issue.assignee.full_name || issue.assignee.email).split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
        {!issue.assignee && issue.virtual_assignee && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
            style={{ background: issue.virtual_assignee.color }}
            title={issue.virtual_assignee.name}
          >
            {issue.virtual_assignee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
        )}
      </div>
      {issue.story_points != null && (
        <div className="mt-1.5">
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{issue.story_points} pts</span>
        </div>
      )}
    </div>
  );
}
