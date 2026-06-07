import { Skeleton } from "@/components/ui/skeleton";

export default function BoardLoading() {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Board columns */}
      <div className="flex gap-3 p-4 flex-1 overflow-hidden">
        {[
          ["Triage", "To Do"],
          ["In Progress"],
          ["In Review", "Blocked"],
          ["Done", "Not Done"],
        ].map((labels, gi) => (
          <div key={gi} className="w-72 flex flex-col gap-2 shrink-0">
            {labels.map((label) => (
              <div key={label} className="flex flex-col rounded-lg bg-gray-100 overflow-hidden flex-1">
                {/* Column header */}
                <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-200 bg-gray-100 shrink-0">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-6 rounded-full" />
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2">
                  {Array.from({ length: gi === 0 ? 3 : gi === 1 ? 4 : 2 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-4 h-4 rounded-sm" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <div className="flex items-center justify-between pt-1">
                        <Skeleton className="h-4 w-12 rounded-full" />
                        <Skeleton className="w-5 h-5 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
