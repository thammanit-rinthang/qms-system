"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  desktopContentClassName?: string;
  mobileContentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

export default function ResponsiveFormOverlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  desktopContentClassName,
  mobileContentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: Props) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const header = isMobile ? (
    <SheetHeader className={cn("border-b border-slate-100 px-4 pb-4 pt-2 text-left", headerClassName)}>
      <SheetTitle className="pr-10">{title}</SheetTitle>
      {description ? (
        <SheetDescription className="mt-0.5 text-xs text-slate-500">{description}</SheetDescription>
      ) : null}
    </SheetHeader>
  ) : (
    <DialogHeader className={cn("border-b border-slate-100 px-6 py-4 text-left", headerClassName)}>
      <DialogTitle className="pr-8 text-lg font-semibold leading-snug text-slate-800">
        {title}
      </DialogTitle>
      {description ? (
        <DialogDescription className="mt-0.5 text-xs text-slate-500">{description}</DialogDescription>
      ) : null}
    </DialogHeader>
  );

  const body = <div className={cn("flex-1 overflow-y-auto px-6 py-6", bodyClassName)}>{children}</div>;

  const footerNode = footer ? (
    isMobile ? (
      <SheetFooter className={cn("border-t border-slate-100 bg-white px-4 py-4", footerClassName)}>
        {footer}
      </SheetFooter>
    ) : (
      <DialogFooter className={cn("border-t border-slate-100 bg-white px-6 py-4", footerClassName)}>
        {footer}
      </DialogFooter>
    )
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn("flex h-[92vh] flex-col gap-0 rounded-t-3xl p-0", mobileContentClassName)}
        >
          {header}
          {body}
          {footerNode}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[94vh] flex-col gap-0 overflow-hidden p-0",
          desktopContentClassName
        )}
      >
        {header}
        {body}
        {footerNode}
      </DialogContent>
    </Dialog>
  );
}
