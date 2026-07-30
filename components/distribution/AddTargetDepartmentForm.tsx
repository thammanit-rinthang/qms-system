"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DepartmentCode = { id: string; departmentName: string; code: string };

export default function AddTargetDepartmentForm({
  darId, distributionId, existingDepartmentIds,
}: {
  darId: string;
  distributionId: string;
  existingDepartmentIds: string[];
}) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: departments } = useQuery<DepartmentCode[]>({
    queryKey: ["department-codes"],
    queryFn: () => fetch(`/api/qms/department-codes`).then((r) => r.json()).then((j) => j.data ?? []),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}/distribution/${distributionId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "เพิ่มแผนกไม่สำเร็จ");
      return json.data;
    },
    onSuccess: () => {
      setDepartmentId("");
      router.refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "เพิ่มแผนกไม่สำเร็จ"),
  });

  const availableDepartments = (departments ?? []).filter((d) => !existingDepartmentIds.includes(d.id));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">เพิ่มแผนกที่ต้องแจกจ่าย</p>
      <div className="flex items-center gap-2">
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
          <SelectContent>
            {availableDepartments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.code} — {d.departmentName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!departmentId || addMutation.isPending}
          onClick={() => { setError(null); addMutation.mutate(); }}
        >
          {addMutation.isPending ? "กำลังเพิ่ม..." : "เพิ่ม"}
        </Button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
