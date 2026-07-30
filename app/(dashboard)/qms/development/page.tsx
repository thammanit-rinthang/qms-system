"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import {
  FileCode2,
  Calendar,
  Search,
  CheckCircle2,
  Bug,
  Sparkles,
  GitCommit,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Layers3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LogItem {
  id: string;
  titleTh: string;
  titleEn: string;
  date: string;
  type: "feature" | "bugfix" | "improvement";
  commit: string;
  detailsTh: string[];
  detailsEn: string[];
}

const LABELS = {
  th: {
    title: "บันทึกการพัฒนาและปรับปรุงระบบ",
    subtitle: "ประวัติการอัปเดตฟีเจอร์ แก้ไขบั๊ก และรายละเอียดการเปลี่ยนแปลงของแอปพลิเคชัน QMS",
    searchPlaceholder: "ค้นหาหัวข้อหรือรายละเอียด...",
    all: "ทั้งหมด",
    feature: "ฟีเจอร์ใหม่",
    bugfix: "แก้ไขบั๊ก",
    improvement: "ปรับปรุงระบบ",
    commitHash: "รหัสบันทึก (Commit)",
    noLogs: "ไม่พบข้อมูลการอัปเดต",
    latestDeploy: "รอบการอัปเดตล่าสุด",
    loading: "กำลังโหลดข้อมูล...",
    error: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
  },
  en: {
    title: "Development Logs & Changelog",
    subtitle: "History of new features, bug fixes, and system improvements implemented in QMS System",
    searchPlaceholder: "Search logs or details...",
    all: "All",
    feature: "Features",
    bugfix: "Bug Fixes",
    improvement: "Improvements",
    commitHash: "Commit Hash",
    noLogs: "No update logs found",
    latestDeploy: "Latest Deployment",
    loading: "Loading logs...",
    error: "Failed to load changelogs",
  },
};

export default function DevelopmentLogsPage() {
  const locale = useLocale() as "th" | "en";
  const text = LABELS[locale];

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const res = await fetch("/api/development-logs");
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const needle = search.toLowerCase();
    const matchesSearch =
      needle === "" ||
      log.titleTh.toLowerCase().includes(needle) ||
      log.titleEn.toLowerCase().includes(needle) ||
      log.detailsTh.some((detail) => detail.toLowerCase().includes(needle)) ||
      log.detailsEn.some((detail) => detail.toLowerCase().includes(needle));

    const matchesType = filterType === "all" || log.type === filterType;
    return matchesSearch && matchesType;
  });

  const typeCounts = filteredLogs.reduce(
    (acc, log) => {
      acc[log.type] += 1;
      return acc;
    },
    { feature: 0, bugfix: 0, improvement: 0 } as Record<LogItem["type"], number>,
  );

  const summaryCards = [
    { label: text.all, value: logs.length, icon: Layers3 },
    { label: "Visible", value: filteredLogs.length, icon: Search },
    { label: text.bugfix, value: typeCounts.bugfix, icon: Bug },
    { label: text.feature, value: typeCounts.feature, icon: Sparkles },
  ];

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "feature":
        return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "bugfix":
        return "bg-rose-50 text-rose-600 border border-rose-100";
      case "improvement":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      default:
        return "bg-slate-50 text-slate-600 border border-slate-100";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <Sparkles className="h-4 w-4" />;
      case "bugfix":
        return <Bug className="h-4 w-4" />;
      case "improvement":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <FileCode2 className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => text[type as keyof typeof text] || type;

  return (
    <div className="mx-auto w-full max-w-7xl pb-12">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,16,89,0.06)]">
        <div className="bg-gradient-to-r from-[#0F1059] to-[#161875] px-5 py-6 text-white md:px-8 md:py-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/90">
                <FileCode2 className="h-3.5 w-3.5" />
                QMS DEVELOPMENT LOGS
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{text.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/75 md:text-base">{text.subtitle}</p>
            </div>
            {!loading && !error && logs.length > 0 && (
              <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur">
                <Calendar className="h-4 w-4 text-white/75" />
                <span>
                  {text.latestDeploy}:{" "}
                  {new Date(logs[0].date).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 md:p-5">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={loading}
                      placeholder={text.searchPlaceholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition-all focus:border-[#0F1059] focus:bg-white focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                    {["all", "feature", "bugfix", "improvement"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        disabled={loading}
                        className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                          filterType === type
                            ? "border-[#0F1059] bg-[#0F1059] text-white shadow-sm shadow-indigo-950/20"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        } disabled:opacity-50`}
                      >
                        {type === "all" ? text.all : getTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {!loading && !error && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.label} className="border-slate-200 shadow-sm">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-[#0F1059]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">{item.label}</p>
                          <p className="text-xl font-bold text-slate-900">{item.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-slate-200 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="h-5 w-36 rounded-lg bg-slate-100" />
                          <div className="h-6 w-3/4 rounded-lg bg-slate-100" />
                          <div className="space-y-2 pt-1">
                            <div className="h-4 w-full rounded-md bg-slate-100" />
                            <div className="h-4 w-5/6 rounded-md bg-slate-100" />
                          </div>
                        </div>
                        <div className="h-9 w-24 rounded-lg bg-slate-100" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm font-semibold text-rose-600">
                <Bug className="mx-auto mb-2 h-10 w-10 text-rose-400" />
                {text.error}: {error}
              </div>
            )}

            {!loading && !error && (
              filteredLogs.length === 0 ? (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                    <FileCode2 className="mb-3 h-12 w-12 opacity-40" />
                    <p className="text-sm font-medium">{text.noLogs}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log, index) => {
                    const formattedDate = new Date(log.date).toLocaleDateString(
                      locale === "th" ? "th-TH" : "en-US",
                      { day: "2-digit", month: "long", year: "numeric" },
                    );
                    const timelineKey = `${log.date}-${log.commit}-${log.id}-${index}`;

                    return (
                      <Card key={timelineKey} className="border-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,16,89,0.08)]">
                        <CardContent className="p-0">
                          <div className="grid gap-0 lg:grid-cols-[12px_minmax(0,1fr)]">
                            <div
                              className={`hidden rounded-l-2xl lg:block ${
                                log.type === "feature"
                                  ? "bg-emerald-500"
                                  : log.type === "bugfix"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                              }`}
                            />
                            <div className="p-5 md:p-6">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${getBadgeClass(log.type)}`}>
                                    {getIcon(log.type)}
                                    {getTypeLabel(log.type)}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {formattedDate}
                                  </span>
                                </div>

                                <a
                                  href={`https://github.com/ndc-industrialco/qms-system/commit/${log.commit}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-500 transition-colors hover:border-[#0F1059] hover:text-[#0F1059]"
                                >
                                  <GitCommit className="h-3.5 w-3.5" />
                                  {log.commit}
                                  <ArrowUpRight className="h-3 w-3 opacity-60" />
                                </a>
                              </div>

                              <h3 className="mt-3 text-base font-bold leading-snug text-slate-900">
                                {locale === "th" ? log.titleTh : log.titleEn}
                              </h3>

                              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                                {(locale === "th" ? log.detailsTh : log.detailsEn).map((detail, idx) => (
                                  <li
                                    key={idx}
                                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm leading-relaxed text-slate-600"
                                  >
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm xl:sticky xl:top-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <BarChart3 className="h-4 w-4 text-[#0F1059]" />
                  Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: "Latest build",
                    value: logs[0]
                      ? new Date(logs[0].date).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-",
                  },
                  { label: "Visible items", value: String(filteredLogs.length) },
                  { label: "Bugfix items", value: String(typeCounts.bugfix) },
                  { label: "Feature items", value: String(typeCounts.feature) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <span className="text-xs font-medium text-slate-500">{item.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm xl:sticky xl:top-[22rem]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Layers3 className="h-4 w-4 text-[#0F1059]" />
                  Quick filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["all", "feature", "bugfix", "improvement"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    disabled={loading}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                      filterType === type
                        ? "border-[#0F1059] bg-[#0F1059] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    } disabled:opacity-50`}
                  >
                    <span className="font-medium">{type === "all" ? text.all : getTypeLabel(type)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        filterType === type ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {type === "all"
                        ? logs.length
                        : type === "feature"
                          ? typeCounts.feature
                          : type === "bugfix"
                            ? typeCounts.bugfix
                            : typeCounts.improvement}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
