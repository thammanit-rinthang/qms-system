"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS, DAR_STATUS_LABELS } from "@/types/dar";
import type { DarSummary, DarStatus } from "@/types/dar";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: DarSummary[];
  onDownload: () => void;
  isTh: boolean;
}

export default function DarExportPreviewModal({ isOpen, onClose, items, onDownload, isTh }: Props) {
  const previewItems = items.slice(0, 5);
  const remainingCount = Math.max(0, items.length - 5);

  const statusColors: Record<DarStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
    PENDING_APPROVE: "bg-violet-50 text-violet-700 border-violet-200",
    QMS_PROCESSING: "bg-sky-50 text-sky-700 border-sky-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
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
              {isTh ? "ตัวอย่างข้อมูลรายงานที่จะส่งออก" : "Export Report Preview"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            {isTh 
              ? `พบทั้งหมด ${items.length} รายการ ที่ตรงตามตัวกรองปัจจุบัน ด้านล่างนี้คือตัวอย่างแถวข้อมูลบางส่วนที่จะจัดทำไฟล์ Excel:`
              : `Found ${items.length} records matching current filters. Below is a preview of the rows to be exported into Excel:`
            }
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-900">
                  <th className="px-4 py-2.5">DAR No.</th>
                  <th className="px-4 py-2.5">{isTh ? "วันที่ขอ" : "Date"}</th>
                  <th className="px-4 py-2.5">{isTh ? "ประเภทเอกสาร" : "Doc Type"}</th>
                  <th className="px-4 py-2.5">{isTh ? "วัตถุประสงค์" : "Objective"}</th>
                  <th className="px-4 py-2.5 text-center">{isTh ? "รายการ" : "Items"}</th>
                  <th className="px-4 py-2.5 text-center">{isTh ? "สถานะ" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      {isTh ? "ไม่มีข้อมูลที่จะส่งออก" : "No records to export"}
                    </td>
                  </tr>
                ) : (
                  previewItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-[#0F1059]">
                        {item.darNo || (isTh ? "ฉบับร่าง" : "Draft")}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(item.requestDate).toLocaleDateString(isTh ? "th-TH" : "en-GB")}
                      </td>
                      <td className="px-4 py-3">
                        {DOC_TYPE_LABELS[item.docType] || item.docType}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {OBJECTIVE_LABELS[item.objective] || item.objective}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {item.itemCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[item.status]}`}>
                          {DAR_STATUS_LABELS[item.status] || item.status}
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

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {isTh ? "ยกเลิก" : "Cancel"}
          </Button>
          <Button 
            size="sm" 
            onClick={onDownload} 
            disabled={items.length === 0}
            className="bg-[#0F1059] hover:bg-[#161875] text-white gap-1.5"
          >
            <Download className="w-4 h-4 shrink-0" />
            {isTh ? "ดาวน์โหลดไฟล์ Excel" : "Download Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
