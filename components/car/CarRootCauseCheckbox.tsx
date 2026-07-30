"use client";

import { useFormContext } from "react-hook-form";

const ROOT_CAUSES = [
  { field: "rootCausePerson", label: "คน (Person)" },
  { field: "rootCauseMaterial", label: "วัตถุดิบ (Material)" },
  { field: "rootCauseMachine", label: "เครื่องจักร (Machine)" },
  { field: "rootCauseMethod", label: "วิธีการ (Method)" },
  { field: "rootCauseOther", label: "อื่นๆ (Other)" },
] as const;

export default function CarRootCauseCheckbox() {
  const { register, watch } = useFormContext();
  const showOther = watch("rootCauseOther");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">สาเหตุหลักของปัญหา (Root Cause)</p>
      <div className="flex flex-wrap gap-4">
        {ROOT_CAUSES.map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register(field)} className="h-4 w-4 rounded border-gray-300" />
            {label}
          </label>
        ))}
      </div>
      {showOther && (
        <input
          {...register("rootCauseOtherDetail")}
          placeholder="ระบุ..."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}
