"use client";

import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcementService";
import AnnouncementViewFields from "@/components/announcements/AnnouncementViewFields";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  item: AnnouncementRow | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (item: AnnouncementRow) => void;
};

export default function AnnouncementViewModal({ item, open, onClose, onEdit }: Props) {
  const t = useT();

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 text-left">
          <DialogTitle className="text-lg font-semibold text-slate-800 leading-snug pr-8">
            {t("announcement.viewTitle")}
          </DialogTitle>
          {item && (
            <DialogDescription className="text-xs text-slate-500 mt-0.5 truncate max-w-64">
              {item.title}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {item && <AnnouncementViewFields item={item} />}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 flex flex-row justify-end gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {t("common.close")}
          </Button>
          {item && onEdit && (
            <Button
              onClick={() => { onClose(); onEdit(item); }}
            >
              {t("common.edit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
