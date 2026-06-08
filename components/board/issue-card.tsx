"use client";
import type { Issue, IssueType } from "@/types";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { getTimeStatus, getTimeInfo, TIME_STATUS_BG } from "@/lib/time-status";

const PARENT_TYPE_STYLES: Record<IssueType, { bg: string; text: string; dot: string }> = {
  epic:    { bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-400" },
  story:   { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400"   },
  task:    { bg: "bg-teal-50",    text: "text-teal-700",   dot: "bg-teal-400"   },
  subtask: { bg: "bg-yellow-50",  text: "text-yellow-700", dot: "bg-yellow-400" },
  bug:     { bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-400"    },
};

interface Props {
  issue: Issue;
  onClick: () => void;
}

export function IssueCard({ issue, onClick }: Props) {
  const status = getTimeStatus(issue);
  const timeInfo = getTimeInfo(issue);

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-md border p-3 cursor-pointer hover:shadow-sm transition-all group",
        TIME_STATUS_BG[status],
        status === "normal" && "hover:border-blue-300",
        status === "warning" && "hover:border-yellow-300",
        status === "overdue" && "hover:border-red-300",
      )}
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

        <div className="flex items-center gap-1.5">
          {/* Story points with time tracking */}
          {timeInfo ? (
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
              status === "overdue" ? "bg-red-100 text-red-600" :
              status === "warning" ? "bg-yellow-100 text-yellow-700" :
              "bg-gray-100 text-gray-500"
            )}>
              {timeInfo.pts}pt
              {status === "overdue" && (
                <span className="font-bold text-red-500"> +{timeInfo.overflow}d</span>
              )}
              {status === "warning" && (
                <span className="text-yellow-600"> {timeInfo.remaining}d left</span>
              )}
            </span>
          ) : issue.story_points != null ? (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {issue.story_points}pt
            </span>
          ) : null}

          {/* Assignee */}
          {issue.assignee && (
            <Avatar className="w-5 h-5">
              <AvatarImage src={issue.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-[8px]">
                {getInitials(issue.assignee.full_name || issue.assignee.email)}
              </AvatarFallback>
            </Avatar>
          )}
          {!issue.assignee && issue.virtual_assignee && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
              style={{ background: issue.virtual_assignee.color }}
              title={issue.virtual_assignee.name}
            >
              {getInitials(issue.virtual_assignee.name)}
            </div>
          )}
        </div>
      </div>

      {/* Date range pill */}
      {(issue.start_date || issue.due_date) && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 font-mono">
          {issue.start_date && <span>{issue.start_date}</span>}
          {issue.start_date && issue.due_date && <span>→</span>}
          {issue.due_date && <span>{issue.due_date}</span>}
        </div>
      )}

      {/* Parent badge */}
      {issue.parent && (
        <div className="mt-2">
          {(() => {
            const style = PARENT_TYPE_STYLES[(issue.parent as any).type as IssueType] ?? PARENT_TYPE_STYLES.task;
            return (
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", style.bg, style.text)}>
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
                <span className="truncate max-w-[140px]">{(issue.parent as any).key} · {(issue.parent as any).title}</span>
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}
