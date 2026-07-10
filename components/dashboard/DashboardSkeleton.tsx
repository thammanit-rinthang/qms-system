export default function DashboardSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-5 pb-10">
      {/* Hero Skeleton */}
      <div className="skeleton w-full h-[180px] rounded-xl bg-slate-200"></div>

      {/* Role Strip Skeleton */}
      <div className="skeleton w-full h-14 rounded-xl bg-slate-200"></div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl bg-slate-200"></div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 8 cols */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Announcements Skeleton */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="skeleton h-5 w-40 bg-slate-200"></div>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="skeleton w-12 h-12 rounded bg-slate-200 shrink-0"></div>
                  <div className="flex flex-col gap-2 w-full">
                    <div className="skeleton h-4 w-3/4 bg-slate-200"></div>
                    <div className="skeleton h-3 w-1/4 bg-slate-200"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Skeleton */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="skeleton h-5 w-48 bg-slate-200"></div>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="skeleton h-4 w-2/3 bg-slate-200"></div>
                  <div className="skeleton h-6 w-16 bg-slate-200 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* KPI Widget Skeleton */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden p-5">
            <div className="skeleton h-5 w-32 bg-slate-200 mb-6"></div>
            <div className="flex justify-center mb-6">
              {/* Fake donut chart center */}
              <div className="skeleton w-32 h-32 rounded-full bg-slate-200"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="skeleton h-16 rounded bg-slate-200"></div>
              <div className="skeleton h-16 rounded bg-slate-200"></div>
            </div>
          </div>

          {/* Side Widget 2 */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden p-5">
            <div className="skeleton h-5 w-40 bg-slate-200 mb-4"></div>
            <div className="flex flex-col gap-3">
              <div className="skeleton h-12 w-full bg-slate-200 rounded"></div>
              <div className="skeleton h-12 w-full bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
