"use client";

import { useT } from "@/lib/i18n";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export default function DarTableSkeleton() {
  const t = useT();

  return (
    <>
      {/* Hero banner skeleton */}
      <div className="rounded-xl h-18 mb-6 skeleton" />

      {/* Desktop table skeleton */}
      <div className="hidden md:block card-premium overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fieldDarNo")}</TableHead>
              <TableHead>{t("fieldDate")}</TableHead>
              <TableHead>{t("fieldObjective")}</TableHead>
              <TableHead>{t("fieldDocType")}</TableHead>
              <TableHead>{t("sectionItems")}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="skeleton h-4 w-28 rounded" /></TableCell>
                <TableCell><div className="skeleton h-4 w-20 rounded" /></TableCell>
                <TableCell><div className="skeleton h-4 w-36 rounded" /></TableCell>
                <TableCell><div className="skeleton h-4 w-20 rounded" /></TableCell>
                <TableCell><div className="skeleton h-6 w-6 rounded-full mx-auto" /></TableCell>
                <TableCell><div className="skeleton h-5 w-24 rounded-full" /></TableCell>
                <TableCell><div className="skeleton h-7 w-20 rounded-md ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card skeleton */}
      <div className="md:hidden flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 shadow-sm border-slate-200/60">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex flex-col gap-1.5">
                <div className="skeleton h-4 w-28 rounded bg-slate-200" />
                <div className="skeleton h-3 w-20 rounded bg-slate-200" />
              </div>
              <div className="skeleton h-5 w-20 rounded-full bg-slate-200" />
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <div className="skeleton h-3 w-full rounded bg-slate-200" />
              <div className="skeleton h-3 w-4/5 rounded bg-slate-200" />
              <div className="skeleton h-3 w-3/5 rounded bg-slate-200" />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <div className="skeleton h-8 w-24 rounded-md bg-slate-200" />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
