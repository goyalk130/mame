import { Skeleton } from "@/components/ui/skeleton";

export default function BacklogLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* Sprint blocks */}
      {[4, 3, 5].map((count, i) => (
        <div key={i} className="mb-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-4 rounded" />
              <Skeleton className="h-7 w-20 rounded" />
              <Skeleton className="h-7 w-24 rounded" />
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: count }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="w-3 h-3 rounded" />
                <Skeleton className="w-4 h-4 rounded-sm" />
                <Skeleton className="w-4 h-4 rounded-sm" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="w-5 h-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Backlog block */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-20 rounded" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="w-3 h-3 rounded" />
              <Skeleton className="w-4 h-4 rounded-sm" />
              <Skeleton className="w-4 h-4 rounded-sm" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="w-5 h-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
