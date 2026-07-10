"use client";

import type { DarItemInput } from "@/types/dar";
import { useT } from "@/lib/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileStack } from "lucide-react";

export default function DarItemsTable({ items }: { items: DarItemInput[] }) {
  const t = useT();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <FileStack className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">{t("emptyItemsTable")}</p>
        <p className="text-xs text-slate-400 mt-1">No documents have been added to this request.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader className="!static !z-0 bg-slate-50/80">
          <TableRow className="border-b-slate-100 hover:bg-transparent">
            <TableHead className="w-16 text-xs font-semibold text-slate-500 uppercase tracking-wider h-10 px-6">{t("colNo")}</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider h-10">{t("colDocNum")}</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider h-10">{t("colDocName")}</TableHead>
            <TableHead className="w-32 text-xs font-semibold text-slate-500 uppercase tracking-wider h-10 text-center">{t("colRevision")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.itemNo} className="border-b-slate-100 transition-colors hover:bg-slate-50/50">
              <TableCell className="px-6 py-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                  {item.itemNo}
                </span>
              </TableCell>
              <TableCell className="font-mono text-sm text-slate-700 py-4 font-medium">{item.docNumber}</TableCell>
              <TableCell className="text-sm text-slate-900 py-4 font-medium">{item.docName}</TableCell>
              <TableCell className="text-center py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono font-medium text-slate-600">
                  {item.revision || "-"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
