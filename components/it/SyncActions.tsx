"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { SyncResult } from "@/types/user";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

type BtnState = "idle" | "loading" | "done" | "error";

export default function SyncActions() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useState<BtnState>("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/it/sync-users", { method: "POST" });
      const json = (await res.json()) as { data: SyncResult | null; error: string | null };
      if (!res.ok || json.error) {
        setError(json.error ?? t("error"));
        setState("error");
        return;
      }
      setResult(json.data);
      setState("done");
      router.refresh();
    } catch {
      setError(t("serverError"));
      setState("error");
    }
  }

  const totalLabel = locale === "en" ? "total" : "คน รวม";

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleSync}
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          <>
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
            {t("syncing")}
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {t("syncBtn")}
          </>
        )}
      </Button>

      {state === "done" && result && (
        <p className="text-[13px] text-right text-neutral">
          {t("syncSuccess")}{" "}
          <span className="text-success font-medium">+{result.created} {t("syncCreated")}</span>
          {" · "}
          <span className="text-base-content font-medium">{result.updated} {t("syncUpdated")}</span>
          {result.skipped > 0 && (
            <>{" · "}<span className="text-warning">{result.skipped} {t("syncSkipped")}</span></>
          )}
          {" · "}{result.total} {totalLabel}
        </p>
      )}
      {state === "error" && error && (
        <p className="text-[13px] text-rose-600 text-right">{error}</p>
      )}
    </div>
  );
}
