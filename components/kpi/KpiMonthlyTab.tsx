"use client";

import KpiMonthlyClient from "@/components/kpi/KpiMonthlyClient";

type UserRole = "USER" | "IT" | "QMS" | "MR";

interface Props {
  userRole: UserRole;
}

export default function KpiMonthlyTab({ userRole }: Props) {
  return <KpiMonthlyClient userRole={userRole} />;
}
