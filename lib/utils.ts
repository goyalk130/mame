import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { IssueStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the Tailwind classes for a status badge pill.
 * Used by backlog-view, issues-list-view, and issue-detail-panel.
 */
export function statusBadgeClass(status: IssueStatus | string): string {
  switch (status) {
    case "completed":  return "bg-emerald-100 text-emerald-700";
    case "done":       return "bg-green-100 text-green-700";
    case "not_done":   return "bg-orange-100 text-orange-700";
    case "blocked":    return "bg-red-100 text-red-700";
    case "in_progress":return "bg-blue-100 text-blue-700";
    case "in_review":  return "bg-yellow-100 text-yellow-700";
    case "triage":     return "bg-purple-100 text-purple-700";
    default:           return "bg-gray-100 text-gray-600";
  }
}

/**
 * Returns the initials (up to 2 chars) for a display name or email string.
 */
export function getInitials(nameOrEmail: string | null | undefined): string {
  return (nameOrEmail || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
