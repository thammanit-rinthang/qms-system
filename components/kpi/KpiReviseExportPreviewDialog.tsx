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

export interface RevisePreviewObjective {
  objective: string;
  target: number;
  unit: string | null;
  frequency: string;
  responsible: string;
  referenceDocuments: string | null;
  calculationFormula: string;
  actionPlanGuidelines: string;
  revised: boolean;
}

export interface RevisePreviewEntry {
  index: number;
  revisedAt: Date | string;
  revisedByRole: string;
  reason: string | null;
  revisedObjectiveIds: string[];
  objectives: RevisePreviewObjective[];
}

export interface RevisePreviewData {
  kpiId: string;
  department: string;
  yearly: number;
  status: string;
  revisionHistory: RevisePreviewEntry[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  data: RevisePreviewData | null;
  loading?: boolean;
  exporting?: boolean;
}

export default function KpiReviseExportPreviewDialog({
  open,
  onClose,
  onExport,
  data,
  loading = false,
  exporting = false,
}: Props) {
  const entries = data?.revisionHistory ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Preview — KPI Revision History
            </DialogTitle>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {data && (
            <p className="text-xs text-slate-500 mt-1">
              {data.department} ({data.yearly}) — {entries.length} revision(s)
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto px-5 py-3 min-h-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : !data || entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileSpreadsheet className="h-10 w-10 mb-2" />
              <p className="text-sm">ไม่มีประวัติการแก้ไข</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-auto max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 w-14 text-center">#</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[150px]">Revised At</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[80px]">By</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[120px]">Reason</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[200px]">Objective</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 w-16 text-center">Target</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 w-16 text-center">Unit</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[80px]">Frequency</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[120px]">Responsible</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[150px]">Formula</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[150px]">Guidelines</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 min-w-[100px]">Reference</TableHead>
                    <TableHead className="text-xs whitespace-nowrap bg-slate-50 w-16 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) =>
                    entry.objectives.map((obj, oIdx) => (
                      <TableRow key={`${entry.index}-${oIdx}`} className="hover:bg-slate-50">
                        <TableCell className="text-xs py-1.5 text-center">{oIdx === 0 ? `#${entry.index}` : ''}</TableCell>
                        <TableCell className="text-xs py-1.5 whitespace-nowrap">{oIdx === 0 ? fmtDate(entry.revisedAt) : ''}</TableCell>
                        <TableCell className="text-xs py-1.5">{oIdx === 0 ? entry.revisedByRole : ''}</TableCell>
                        <TableCell className="text-xs py-1.5">{oIdx === 0 ? (entry.reason || '-') : ''}</TableCell>
                        <TableCell className="text-xs py-1.5 font-medium">{obj.objective}</TableCell>
                        <TableCell className="text-xs py-1.5 text-center">{obj.target}</TableCell>
                        <TableCell className="text-xs py-1.5 text-center">{obj.unit || '-'}</TableCell>
                        <TableCell className="text-xs py-1.5">{obj.frequency}</TableCell>
                        <TableCell className="text-xs py-1.5">{obj.responsible}</TableCell>
                        <TableCell className="text-xs py-1.5 max-w-[150px] truncate" title={obj.calculationFormula}>{obj.calculationFormula}</TableCell>
                        <TableCell className="text-xs py-1.5 max-w-[150px] truncate" title={obj.actionPlanGuidelines}>{obj.actionPlanGuidelines}</TableCell>
                        <TableCell className="text-xs py-1.5">{obj.referenceDocuments || '-'}</TableCell>
                        <TableCell className="text-xs py-1.5 text-center">
                          {obj.revised ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Revised
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
            disabled={loading || entries.length === 0 || exporting}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {exporting ? "กำลังส่งออก..." : "ส่งออก Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fmtDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}
