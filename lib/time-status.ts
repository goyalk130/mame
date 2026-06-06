import type { Issue } from "@/types";

export type TimeStatus = "overdue" | "warning" | "normal";

/**
 * Compare days elapsed since start_date against story_points budget.
 *
 * - "overdue"  → elapsed > story_points  (pastel red)
 * - "warning"  → elapsed >= story_points * 0.75  (pastel yellow)
 * - "normal"   → fine, no tint
 *
 * Returns "normal" for done issues or when start_date / story_points are missing.
 */
export function getTimeStatus(issue: Issue): TimeStatus {
  if (!issue.start_date || !issue.story_points || issue.status === "done") return "normal";
  const elapsed = daysElapsed(issue.start_date);
  if (elapsed > issue.story_points) return "overdue";
  if (elapsed >= issue.story_points * 0.75) return "warning";
  return "normal";
}

/**
 * Returns { pts, overflow, remaining } for rendering.
 * overflow > 0  → days over budget (show in red)
 * remaining > 0 → days left in budget
 */
export function getTimeInfo(issue: Issue): {
  pts: number;
  overflow: number;
  remaining: number;
  elapsed: number;
} | null {
  if (!issue.start_date || !issue.story_points) return null;
  const elapsed = daysElapsed(issue.start_date);
  const overflow = elapsed - issue.story_points;
  const remaining = issue.story_points - elapsed;
  return { pts: issue.story_points, overflow, remaining, elapsed };
}

function daysElapsed(dateStr: string): number {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000);
}

/** Tailwind classes for card/row background tint */
export const TIME_STATUS_BG: Record<TimeStatus, string> = {
  overdue: "bg-red-50 border-red-200",
  warning: "bg-yellow-50 border-yellow-200",
  normal:  "bg-white border-gray-200",
};
