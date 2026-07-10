"use client";

import { cloneElement, isValidElement } from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { Ban, Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionTone = "view" | "edit" | "delete" | "cancel";

const toneMap: Record<ActionTone, { icon: ReactNode; className: string }> = {
  view: {
    icon: <Eye className="h-3.5 w-3.5" />,
    className: "border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800",
  },
  edit: {
    icon: <Pencil className="h-3.5 w-3.5" />,
    className: "border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700",
  },
  delete: {
    icon: <Trash2 className="h-3.5 w-3.5" />,
    className: "border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700",
  },
  cancel: {
    icon: <Ban className="h-3.5 w-3.5" />,
    className: "border-orange-200 text-orange-500 hover:bg-orange-50 hover:text-orange-600",
  },
};

type BaseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: ActionTone;
  label: string;
  loading?: boolean;
  asChild?: boolean;
  children?: ReactNode;
};

function renderAsChild(
  child: ReactNode,
  extraProps: Record<string, unknown>,
  content: ReactNode,
) {
  if (!isValidElement(child)) {
    throw new Error("Action button with asChild requires a single React element child.");
  }

  const element = child as ReactElement<{ className?: string; children?: ReactNode }>;
  return cloneElement(element, {
    ...extraProps,
    className: cn(extraProps.className as string, element.props.className),
    children: content,
  });
}

export function ActionIconButton({
  tone,
  label,
  loading = false,
  asChild = false,
  className,
  disabled,
  children,
  ...props
}: BaseProps) {
  const buttonClassName = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    toneMap[tone].className,
    className,
  );
  const content = loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : toneMap[tone].icon;

  if (asChild) {
    return renderAsChild(children, {
      ...props,
      "aria-label": label,
      title: label,
      className: buttonClassName,
    }, content);
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={buttonClassName}
      {...props}
    >
      {content}
    </button>
  );
}

export function ActionPillButton({
  tone,
  label,
  loading = false,
  asChild = false,
  className,
  disabled,
  children,
  ...props
}: BaseProps) {
  const buttonClassName = cn(
    "inline-flex h-8 items-center gap-1.5 rounded-xl border bg-white px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    toneMap[tone].className,
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : toneMap[tone].icon}
      <span>{label}</span>
    </>
  );

  if (asChild) {
    return renderAsChild(children, {
      ...props,
      className: buttonClassName,
    }, content);
  }

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={buttonClassName}
      {...props}
    >
      {content}
    </button>
  );
}
