"use client";

import React from "react";
import CarListTable from "./CarListTable";
import type { CarListResponse, CarListScope } from "@/types/car";

interface QmsCarPageClientProps {
  initialData: CarListResponse;
  authDepartmentId: string | null;
  role: string;
  scope: string;
}

export default function QmsCarPageClient({
  initialData,
  authDepartmentId,
  role,
  scope,
}: QmsCarPageClientProps) {
  return (
    <div className="space-y-6">
      <CarListTable
        initialData={initialData}
        isPrivileged
        canEditDelete={role === "QMS" || role === "IT" || role === "MR"}
        initialScope={scope as CarListScope}
        allowAllScope
        myAuthDeptId={authDepartmentId}
      />
    </div>
  );
}
