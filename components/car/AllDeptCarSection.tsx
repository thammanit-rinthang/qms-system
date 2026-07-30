"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import CarStatusBadge from "./CarStatusBadge";
import { CAR_SOURCE_LABELS, type CarListResponse } from "@/types/car";
import { fmtDate } from "@/lib/format";
import Pagination from "@/components/common/Pagination";
import RichTextView from "@/components/shared/RichTextView";
import { useT } from "@/lib/i18n";

const PAGE_SIZE = 20;

async function fetchAllCars(page: number): Promise<CarListResponse> {
  const res = await fetch(`/api/car?scope=all&page=${page}&limit=${PAGE_SIZE}`);
  if (!res.ok) throw new Error("Failed to fetch CARs");
  const json = await res.json();
  return { data: json.data ?? [], meta: json.meta ?? { page, limit: PAGE_SIZE, total: 0 } };
}

function CompactRichText({ content }: { content: string }) {
  return (
    <div className="max-h-12 overflow-hidden text-sm text-slate-700 [&_.rich-view]:text-sm [&_.rich-view]:leading-snug [&_.rich-view_*]:my-0 [&_p]:my-0">
      <RichTextView content={content} />
    </div>
  );
}

export default function AllDeptCarSection({ initialData }: { initialData: CarListResponse }) {
  const t = useT();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["cars-all-dept", page],
    queryFn: () => fetchAllCars(page),
    initialData: page === 1 ? initialData : undefined,
  });

  const cars = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 1;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (cars.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">{t("car.list.emptyAll")}</p>;
  }

  return (
    <div className="space-y-4">
      {/* mobile */}
      <div className="lg:hidden space-y-3">
        {cars.map((car) => (
          <div key={car.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <Link href={`/car/${car.id}`} className="font-mono font-semibold text-blue-600">{car.carNo}</Link>
              <CarStatusBadge status={car.status} />
            </div>
            <p className="text-sm text-slate-700 mb-1">{car.targetDepartment.name}</p>
            <CompactRichText content={car.defectDetail} />
          </div>
        ))}
      </div>

      {/* desktop */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("car.list.colCarNo")}</TableHead>
                <TableHead>{t("car.list.colType")}</TableHead>
                <TableHead>{t("car.list.colDept")}</TableHead>
                <TableHead>{t("car.list.colDetail")}</TableHead>
                <TableHead className="text-center">{t("car.list.colStatus")}</TableHead>
                <TableHead className="text-center">{t("car.list.colIssuedAt")}</TableHead>
                <TableHead className="text-center">{t("car.list.colDueAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cars.map((car) => {
                const isOverdue = !!car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED";
                return (
                  <TableRow key={car.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <Link href={`/car/${car.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                        {car.carNo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">{CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}</TableCell>
                    <TableCell className="text-slate-700">{car.targetDepartment.name}</TableCell>
                    <TableCell className="max-w-xs">
                      <CompactRichText content={car.defectDetail} />
                    </TableCell>
                    <TableCell className="text-center"><CarStatusBadge status={car.status} /></TableCell>
                    <TableCell className="text-slate-500 text-xs text-center font-mono">{fmtDate(car.issuedAt)}</TableCell>
                    <TableCell className={`text-xs text-center font-mono ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                      {fmtDate(car.responseDueAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={Math.max(totalPages, 1)}
        total={total}
        countLabel="CARs"
        onPageChange={setPage}
      />
    </div>
  );
}
