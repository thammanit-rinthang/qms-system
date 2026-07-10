"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  module: string;
  resourceId: string;
  resourceType: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  data: { notifications: NotificationItem[]; unreadCount: number };
}

function getResourcePath(n: NotificationItem): string | null {
  if (n.module === "CAR")   return `/car/${n.resourceId}`;
  if (n.module === "DAR") {
    if (n.resourceType === "DAR_REVIEWER")  return `/approve/dar/${n.resourceId}/reviewer`;
    if (n.resourceType === "DAR_APPROVER")  return `/approve/dar/${n.resourceId}/approver`;
    return `/dar/${n.resourceId}`;
  }
  if (n.module === "KPI")   return `/qms/kpi/${n.resourceId}`;
  if (n.module === "AUDIT") {
    if (n.resourceType === "AUDIT_APPOINTMENT") {
      if (n.title.startsWith("Signature Required"))  return `/approve/audit/appointments/${n.resourceId}/reviewer`;
      if (n.title.startsWith("Approval Required"))   return `/approve/audit/appointments/${n.resourceId}/approver`;
      return `/audit/appointments/${n.resourceId}`;
    }
    if (n.resourceType === "AUDIT_PLAN") {
      if (n.title.includes("Signature Required")) return `/approve/audit/${n.resourceId}/reviewer`;
      if (n.title.includes("Approval Required"))  return `/approve/audit/${n.resourceId}/approver`;
      return `/audit/plans/${n.resourceId}`;
    }
  }
  return null;
}

const MODULE_DOT: Record<string, string> = {
  CAR:         "bg-orange-400",
  DAR:         "bg-blue-500",
  KPI:         "bg-green-500",
  KPI_MONTHLY: "bg-emerald-500",
  AUDIT:       "bg-violet-500",
};

const MODULE_BADGE: Record<string, string> = {
  CAR:         "bg-orange-100 text-orange-700",
  DAR:         "bg-blue-100 text-blue-700",
  KPI:         "bg-green-100 text-green-700",
  KPI_MONTHLY: "bg-emerald-100 text-emerald-700",
  AUDIT:       "bg-violet-100 text-violet-700",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

// First Thai line of body (before any "\n")
function firstLine(body: string): string {
  return body.split("\n")[0] ?? body;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const notifications = data?.data?.notifications ?? [];
  const unreadCount   = data?.data?.unreadCount   ?? 0;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark all as read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="การแจ้งเตือน">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[calc(100vw-16px)] max-w-sm rounded-2xl border border-slate-100 bg-white shadow-xl outline-none sm:w-96"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#0f1059]" />
              <Link
                href="/notifications"
                className="text-sm font-bold text-slate-800 hover:text-[#0f1059]"
                onClick={() => setOpen(false)}
              >
                การแจ้งเตือน
              </Link>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-[#0f1059] hover:underline disabled:opacity-50"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <Bell className="h-8 w-8 opacity-25" />
                <p className="text-sm">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              notifications.map((n) => {
                const path = getResourcePath(n);
                return (
                  <Link
                    key={n.id}
                    href={path ? `/notifications?select=${n.id}` : "/notifications"}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                      n.isRead && "opacity-60"
                    )}
                  >
                    {/* Module color dot */}
                    <span className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      MODULE_DOT[n.module] ?? "bg-slate-400"
                    )} />

                    <div className="min-w-0 flex-1">
                      {/* Module badge + time */}
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          MODULE_BADGE[n.module] ?? "bg-slate-100 text-slate-600"
                        )}>
                          {n.module}
                        </span>
                        <span className="text-[10px] text-slate-400">{relativeTime(n.createdAt)}</span>
                      </div>
                      <p className="truncate text-xs font-semibold text-slate-800">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 leading-relaxed">
                        {firstLine(n.body)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!n.isRead && (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f1059]" />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-[#0f1059] hover:underline"
            >
              ดูการแจ้งเตือนทั้งหมด →
            </Link>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
