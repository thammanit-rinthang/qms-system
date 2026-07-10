import { Skeleton } from "@/components/ui/skeleton";

export function ApproveSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-3 animate-pulse">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-8 w-1/2 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="h-10 bg-slate-50 border border-slate-100 rounded-xl w-full animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 animate-pulse">
              <Skeleton className="h-4 w-1/4 rounded" />
              <Skeleton className="h-4 w-1/4 rounded" />
              <Skeleton className="h-4 w-1/6 rounded" />
              <Skeleton className="h-9 w-20 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
