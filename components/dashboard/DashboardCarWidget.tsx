"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import type { DarAttachment } from "@/generated/prisma/client";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

interface AttachmentsWidgetProps { recentAttachments: DarAttachment[] }

interface CarSummary {
  id: string;
  carNo: string;
  targetDepartmentName: string;
  responseDueAt: string | null;
  status: string;
}

export function DashboardCarWidget() {
  const t = useT();
  const locale = useLocale();

  const { data, isLoading, isError } = useQuery<{ data: CarSummary[]; meta: { total: number } }>({
    queryKey: ["cars", "dashboard-widget"],
    queryFn: async () => {
      const res = await fetch("/api/car?scope=my-department&status=ISSUED&limit=5");
      if (!res.ok) throw new Error("Failed to load CARs");
      return res.json();
    },
    staleTime: 60_000,
  });

  const cars = data?.data ?? [];

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-primary flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          CAR
        </h2>
      </div>
      <div className="p-5 flex flex-col gap-2">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        )}
        {isError && (
          <p className="text-[11px] text-gray-400 text-center py-3">{t("common.error")}</p>
        )}
        {!isLoading && !isError && cars.length === 0 && (
          <p className="text-[11px] text-gray-400 text-center py-3">{t("car.list.empty")}</p>
        )}
        {!isLoading && !isError && cars.map((car) => {
          const due = car.responseDueAt ? new Date(car.responseDueAt) : null;
          const isOverdue = due && due < new Date();
          return (
            <Link
              key={car.id}
              href={`/car/${car.id}`}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral truncate">{car.targetDepartmentName}</p>
                {due && (
                  <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-rose-500 font-medium" : "text-gray-400"}`}>
                    {t("dashboard.carWidget.dueLabel")}: {due.toLocaleDateString(locale === "th" ? "th-TH" : "en-US")}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                isOverdue
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : "bg-warning/10 text-warning border border-warning/20"
              }`}>
                {isOverdue ? t("car.status.overdue") : t("dashboard.carWidget.openStatus")}
              </span>
            </Link>
          );
        })}
        {!isLoading && !isError && (data?.meta?.total ?? 0) > 5 && (
          <Link href="/car" className="text-[11px] text-primary text-center pt-1 hover:underline">
            {t("common.viewAll")} ({data?.meta?.total})
          </Link>
        )}
      </div>
    </div>
  );
}

export function DashboardAttachmentsWidget({ recentAttachments }: AttachmentsWidgetProps) {
  const t = useT();
  const locale = useLocale();

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-primary">{t("dashboard.carWidget.recentDocsTitle")}</h2>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {recentAttachments.length > 0 ? recentAttachments.map((doc) => (
          <a
            key={doc.id}
            href={doc.spWebUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-2.5 items-start group hover:bg-white rounded-lg transition-colors p-1 -m-1"
          >
            <div className="mt-0.5 shrink-0">
              {doc.fileName.toLowerCase().endsWith(".pdf") ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                {doc.fileName}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {new Date(doc.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US")}
              </p>
            </div>
          </a>
        )) : (
          <p className="text-xs text-gray-400 text-center py-3">
            {t("dashboard.carWidget.recentDocsEmpty")}
          </p>
        )}
      </div>
    </div>
  );
}
