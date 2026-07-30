"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";

import type { DocumentControlSummary } from "@/types/documentControl";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: DocumentControlSummary[];
  totalCount: number;
  onDownload: () => void;
  isTh: boolean;
}

interface PreviewItem {
  id: string;
  docNumber: string;
  docName: string;
  revision: string | null;
  effectiveDate?: string | Date | null;
  status: string;
}

export default function DocumentControlExportPreviewModal({ isOpen, onClose, items, totalCount, onDownload, isTh }: Props) {
  const previewItems = useMemo(() => {
    const list: PreviewItem[] = [];
    for (const item of items) {
      if (!item.revisions || item.revisions.length === 0) {
        list.push({
          id: item.id,
          docNumber: item.docNumber,
          docName: item.docName,
          revision: item.revision,
          effectiveDate: item.effectiveDate,
          status: item.status,
        });
      } else {
        for (const rev of item.revisions) {
          list.push({
            id: `${item.id}-${rev.revision}`,
            docNumber: item.docNumber,
            docName: item.docName,
            revision: rev.revision,
            effectiveDate: rev.effectiveDate,
            status: rev.status,
          });
        }
      }
    }
    return list.slice(0, 5);
  }, [items]);

  const remainingCount = Math.max(0, totalCount - items.length);

  const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
    OBSOLETE: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const statusLabels: Record<string, string> = {
    DRAFT: isTh ? "ฉบับร่าง" : "Draft",
    ACTIVE: isTh ? "ใช้งาน" : "Active",
    CANCELLED: isTh ? "ยกเลิก" : "Cancelled",
    OBSOLETE: isTh ? "ยกเลิกการใช้งาน" : "Obsolete",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F1059]/10 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-[#0F1059]" />
            </div>
            <DialogTitle className="text-slate-900 font-bold text-lg">
              {isTh ? "ตัวอย่างข้อมูลรายงานที่จะส่งออก" : "Export Master List Preview"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            {isTh 
              ? `พบทั้งหมด ${totalCount} รายการ ที่ตรงตามตัวกรองปัจจุบัน ด้านล่างนี้คือตัวอย่างแถวข้อมูลบางส่วนที่จะจัดทำไฟล์ Excel:`
              : `Found ${totalCount} records matching current filters. Below is a preview of the rows to be exported into Excel:`
            }
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-900">
                  <th className="px-4 py-2.5">{isTh ? "หมายเลขเอกสาร" : "Document No."}</th>
                  <th className="px-4 py-2.5">{isTh ? "ชื่อเอกสาร" : "Document Name"}</th>
                  <th className="px-4 py-2.5 text-center">{isTh ? "ครั้งที่แก้ไข" : "Revision"}</th>
                  <th className="px-4 py-2.5 text-center">{isTh ? "วันที่มีผลบังคับใช้" : "Effective Date"}</th>
                  <th className="px-4 py-2.5 text-center">{isTh ? "สถานะ" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      {isTh ? "ไม่มีข้อมูลที่จะส่งออก" : "No records to export"}
                    </td>
                  </tr>
                ) : (
                  previewItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-[#0F1059]">
                        {item.docNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.docName}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {item.revision || "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {item.effectiveDate 
                          ? new Date(item.effectiveDate).toLocaleDateString(isTh ? "th-TH" : "en-GB") 
                          : "-"
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[item.status] || "bg-slate-50 text-slate-500"}`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {remainingCount > 0 && (
            <p className="text-xs text-slate-400 italic text-right font-medium">
              {isTh 
                ? `... และอีก ${remainingCount} รายการที่จะถูกส่งออกรวมในไฟล์`
                : `... and ${remainingCount} more records will be included in the exported file.`
              }
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            {isTh ? "ยกเลิก" : "Cancel"}
          </Button>
          <Button onClick={onDownload} className="bg-[#0F1059] hover:bg-[#0F1059]/90 text-white gap-1.5">
            <Download className="w-4 h-4" />
            {isTh ? "ดาวน์โหลดไฟล์" : "Download Excel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
