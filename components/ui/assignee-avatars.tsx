"use client";
import type { Issue, IssueAssignee } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  issue: Issue;
  /** Tailwind size number, e.g. 4 = w-4 h-4, 5 = w-5 h-5 */
  size?: 4 | 5 | 6;
  max?: number;
}

export function AssigneeAvatars({ issue, size = 5, max = 3 }: Props) {
  const assignees = issue.assignees;

  // If new multi-assignees array available, use it
  if (assignees && assignees.length > 0) {
    const visible = assignees.slice(0, max);
    const extra = assignees.length - max;
    const dim = `w-${size} h-${size}`;
    const textSize = size === 4 ? "text-[7px]" : size === 5 ? "text-[8px]" : "text-[9px]";
    return (
      <div className="flex items-center -space-x-1">
        {visible.map((a: IssueAssignee) => {
          if (a.profile) {
            return (
              <Avatar key={a.id} className={cn(dim, "ring-1 ring-white")} title={a.profile.full_name || a.profile.email}>
                <AvatarImage src={a.profile.avatar_url || undefined} />
                <AvatarFallback className={textSize}>
                  {getInitials(a.profile.full_name || a.profile.email)}
                </AvatarFallback>
              </Avatar>
            );
          }
          if (a.virtual_member) {
            return (
              <div
                key={a.id}
                className={cn(dim, "rounded-full flex items-center justify-center text-white font-bold ring-1 ring-white shrink-0", textSize)}
                style={{ background: a.virtual_member.color }}
                title={a.virtual_member.name}
              >
                {getInitials(a.virtual_member.name)}
              </div>
            );
          }
          return null;
        })}
        {extra > 0 && (
          <div className={cn(dim, "rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-600 ring-1 ring-white shrink-0", textSize)}>
            +{extra}
          </div>
        )}
      </div>
    );
  }

  // Fallback: use legacy single assignee fields
  if (issue.assignee) {
    const dim = `w-${size} h-${size}`;
    const textSize = size === 4 ? "text-[7px]" : size === 5 ? "text-[8px]" : "text-[9px]";
    return (
      <Avatar className={dim} title={issue.assignee.full_name || issue.assignee.email}>
        <AvatarImage src={issue.assignee.avatar_url || undefined} />
        <AvatarFallback className={textSize}>
          {getInitials(issue.assignee.full_name || issue.assignee.email)}
        </AvatarFallback>
      </Avatar>
    );
  }
  if (issue.virtual_assignee) {
    const dim = `w-${size} h-${size}`;
    const textSize = size === 4 ? "text-[7px]" : size === 5 ? "text-[8px]" : "text-[9px]";
    return (
      <div
        className={cn(dim, "rounded-full flex items-center justify-center text-white font-bold shrink-0", textSize)}
        style={{ background: issue.virtual_assignee.color }}
        title={issue.virtual_assignee.name}
      >
        {getInitials(issue.virtual_assignee.name)}
      </div>
    );
  }
  return null;
}
