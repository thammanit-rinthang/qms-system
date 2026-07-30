"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { Suspense, useEffect } from "react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const t = useT();

  const isNoM365 = reason === "no_m365_account";
  const isInsufficientRole = reason === "insufficient_role";
  const isSessionExpired = reason === "session_expired";

  useEffect(() => {
    document.title = "Unauthorized — QMS System";
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="card-premium w-full max-w-100 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-error" />

        <div className="p-5 flex flex-col items-center gap-6 text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-error/8 border border-error/15 flex items-center justify-center">
            <Lock className="h-7 w-7 text-error" />
          </div>

          {/* Text content */}
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-primary">
              {t("unauthorized.title")}
            </h1>

            {isNoM365 ? (
              <>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  {t("unauthorized.noM365")}
                </p>
                <p className="text-[11px] md:text-xs text-gray-500/70 mt-1">
                  กรุณาติดต่อฝ่าย IT เพื่อขอสิทธิ์การเข้าถึง
                </p>
              </>
            ) : isSessionExpired ? (
              <>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  เซสชันการเข้าสู่ระบบหมดอายุแล้ว / Your session has expired.
                </p>
                <p className="text-[11px] md:text-xs text-gray-500/70 mt-1">
                  กรุณาเข้าสู่ระบบใหม่ก่อนดำเนินการต่อ
                </p>
              </>
            ) : isInsufficientRole ? (
              <>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  {t("unauthorized.insufficientRole")}
                </p>
                <p className="text-[11px] md:text-xs text-gray-500/70 mt-1">
                  กรุณาติดต่อฝ่าย IT เพื่อขอปรับสิทธิ์การใช้งาน
                </p>
              </>
            ) : (
              <>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  คุณยังไม่ได้เข้าสู่ระบบ หรือ Session หมดอายุแล้ว
                </p>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                  กรุณาเข้าสู่ระบบด้วยบัญชี Microsoft 365 ขององค์กร
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full pt-1">
            {isInsufficientRole ? (
              <Button asChild className="w-full h-10 text-[13.5px]">
                <Link href="/">{t("unauthorized.goHome")}</Link>
              </Button>
            ) : (
              <Button asChild className="w-full h-10 text-[13.5px]">
                <Link href="/auth/login">เข้าสู่ระบบด้วย Microsoft 365</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="text-neutral text-[12.5px]">
              <a href="mailto:it@ndcindustrial.co.th">{t("unauthorized.contactIT")}</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm">Loading...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
