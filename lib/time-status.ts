import type { Issue } from "@/types";

export type TimeStatus = "overdue" | "warning" | "normal" | "late_done" | "on_time_done";

const DONE_STATUSES = ["done", "completed"] as const;

export function getTimeStatus(issue: Issue): TimeStatus {
  const isDone = DONE_STATUSES.includes(issue.status as any);

  if (isDone) {
    if (!issue.completed_at || !issue.due_date) return "normal";
    return dateOnly(issue.completed_at) > dateOnly(issue.due_date) ? "late_done" : "on_time_done";
  }

  if (!issue.due_date) return "normal";

  const today = todayDate();
  const due = dateOnly(issue.due_date);

  // Past due date → overdue
  if (today > due) return "overdue";

  // Not enough time left vs story points estimate → warning
  if (issue.story_points) {
    const daysLeft = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
    if (daysLeft < issue.story_points) return "warning";
  }

  return "normal";
}

export function getTimeInfo(issue: Issue): {
  pts: number;
  daysOverdue: number;
  daysLeft: number;
  daysLate?: number;
} | null {
  const isDone = DONE_STATUSES.includes(issue.status as any);

  if (isDone && issue.completed_at && issue.due_date) {
    const completedDay = dateOnly(issue.completed_at);
    const dueDay = dateOnly(issue.due_date);
    const daysLate = Math.floor((completedDay.getTime() - dueDay.getTime()) / 86_400_000);
    return { pts: issue.story_points ?? 0, daysOverdue: 0, daysLeft: 0, daysLate };
  }

  if (!issue.due_date) return issue.story_points != null ? { pts: issue.story_points, daysOverdue: 0, daysLeft: 0 } : null;

  const today = todayDate();
  const due = dateOnly(issue.due_date);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000);

  return {
    pts: issue.story_points ?? 0,
    daysOverdue: diff < 0 ? -diff : 0,
    daysLeft: diff > 0 ? diff : 0,
  };
}

function dateOnly(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const TIME_STATUS_BG: Record<TimeStatus, string> = {
  overdue:      "bg-red-50 border-red-200",
  warning:      "bg-yellow-50 border-yellow-200",
  normal:       "bg-white border-gray-200",
  late_done:    "bg-white border-gray-200",
  on_time_done: "bg-white border-gray-200",
};
