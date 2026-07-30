"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  RefreshCw,
  Cpu,
  Database,
  Network,
  Clock,
  Terminal,
} from "lucide-react";

interface SystemInfoData {
  system: {
    gitCommitSha: string;
    buildTime: string;
    nodeVersion: string;
    platform: string;
    env: string;
  };
  services: {
    database: {
      status: string;
      latencyMs: number;
      error: string | null;
    };
    redis: {
      status: string;
      latencyMs: number;
      error: string | null;
    };
    sharepoint: {
      status: string;
      latencyMs: number;
      error: string | null;
    };
  };
  user: {
    id: string;
    name: string;
    role: string;
  };
}

const LABELS = {
  th: {
    title: "สถานะและข้อมูลระบบ",
    subtitle: "หน้าตรวจสอบสถานะเซิร์ฟเวอร์และการเชื่อมต่อระบบหลังบ้าน QMS",
    gitSha: "รหัส Git Commit SHA",
    buildTime: "เวลาที่ทำการ Build",
    nodeVersion: "เวอร์ชัน Node.js",
    platform: "ระบบปฏิบัติการ",
    env: "โหมดสภาพแวดล้อม",
    dbStatus: "ฐานข้อมูลหลัก (PostgreSQL)",
    redisStatus: "ฐานข้อมูลความเร็วสูง (Redis)",
    spStatus: "การเชื่อมต่อ Microsoft SharePoint",
    latency: "ความเร็วการตอบสนอง",
    connected: "เชื่อมต่อสำเร็จ",
    disconnected: "การเชื่อมต่อล้มเหลว",
    refresh: "ทดสอบการเชื่อมต่อใหม่",
    developerTools: "ข้อมูลเซิร์ฟเวอร์และสภาพแวดล้อม (Server Info)",
    errorDetails: "รายละเอียดข้อผิดพลาด (Error Logs)",
    activeUser: "ผู้ดำเนินการตรวจสอบ",
  },
  en: {
    title: "System Info & Connectivity",
    subtitle: "Verify QMS server status and backend integrations health in real-time",
    gitSha: "Git Commit SHA",
    buildTime: "Build Timestamp",
    nodeVersion: "Node.js Version",
    platform: "Operating System",
    env: "Environment Mode",
    dbStatus: "Primary Database (PostgreSQL)",
    redisStatus: "High-Speed Cache (Redis)",
    spStatus: "Microsoft SharePoint Integration",
    latency: "Response Latency",
    connected: "Connected",
    disconnected: "Disconnected",
    refresh: "Test Connections Again",
    developerTools: "Server & Environment Information",
    errorDetails: "Error Details & Logs",
    activeUser: "Inspected By",
  },
};

export default function SystemInfoPage() {
  const locale = useLocale() as "th" | "en";
  const text = LABELS[locale === "th" ? "th" : "en"];

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SystemInfoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system-info");
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "ไม่มีสิทธิ์เข้าถึงหน้านี้ (IT/QMS/MR Only)"
            : "ไม่สามารถดึงข้อมูลระบบได้"
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0F1059] to-[#1d1f7c] text-white rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-sky-400 animate-pulse" />
              {text.title}
            </h1>
            <p className="text-slate-200/90 text-sm mt-2">{text.subtitle}</p>
          </div>
          <Button
            onClick={fetchSystemInfo}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl h-11 px-5 flex items-center gap-2 transition-all font-semibold shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {text.refresh}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h2 className="text-rose-800 font-bold text-lg">พบข้อผิดพลาด</h2>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
          <Button onClick={fetchSystemInfo} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
            {text.refresh}
          </Button>
        </div>
      ) : loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 h-48 animate-pulse flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-100 rounded" />
              <div className="h-8 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Services Connectivity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Database Card */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 p-6 flex flex-col justify-between group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F1059]/10 text-[#0F1059] flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug">{text.dbStatus}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">PostgreSQL Node</p>
                  </div>
                </div>
                {data.services.database.status === "CONNECTED" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    {text.connected}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {text.disconnected}
                  </span>
                )}
              </div>

              <div className="my-6">
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {text.latency}
                  </span>
                  <span className="text-[#0F1059] text-lg font-bold">
                    {data.services.database.status === "CONNECTED" ? `${data.services.database.latencyMs} ms` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0F1059] h-full rounded-full transition-all duration-500"
                    style={{
                      width: data.services.database.status === "CONNECTED"
                        ? `${Math.min(100, Math.max(8, (data.services.database.latencyMs / 200) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              {data.services.database.error && (
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 mt-2 text-rose-700 text-xs">
                  <p className="font-semibold mb-1">{text.errorDetails}:</p>
                  <pre className="font-mono overflow-x-auto max-w-full">{data.services.database.error}</pre>
                </div>
              )}
            </div>

            {/* Redis Card */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 p-6 flex flex-col justify-between group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug">{text.redisStatus}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">ioredis client</p>
                  </div>
                </div>
                {data.services.redis.status === "CONNECTED" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    {text.connected}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {text.disconnected}
                  </span>
                )}
              </div>

              <div className="my-6">
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {text.latency}
                  </span>
                  <span className="text-rose-600 text-lg font-bold">
                    {data.services.redis.status === "CONNECTED" ? `${data.services.redis.latencyMs} ms` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: data.services.redis.status === "CONNECTED"
                        ? `${Math.min(100, Math.max(8, (data.services.redis.latencyMs / 50) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              {data.services.redis.error && (
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 mt-2 text-rose-700 text-xs">
                  <p className="font-semibold mb-1">{text.errorDetails}:</p>
                  <pre className="font-mono overflow-x-auto max-w-full">{data.services.redis.error}</pre>
                </div>
              )}
            </div>

            {/* SharePoint Card */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 p-6 flex flex-col justify-between group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug">{text.spStatus}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">MS Graph API v1.0</p>
                  </div>
                </div>
                {data.services.sharepoint.status === "CONNECTED" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    {text.connected}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {text.disconnected}
                  </span>
                )}
              </div>

              <div className="my-6">
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {text.latency}
                  </span>
                  <span className="text-sky-600 text-lg font-bold">
                    {data.services.sharepoint.status === "CONNECTED" ? `${data.services.sharepoint.latencyMs} ms` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: data.services.sharepoint.status === "CONNECTED"
                        ? `${Math.min(100, Math.max(8, (data.services.sharepoint.latencyMs / 1000) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              {data.services.sharepoint.error && (
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 mt-2 text-rose-700 text-xs">
                  <p className="font-semibold mb-1">{text.errorDetails}:</p>
                  <pre className="font-mono overflow-x-auto max-w-full">{data.services.sharepoint.error}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Environment & Metadata details */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
            <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Terminal className="w-5 h-5 text-[#0F1059]" />
              {text.developerTools}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Git Commit SHA */}
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{text.gitSha}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-lg select-all">
                    {data.system.gitCommitSha}
                  </span>
                </div>
              </div>

              {/* Build Time */}
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{text.buildTime}</span>
                <span className="text-slate-800 text-sm font-semibold mt-1">
                  {data.system.buildTime}
                </span>
              </div>

              {/* Node.js Version */}
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{text.nodeVersion}</span>
                <span className="text-slate-800 text-sm font-semibold mt-1">
                  {data.system.nodeVersion} ({data.system.platform})
                </span>
              </div>

              {/* Environment mode */}
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{text.env}</span>
                <span className="text-slate-800 text-sm font-semibold mt-1 capitalize">
                  {data.system.env}
                </span>
              </div>

              {/* Active Inspected User */}
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100 md:col-span-2">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{text.activeUser}</span>
                <span className="text-slate-800 text-sm font-semibold mt-1">
                  {data.user.name} ({data.user.role})
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
