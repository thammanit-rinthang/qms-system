interface DetailSnapshot {
  achievedStatus: "OK" | "NOT_OK" | "PENDING";
}

export default function OkRatioBar({ details }: { details: DetailSnapshot[] }) {
  const total = details.length;
  if (total === 0) return <span className="text-xs text-slate-400">—</span>;

  const ok = details.filter((d) => d.achievedStatus === "OK").length;
  const notOk = details.filter((d) => d.achievedStatus === "NOT_OK").length;
  const pct = Math.round((ok / total) * 100);

  return (
    <div className="flex min-w-20 flex-col gap-1">
      <div className="flex items-center justify-between gap-1 text-xs">
        <span className="font-semibold text-emerald-600">{ok}</span>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-rose-500">{notOk}</span>
        <span className="ml-auto text-slate-400">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
