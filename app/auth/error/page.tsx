
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication Error",
};

type SearchParams = Promise<{ error?: string }>;

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  const errorMessages: Record<string, { th: string; en: string }> = {
    AccessDenied: {
      th: "ถูกปฏิเสธการเข้าถึง — บัญชีของคุณไม่ได้รับอนุญาตให้เข้าใช้ระบบนี้",
      en: "Access denied — your account is not authorized to use this system",
    },
    Configuration: {
      th: "เกิดข้อผิดพลาดในการตั้งค่าระบบ กรุณาติดต่อ IT",
      en: "System configuration error. Please contact IT",
    },
    Default: {
      th: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      en: "An error occurred during sign in",
    },
  };

  const msg = errorMessages[error ?? "Default"] ?? errorMessages["Default"];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="card-premium p-5 w-full max-w-md">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="text-error">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">เข้าสู่ระบบไม่สำเร็จ</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-2">{msg.th}</p>
            <p className="text-[11px] md:text-xs text-gray-500 mt-1">{msg.en}</p>
          </div>
          <Button asChild className="w-full">
            <Link href="/auth/login">ลองอีกครั้ง</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
