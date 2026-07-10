"use client";

import { useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronLeft, ChevronRight, Check, Search, Users, X } from "lucide-react";
import GraphUserPicker, { type GraphUserResult } from "@/components/shared/GraphUserPicker";
import { auditAppointmentCreateSchema, type AuditAppointmentCreateInput } from "@/lib/validations/audit";
import { useCreateAuditAppointment, useUpdateAuditAppointment, useAuditMemberUsers } from "@/hooks/api/use-audit-appointments";
import type { AuditAppointmentRow } from "@/types/audit";
import { useAuditStandards } from "@/hooks/api/use-audit-standards";
import { useEmailGroups } from "@/hooks/api/use-email-groups";
import { cn } from "@/lib/utils";

type FormValues = AuditAppointmentCreateInput;

const STEPS = [
  { label: "ข้อมูลทั่วไป", sublabel: "General Info" },
  { label: "สมาชิก", sublabel: "Members" },
  { label: "รายชื่ออีเมล", sublabel: "Email Groups" },
  { label: "ผู้ตรวจสอบ/อนุมัติ", sublabel: "Reviewer & Approver" },
];

function EmailAccordion({
  label, badge, selected, groups, onToggle,
}: {
  label: string; badge: number; selected: string[];
  groups: { id: string; displayName: string; mail: string }[];
  onToggle: (mail: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {badge > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{badge}</span>
          )}
          <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-90")} />
        </div>
      </button>
      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {groups.map((g) => {
            const checked = selected.includes(g.mail);
            return (
              <label key={g.id} className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors", checked ? "bg-primary/5" : "hover:bg-slate-50")}>
                <input type="checkbox" checked={checked} onChange={(e) => onToggle(g.mail, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary" />
                <div className="min-w-0">
                  <p className={cn("text-sm leading-tight", checked ? "font-semibold text-slate-800" : "font-medium text-slate-700")}>{g.displayName}</p>
                  <p className="text-[11px] text-slate-400">{g.mail.split("@")[0]}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
  onUpdated?: () => void;
  initialData?: AuditAppointmentRow; // edit mode when provided
};

export function AuditAppointmentFormModal({ open, onOpenChange, onCreated, onUpdated, initialData }: Props) {
  const isEdit = !!initialData;
  const [step, setStep] = useState(0);
  const [standardInput, setStandardInput] = useState("");
  const { data: dbStandards = [] } = useAuditStandards();
  const [emailGroupsTo, setEmailGroupsTo] = useState<string[]>(initialData?.emailGroupMails ?? []);
  const [emailGroupsCc, setEmailGroupsCc] = useState<string[]>(initialData?.emailGroupMailsCc ?? []);
  const { data: emailGroups = [] } = useEmailGroups();
  const [reviewer, setReviewer] = useState<GraphUserResult | null>(
    initialData?.reviewerAuthUserId
      ? { id: initialData.reviewerAuthUserId, name: initialData.reviewerNameSnapshot ?? "", email: initialData.reviewerEmail ?? "", department: null, jobTitle: null, employeeId: null }
      : null
  );
  const [approver, setApprover] = useState<GraphUserResult | null>(
    initialData?.approverAuthUserId
      ? { id: initialData.approverAuthUserId, name: initialData.approverNameSnapshot ?? "", email: initialData.approverEmail ?? "", department: null, jobTitle: null, employeeId: null }
      : null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialData?.members.map((m) => m.authUserId) ?? [])
  );
  const [memberSearch, setMemberSearch] = useState("");
  const { data: allUsers = [], isLoading: usersLoading } = useAuditMemberUsers();
  const createMutation = useCreateAuditAppointment();
  const updateMutation = useUpdateAuditAppointment();

  const currentYear = new Date().getFullYear() + 543;

  const form = useForm<FormValues>({
    resolver: zodResolver(auditAppointmentCreateSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      year: initialData?.year ?? currentYear,
      title: initialData?.title ?? "",
      standards: initialData?.standards ?? [],
      members: initialData?.members.map((m, i) => ({
        authUserId: m.authUserId,
        name: m.name,
        department: m.department ?? "",
        role: m.role,
        standards: m.standards,
        orderIndex: i,
      })) ?? [],
      reviewerAuthUserId: initialData?.reviewerAuthUserId ?? "",
      reviewerEmail: initialData?.reviewerEmail ?? "",
      reviewerNameSnapshot: initialData?.reviewerNameSnapshot ?? "",
      approverAuthUserId: initialData?.approverAuthUserId ?? "",
      approverEmail: initialData?.approverEmail ?? "",
      approverNameSnapshot: initialData?.approverNameSnapshot ?? "",
      emailGroupMails: initialData?.emailGroupMails ?? [],
      emailGroupMailsCc: initialData?.emailGroupMailsCc ?? [],
    },
  });

  const { replace: replaceMembers } = useFieldArray({ control: form.control, name: "members" });

  const standards = form.watch("standards");

  const filteredUsers = allUsers.filter((u) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q) ||
      (u.employeeId ?? "").toLowerCase().includes(q)
    );
  });

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addStandard(s: string) {
    const trimmed = s.trim();
    if (!trimmed || standards.includes(trimmed)) return;
    form.setValue("standards", [...standards, trimmed]);
    setStandardInput("");
  }

  function removeStandard(s: string) {
    form.setValue("standards", standards.filter((x) => x !== s));
  }

  async function handleNext() {
    let valid = true;
    if (step === 0) {
      valid = await form.trigger(["year", "title", "standards"]);
      if (!valid) {
        const errs = form.formState.errors;
        const msg = errs.year?.message ?? errs.title?.message ?? "กรุณากรอกข้อมูลให้ครบ";
        toast.error(msg as string);
        return;
      }
    } else if (step === 1) {
      const existingMembers = form.getValues("members") ?? [];
      const members = Array.from(selectedIds).map((id, i) => {
        const u = allUsers.find((x) => x.id === id)!;
        const existing = existingMembers.find((m) => m.authUserId === id);
        return {
          authUserId: id,
          name: u.name,
          department: u.department ?? "",
          role: existing?.role ?? "AUDITOR",
          standards: existing?.standards ?? [],
          orderIndex: i,
        };
      });
      replaceMembers(members);
      valid = true;
    } else if (step === 2) {
      form.setValue("emailGroupMails", emailGroupsTo);
      form.setValue("emailGroupMailsCc", emailGroupsCc);
      valid = true;
    } else if (step === 3) {
      if (!reviewer || !approver) {
        toast.error("กรุณาเลือกผู้ตรวจสอบและผู้อนุมัติ");
        return;
      }
    }
    if (!valid) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  }

  async function handleSubmit() {
    if (!reviewer || !approver) {
      toast.error("กรุณาเลือกผู้ตรวจสอบและผู้อนุมัติ");
      return;
    }
    const values = form.getValues();
    values.reviewerAuthUserId = reviewer.id;
    values.reviewerEmail = reviewer.email;
    values.reviewerNameSnapshot = reviewer.name;
    values.approverAuthUserId = approver.id;
    values.approverEmail = approver.email;
    values.approverNameSnapshot = approver.name;

    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, input: values });
        toast.success("แก้ไขประกาศเรียบร้อยแล้ว");
        resetAll();
        onOpenChange(false);
        onUpdated?.();
      } else {
        const created = await createMutation.mutateAsync(values);
        const createdId = created.id;
        resetAll();
        onOpenChange(false);
        onCreated?.(createdId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  function resetAll() {
    form.reset();
    setStep(0);
    setReviewer(null);
    setApprover(null);
    setSelectedIds(new Set());
    setMemberSearch("");
    setEmailGroupsTo([]);
    setEmailGroupsCc([]);
  }

  function handleClose() {
    onOpenChange(false);
    resetAll();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {isEdit ? "แก้ไขประกาศแต่งตั้ง" : "สร้างประกาศแต่งตั้งผู้ตรวจติดตามภายใน"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                i < step ? "bg-emerald-500 text-white" : i === step ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-slate-800" : "text-slate-400"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-slate-200 shrink-0 ml-1" />}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* Step 0: General Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="year">ปี (พ.ศ.) <span className="text-red-500">*</span></Label>
                  <Input
                    id="year"
                    type="number"
                    min={2560}
                    max={2999}
                    {...form.register("year", { valueAsNumber: true })}
                    className="rounded-xl"
                  />
                  {form.formState.errors.year && (
                    <p className="text-xs text-red-500">{form.formState.errors.year.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">ชื่อประกาศ <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="ประกาศแต่งตั้งผู้ตรวจติดตามภายใน ประจำปี..."
                  className="rounded-xl"
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>มาตรฐาน ISO</Label>
                {dbStandards.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {dbStandards.filter((s) => s.active).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => addStandard(s.name)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          standards.includes(s.name)
                            ? "bg-primary text-white border-primary"
                            : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={standardInput}
                    onChange={(e) => setStandardInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStandard(standardInput); } }}
                    placeholder="เพิ่มมาตรฐานอื่น..."
                    className="rounded-xl flex-1"
                  />
                  <Button type="button" variant="outline" onClick={() => addStandard(standardInput)} className="rounded-xl shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {standards.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {standards.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {s}
                        <button type="button" onClick={() => removeStandard(s)} className="ml-0.5 text-blue-400 hover:text-blue-700">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Members checklist */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    เลือกรายชื่อสมาชิก
                    {selectedIds.size > 0 && (
                      <span className="ml-1.5 text-xs font-normal text-primary">({selectedIds.size} คน)</span>
                    )}
                  </p>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    ล้างทั้งหมด
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, ฝ่าย, รหัสพนักงาน..."
                  className="pl-8 rounded-xl text-sm"
                />
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                {usersLoading ? (
                  <div className="py-10 text-center text-sm text-slate-400">กำลังโหลดรายชื่อ...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">ไม่พบรายชื่อ</div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {filteredUsers.map((u) => {
                      const checked = selectedIds.has(u.id);
                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => toggleUser(u.id)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                              checked ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              checked ? "bg-primary border-primary" : "border-slate-300"
                            }`}>
                              {checked && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                              {(u.name[0] ?? "?").toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium truncate ${checked ? "text-primary" : "text-slate-800"}`}>
                                {u.name}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {[u.department, u.jobTitle, u.employeeId ? `#${u.employeeId}` : null].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <p className="text-xs text-slate-400">บทบาทจะกำหนดในขั้นตอนสร้างแผนการตรวจ</p>

              {/* Selected members summary */}
              {selectedIds.size > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700">รายชื่อที่เลือก ({selectedIds.size} คน)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(selectedIds).map((id) => {
                      const u = allUsers.find((x) => x.id === id);
                      if (!u) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-white border border-blue-200 pl-2 pr-1 py-0.5 text-xs font-medium text-slate-700">
                          {u.name}
                          <button type="button" onClick={() => toggleUser(id)} className="text-slate-400 hover:text-red-500 leading-none">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Email Groups */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">เลือกกลุ่มอีเมลที่จะได้รับประกาศเมื่ออนุมัติแล้ว (ไม่บังคับ)</p>
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span>อีเมลจะถูกส่งหลังจาก <strong>Reviewer</strong> และ <strong>Approver</strong> อนุมัติครบแล้วเท่านั้น</span>
              </div>
              {emailGroups.filter((g) => !!g.mail).length === 0 ? (
                <p className="text-sm text-slate-400">ไม่มีกลุ่มอีเมลในระบบ</p>
              ) : (
                <div className="space-y-3">
                  <EmailAccordion
                    label="To — ส่งถึง"
                    badge={emailGroupsTo.length}
                    selected={emailGroupsTo}
                    groups={emailGroups.filter((g) => !!g.mail) as { id: string; displayName: string; mail: string }[]}
                    onToggle={(mail, checked) =>
                      setEmailGroupsTo((prev) => checked ? [...prev, mail] : prev.filter((m) => m !== mail))
                    }
                  />
                  <EmailAccordion
                    label="CC — สำเนาถึง"
                    badge={emailGroupsCc.length}
                    selected={emailGroupsCc}
                    groups={emailGroups.filter((g) => !!g.mail) as { id: string; displayName: string; mail: string }[]}
                    onToggle={(mail, checked) =>
                      setEmailGroupsCc((prev) => checked ? [...prev, mail] : prev.filter((m) => m !== mail))
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Reviewer & Approver */}
          {step === 3 && (
            <div className="space-y-4">
              <GraphUserPicker
                label="ผู้ตรวจสอบ (Reviewer)"
                value={reviewer}
                onChange={setReviewer}
                placeholder="ค้นหาผู้ตรวจสอบ..."
                required
              />
              <GraphUserPicker
                label="ผู้อนุมัติ (Approver)"
                value={approver}
                onChange={setApprover}
                placeholder="ค้นหาผู้อนุมัติ..."
                required
              />
              {reviewer && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
                  <p className="font-medium text-emerald-800">Reviewer: {reviewer.name}</p>
                  <p className="text-emerald-600 text-xs">{reviewer.email}</p>
                </div>
              )}
              {approver && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm">
                  <p className="font-medium text-violet-800">Approver: {approver.name}</p>
                  <p className="text-violet-600 text-xs">{approver.email}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => step === 0 ? handleClose() : setStep(step - 1)}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 0 ? "ยกเลิก" : "ย้อนกลับ"}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{step + 1} / {STEPS.length}</span>
            <Button
              type="button"
              onClick={handleNext}
              disabled={isMutating}
              className="rounded-xl bg-primary hover:bg-[#161875]"
            >
              {step === STEPS.length - 1 ? (
                isMutating ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "ส่งรีวิว"
              ) : (
                <>ถัดไป <ChevronRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
