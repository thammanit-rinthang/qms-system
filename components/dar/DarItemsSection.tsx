"use client";

import type { DarItemInput } from "@/types/dar";
import { useT } from "@/lib/i18n";
import { ActionIconButton } from "@/components/common/ActionButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

type ItemRow = Omit<DarItemInput, "itemNo">;

type Props = {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
  errors?: Record<string, string>;
};

export default function DarItemsSection({ items, onChange, errors }: Props) {
  const t = useT();

  function addRow() {
    onChange([...items, { docNumber: "", docName: "", revision: "" }]);
  }

  function removeRow(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof ItemRow, value: string) {
    onChange(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  return (
    <Card className="p-5 border border-slate-200/60 shadow-sm bg-white/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm md:text-base font-bold text-slate-800">{t("sectionItems")} <span className="text-rose-500">*</span></h2>
        <Button variant="ghost" size="sm" onClick={addRow} className="gap-1 h-8 px-2 text-slate-600">
          <Plus className="h-4 w-4" />
          {t("addItem")}
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">{t("emptyItems")}</p>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="w-12 font-medium">{t("colNo")}</TableHead>
                <TableHead className="font-medium">{t("colDocNum")} <span className="text-rose-500">*</span></TableHead>
                <TableHead className="font-medium">{t("colDocName")} <span className="text-rose-500">*</span></TableHead>
                <TableHead className="w-28 font-medium">{t("colRevision")} <span className="text-rose-500">*</span></TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-slate-600 text-sm">{idx + 1}</TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      className={`h-8 ${errors?.[`items.${idx}.docNumber`] ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      value={item.docNumber}
                      onChange={(e) => updateRow(idx, "docNumber", e.target.value)}
                      placeholder={t("phDocNum")}
                      maxLength={100}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      className={`h-8 ${errors?.[`items.${idx}.docName`] ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      value={item.docName}
                      onChange={(e) => updateRow(idx, "docName", e.target.value)}
                      placeholder={t("phDocName")}
                      maxLength={255}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      className={`h-8 ${errors?.[`items.${idx}.revision`] ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      value={item.revision}
                      onChange={(e) => updateRow(idx, "revision", e.target.value)}
                      placeholder={t("phRevision")}
                      maxLength={50}
                    />
                  </TableCell>
                  <TableCell>
                    <ActionIconButton
                      tone="delete"
                      label={t("common.delete")}
                      onClick={() => removeRow(idx)}
                      disabled={items.length === 1}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {errors?.items && <p className="text-sm text-rose-500 mt-2">{errors.items}</p>}
    </Card>
  );
}
