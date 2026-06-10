"use client";
import type { Issue, IssueType } from "@/types";
import { IssueTypeIcon, PriorityIcon } from "@/components/ui/issue-icons";
import { cn } from "@/lib/utils";
import { AssigneeAvatars } from "@/components/ui/assignee-avatars";
import { getTimeStatus, getTimeInfo, TIME_STATUS_BG } from "@/lib/time-status";

const PARENT_TYPE_STYLES: Record<IssueType, { bg: string; text: string; dot: string }> = {
  epic:    { bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-500" },
  story:   { bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  task:    { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  subtask: { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
  bug:     { bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500"    },
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
        "rounded-md border px-2.5 py-2 cursor-pointer hover:shadow-sm transition-all group overflow-hidden",
        TIME_STATUS_BG[status],
        status === "normal" && "hover:border-blue-300",
        status === "warning" && "hover:border-yellow-300",
        status === "overdue" && "hover:border-red-300",
      )}
    >
      <div className="text-[12.5px] text-gray-900 font-medium leading-snug mb-1.5 line-clamp-2">
        {issue.title}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <IssueTypeIcon type={issue.type} />
          <PriorityIcon priority={issue.priority} />
          <span className="text-[10px] text-gray-400 font-mono">{issue.key}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Story points with time tracking */}
          {timeInfo ? (
            <span className={cn(
              "text-[10px] font-medium px-1 py-0.5 rounded-full flex items-center gap-0.5",
              status === "overdue"      ? "bg-red-100 text-red-600" :
              status === "warning"      ? "bg-yellow-100 text-yellow-700" :
              status === "late_done"    ? "bg-red-50 text-red-400" :
              status === "on_time_done" ? "bg-green-50 text-green-600" :
              "bg-gray-100 text-gray-500"
            )}>
              {status === "late_done" ? (
                <>✓ {timeInfo.daysLate}d late</>
              ) : status === "on_time_done" ? (
                <>✓ on time</>
              ) : status === "overdue" ? (
                <>{timeInfo.pts}pt +{timeInfo.daysOverdue}d</>
              ) : status === "warning" ? (
                <>{timeInfo.pts}pt · {timeInfo.daysLeft}d left</>
              ) : (
                <>{timeInfo.pts}pt</>
              )}
            </span>
          ) : issue.story_points != null ? (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded-full">
              {issue.story_points}pt
            </span>
          ) : null}

          {/* Assignees (multi) */}
          <AssigneeAvatars issue={issue} size={4} />
        </div>
      </div>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {issue.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center text-[9px] font-semibold text-white px-1.5 py-0.5 rounded-full"
              style={{ background: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Date range */}
      {(issue.start_date || issue.due_date) && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 font-mono">
          {issue.start_date && <span>{issue.start_date}</span>}
          {issue.start_date && issue.due_date && <span>→</span>}
          {issue.due_date && <span>{issue.due_date}</span>}
        </div>
      )}

      {/* Parent badge — full width bar at bottom */}
      {issue.parent && (issue.parent as any).key && (() => {
        const style = PARENT_TYPE_STYLES[(issue.parent as any).type as IssueType] ?? PARENT_TYPE_STYLES.task;
        return (
          <div className={cn("mt-2 -mx-2.5 -mb-2 px-2.5 py-1.5 flex items-center gap-1.5", style.bg)}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
            <span className={cn("text-[10px] font-medium truncate", style.text)}>
              {(issue.parent as any).key} · {(issue.parent as any).title}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
