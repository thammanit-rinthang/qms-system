"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileSpreadsheet, X, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RichTextView from "@/components/shared/RichTextView";

export interface PreviewRow {
  no: number;
  carNo: string;
  issuedAt: string;
  defectDetail: string;
  department: string;
  editor: string;
  editorSection: string;
  follower: string;
  followerSection: string;
  dueDate: string;
  replyDate: string;
  plannedFinish: string;
  follow1st: string;
  dueDate2nd: string;
  follow2nd: string;
  closingDate: string;
  status: string;
  remark: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  rows: PreviewRow[];
  loading?: boolean;
  exporting?: boolean;
}

const COLUMNS = [
  { key: "no", label: "#", className: "w-10 text-center" },
  { key: "carNo", label: "CAR No.", className: "font-mono text-blue-600 font-semibold min-w-[120px]" },
  { key: "issuedAt", label: "วันที่ออก", className: "text-center min-w-[90px]" },
  { key: "defectDetail", label: "รายละเอียด CAR", className: "min-w-[180px]" },
  { key: "department", label: "หน่วยงาน", className: "min-w-[110px]" },
  { key: "editor", label: "ผู้แก้ไข", className: "min-w-[100px]" },
  { key: "editorSection", label: "ฝ่ายผู้แก้ไข", className: "min-w-[80px]" },
  { key: "follower", label: "ผู้ติดตาม", className: "min-w-[100px]" },
  { key: "followerSection", label: "ฝ่ายติดตาม", className: "min-w-[80px]" },
  { key: "dueDate", label: "Due Date", className: "text-center min-w-[90px]" },
  { key: "replyDate", label: "ตอบกลับ", className: "text-center min-w-[90px]" },
  { key: "plannedFinish", label: "กำหนดเสร็จ", className: "text-center min-w-[90px]" },
  { key: "follow1st", label: "ติดตาม 1", className: "text-center min-w-[80px]" },
  { key: "dueDate2nd", label: "Due Date 2", className: "text-center min-w-[80px]" },
  { key: "follow2nd", label: "ติดตาม 2", className: "text-center min-w-[80px]" },
  { key: "closingDate", label: "ปิด CAR", className: "text-center min-w-[90px]" },
  { key: "status", label: "สถานะ", className: "text-center min-w-[90px]" },
  { key: "remark", label: "หมายเหตุ", className: "min-w-[120px]" },
];

function PreviewCell({ columnKey, value }: { columnKey: keyof PreviewRow; value: string | number }) {
  if (columnKey === "defectDetail") {
    return (
      <div className="max-h-12 overflow-hidden [&_.rich-view]:text-xs [&_.rich-view]:leading-snug [&_.rich-view_*]:my-0 [&_p]:my-0">
        <RichTextView content={String(value)} className="text-xs text-slate-700" />
      </div>
    );
  }

  return value;
}

export default function CarPreviewExportDialog({
  open,
  onClose,
  onExport,
  rows,
  loading = false,
  exporting = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              ตัวอย่างข้อมูลส่งออก — CAR Register (FM-MR-11 Rev.02)
            </DialogTitle>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            แสดงข้อมูลทั้งหมด {rows.length} รายการ ก่อนส่งออกเป็น Excel
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-5 py-3 min-h-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileSpreadsheet className="h-10 w-10 mb-2" />
              <p className="text-sm">ไม่มีข้อมูลที่ตรงกับตัวกรอง</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-auto max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((col) => (
                      <TableHead key={col.key} className={`text-xs whitespace-nowrap bg-slate-50 ${col.className}`}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.carNo} className="hover:bg-slate-50">
                      {COLUMNS.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`text-xs py-2 ${col.className}`}
                        >
                          <PreviewCell columnKey={col.key as keyof PreviewRow} value={row[col.key as keyof PreviewRow]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-100 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            ปิด
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onExport}
            disabled={loading || rows.length === 0 || exporting}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {exporting ? "กำลังส่งออก..." : "ส่งออก Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
