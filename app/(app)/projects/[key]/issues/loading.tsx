import { Skeleton } from "@/components/ui/skeleton";

export default function IssuesLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        {/* Rows */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-1.5 w-24 shrink-0">
              <Skeleton className="w-4 h-4 rounded-sm" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3.5 flex-1" style={{ width: `${55 + (i % 4) * 10}%` }} />
            <Skeleton className="h-5 w-20 rounded-full shrink-0" />
            <div className="flex items-center gap-1.5 w-20 shrink-0">
              <Skeleton className="w-3 h-3 rounded-sm" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex items-center gap-1.5 w-28 shrink-0">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
