"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useT, type TranslationKey } from "@/lib/i18n";

type Props = {
  /** Primary heading displayed on the left */
  title?: string;
  titleKey?: TranslationKey;
  titleParams?: Record<string, string | number>;
  /** Optional secondary line below the title (e.g. record count, breadcrumb) */
  subtitle?: string;
  subtitleKey?: TranslationKey;
  subtitleParams?: Record<string, string | number>;
  /** Buttons / controls rendered on the right */
  actions?: ReactNode;
  className?: string;
};

/**
 * Standard page header — title + optional subtitle on the left, action buttons on the right.
 *
 * @example
 * <PageHeader
 *   title="User Management"
 *   subtitle="42 users"
 *   actions={<Button onClick={openCreate}>Add User</Button>}
 * />
 */
export default function PageHeader({
  title,
  titleKey,
  titleParams,
  subtitle,
  subtitleKey,
  subtitleParams,
  actions,
  className,
}: Props) {
  const t = useT();
  const resolvedTitle = title ?? (titleKey ? t(titleKey, titleParams) : "");
  const resolvedSubtitle = subtitle ?? (subtitleKey ? t(subtitleKey, subtitleParams) : "");

  return (
    <div
      className={cn(
        "card-premium border border-slate-100 rounded-xl shadow-sm px-5 py-4 mb-6",
        "flex items-center justify-between gap-4",
        className,
      )}
    >
      <div className="flex flex-col min-w-0">
        <h1 className="text-base md:text-lg font-bold text-primary leading-tight truncate">
          {resolvedTitle}
        </h1>
        {resolvedSubtitle && (
          <p className="text-[11px] md:text-xs text-neutral mt-0.5">{resolvedSubtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
