"use client";

import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export default function ErrorComponent({ message, onRetry }: Props) {
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm md:text-base font-bold text-primary">{t("errorTitle")}</p>
        <p className="text-xs md:text-sm text-gray-500 max-w-sm">{message ?? t("errorRetry")}</p>
      </div>

      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm" className="mt-1">
          {t("errorRetryBtn")}
        </Button>
      )}
    </div>
  );
}
