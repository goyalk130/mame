import { cn } from "@/lib/utils";
import type { IssueType, IssuePriority } from "@/types";

export function IssueTypeIcon({ type, className }: { type: IssueType; className?: string }) {
  const base = cn("inline-flex items-center justify-center rounded text-white text-[10px] font-bold w-4 h-4 shrink-0", className);
  switch (type) {
    case "epic": return <span className={cn(base, "bg-purple-500")}>E</span>;
    case "story": return <span className={cn(base, "bg-green-500")}>S</span>;
    case "task": return <span className={cn(base, "bg-blue-500")}>T</span>;
    case "bug": return <span className={cn(base, "bg-red-500")}>B</span>;
    case "subtask": return <span className={cn(base, "bg-blue-300")}>↳</span>;
  }
}

export function PriorityIcon({ priority, className }: { priority: IssuePriority; className?: string }) {
  const base = cn("w-4 h-4 shrink-0", className);
  switch (priority) {
    case "highest": return <svg className={cn(base, "text-red-500")} viewBox="0 0 16 16" fill="currentColor"><path d="M8 2l6 12H2L8 2z"/></svg>;
    case "high": return <svg className={cn(base, "text-orange-500")} viewBox="0 0 16 16" fill="currentColor"><path d="M8 3l5 10H3L8 3z"/></svg>;
    case "medium": return <svg className={cn(base, "text-yellow-500")} viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="6" width="12" height="2" rx="1"/><rect x="2" y="9" width="12" height="2" rx="1"/></svg>;
    case "low": return <svg className={cn(base, "text-blue-400")} viewBox="0 0 16 16" fill="currentColor"><path d="M8 13L3 3h10L8 13z"/></svg>;
    case "lowest": return <svg className={cn(base, "text-blue-300")} viewBox="0 0 16 16" fill="currentColor"><path d="M8 14L2 4h12L8 14z"/></svg>;
  }
}
