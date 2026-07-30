"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

export default function DistributionDownloadButton({ darMasterId, distributionId, fileNamePrefix }: { darMasterId: string; distributionId: string; fileNamePrefix: string }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null); setDownloading(true);
    try {
      const res = await fetch(`/api/dar/${darMasterId}/distribution/${distributionId}/download`);
      if (!res.ok) { const json = await res.json().catch(() => null); throw new Error(json?.error || "ดาวน์โหลดไม่สำเร็จ"); }
      const blob = await res.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `${fileNamePrefix}.pdf`; anchor.click(); URL.revokeObjectURL(url); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "ดาวน์โหลดไม่สำเร็จ"); }
    finally { setDownloading(false); }
  }

  return <div className="flex flex-col items-end gap-1">
    <button type="button" onClick={handleDownload} disabled={downloading} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F1059] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#161875] disabled:opacity-60">
      <Download className="h-3.5 w-3.5" />{downloading ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด"}
    </button>
    {error && <p className="text-[11px] text-rose-600">{error}</p>}
  </div>;
}
