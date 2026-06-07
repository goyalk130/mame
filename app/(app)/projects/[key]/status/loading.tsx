import { Skeleton } from "@/components/ui/skeleton";

export default function StatusLoading() {
  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Row 1: 3 cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Progress ring card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center gap-3">
            <Skeleton className="h-3 w-28 self-start" />
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* By Type */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <Skeleton className="h-3 w-16" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-2 h-2 rounded-sm" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
          {/* By Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <Skeleton className="h-3 w-16" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-6" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Issues per person */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 flex-1 rounded" />
              <Skeleton className="h-3 w-4" />
            </div>
          ))}
        </div>

        {/* Row 3: Team cards */}
        <div>
          <Skeleton className="h-4 w-36 mb-3" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <div className="flex gap-1 flex-wrap">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
