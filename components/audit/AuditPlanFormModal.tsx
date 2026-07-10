"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SignaturePad from "@/components/shared/SignaturePad";
import { useDepartments } from "@/hooks/api/use-departments";
import { useReviewerCandidates, type ReviewerCandidate } from "@/hooks/api/use-reviewer-candidates";
import { useEmailGroups } from "@/hooks/api/use-email-groups";
import { useAuditAppointments } from "@/hooks/api/use-audit-appointments";
import { useAuditStandards } from "@/hooks/api/use-audit-standards";
import { useQueryClient } from "@tanstack/react-query";
import { auditPlanKeys } from "@/hooks/api/use-audit-plans";
import { INPUT_CLASS } from "@/lib/styles";
import type { AuditPlanSummary } from "@/types/audit";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (plan: AuditPlanSummary) => void;
}

type WizardStep = 1 | "schedule" | "email" | "signature" | 3;

type TeamMemberEntry = {
  authUserId: string;
  name: string;
  email: string | null;
  role: "LEAD_AUDITOR" | "AUDITOR" | "OBSERVER" | "AUDITEE";
};

type DeptScheduleEntry = {
  departmentId: string;
  departmentName: string;
  enabled: boolean;
  startAt: string;
  endAt: string;
  location: string;
  contactEmail: string;
  auditeeNotifyDept: boolean;
  team: TeamMemberEntry[];
};

type FormData = {
  // Step 1
  auditType: "INTERNAL" | "EXTERNAL";
  selectedDeptIds: string[];
  selectedStandards: string[];
  file: File | null;
  appointmentId: string;
  appointmentMembers: { authUserId: string; name: string; email: string | null; role: string }[];
  // Step schedule
  deptSchedules: DeptScheduleEntry[];
  // Email groups
  emailGroupTo: string[];
  emailGroupCc: string[];
  // Step 3
  reviewerAuthUserId: string;
  reviewerEmail: string;
  reviewerName: string;
  approverAuthUserId: string;
  approverEmail: string;
  approverName: string;
  // Signature
  signaturePath: string;
};

const EMPTY_FORM: FormData = {
  auditType: "INTERNAL",
  selectedDeptIds: [],
  selectedStandards: [],
  file: null,
  appointmentId: "",
  appointmentMembers: [],
  deptSchedules: [],
  emailGroupTo: [],
  emailGroupCc: [],
  reviewerAuthUserId: "",
  reviewerEmail: "",
  reviewerName: "",
  approverAuthUserId: "",
  approverEmail: "",
  approverName: "",
  signaturePath: "",
};

const ROLE_LABELS: Record<TeamMemberEntry["role"], string> = {
  LEAD_AUDITOR: "หัวผู้ตรวจสอบ",
  AUDITOR: "ผู้ตรวจสอบ",
  OBSERVER: "ผู้สังเกตการณ์",
  AUDITEE: "ผู้รับการตรวจ",
};

const ROLE_COLORS: Record<TeamMemberEntry["role"], string> = {
  LEAD_AUDITOR: "bg-indigo-100 text-indigo-700 border-indigo-200",
  AUDITOR: "bg-blue-100 text-blue-700 border-blue-200",
  OBSERVER: "bg-amber-100 text-amber-700 border-amber-200",
  AUDITEE: "bg-teal-100 text-teal-700 border-teal-200",
};

// ── Person search component (shared for reviewer / approver / observer / auditee) ────

function PersonSearch({
  placeholder,
  onSelect,
  exclude,
}: {
  placeholder: string;
  onSelect: (c: ReviewerCandidate) => void;
  exclude?: string[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: candidates = [], isLoading } = useReviewerCandidates(q, q.length >= 1);

  const filtered = candidates.filter((c) => !exclude?.includes(c.id));

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={cn(INPUT_CLASS, "pl-8")}
        />
      </div>
      {open && q.length >= 1 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-slate-400">กำลังค้นหา...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">ไม่พบผู้ใช้</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => { onSelect(c); setQ(""); setOpen(false); }}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-xs text-slate-400">{c.email ?? ""} {c.department ? `• ${c.department}` : ""}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StandardCustomInput({ selected, onAdd }: { selected: string[]; onAdd: (s: string) => void }) {
  const [val, setVal] = useState("");
  function add() {
    const trimmed = val.trim();
    if (trimmed && !selected.includes(trimmed)) { onAdd(trimmed); setVal(""); }
  }
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        placeholder="เพิ่มมาตรฐานอื่น..."
        className={INPUT_CLASS}
      />
      <button type="button" onClick={add} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Wizard component ──────────────────────────────────────────────────────────

export default function AuditPlanFormModal({ open, onClose, onSuccess }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const { data: emailGroups = [] } = useEmailGroups();
  const { data: dbStandards = [] } = useAuditStandards();
  const { data: appointments = [] } = useAuditAppointments();

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFormData(EMPTY_FORM);
      setIsSubmitting(false);
    }
  }, [open]);

  function patch(updates: Partial<FormData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  function validateStep1(): string | null {
    if (formData.selectedDeptIds.length === 0) return "กรุณาเลือกอย่างน้อย 1 แผนก";
    return null;
  }

  function validateStep3(): string | null {
    if (!formData.reviewerAuthUserId) return "กรุณาเลือก Reviewer";
    if (!formData.approverAuthUserId) return "กรุณาเลือก Approver";
    return null;
  }

  function computeTitle(): string {
    return departments
      .filter((d) => formData.selectedDeptIds.includes(d.id))
      .map((d) => d.name)
      .join(", ");
  }

  function handleStep1Next() {
    const err = validateStep1();
    if (err) { toast.error(err); return; }
    const existingIds = new Set(formData.deptSchedules.map((d) => d.departmentId));
    const toAdd = formData.selectedDeptIds
      .filter((id) => !existingIds.has(id))
      .map((id) => ({
        departmentId: id,
        departmentName: departments.find((d) => d.id === id)?.name ?? id,
        enabled: false,
        startAt: "",
        endAt: "",
        location: "",
        contactEmail: "",
        auditeeNotifyDept: true,
        team: [] as TeamMemberEntry[],
      }));
    if (toAdd.length > 0) patch({ deptSchedules: [...formData.deptSchedules, ...toAdd] });
    setStep("schedule");
  }

  function handleScheduleNext() {
    setStep("email");
  }

  function handleEmailSubmit() {
    setStep("signature");
  }

  function handleSignatureConfirm(dataUrl: string) {
    patch({ signaturePath: dataUrl });
    setStep(3);
  }

  async function handleFinalSubmit() {
    const err = validateStep3();
    if (err) { toast.error(err); return; }

    setIsSubmitting(true);
    try {
      // 1. Create plan
      const planRes = await fetch("/api/audit/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: computeTitle(),
          auditType: formData.auditType,
          mode: "FILE_UPLOAD",
          standards: formData.selectedStandards,
          appointmentId: formData.appointmentId || undefined,
        }),
      });
      const planJson = await planRes.json() as { data?: AuditPlanSummary; message?: string };
      if (!planRes.ok) throw new Error(planJson.message ?? "สร้างแผนไม่สำเร็จ");
      const plan = planJson.data!;

      // 2. Set departments
      const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
      const deptRes = await fetch(`/api/audit/plans/${plan.id}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: formData.selectedDeptIds.map((id) => ({
            departmentId: id,
            departmentName: deptMap[id] ?? "",
          })),
        }),
      });
      if (!deptRes.ok) {
        const j = await deptRes.json().catch(() => ({})) as { message?: string };
        throw new Error(j.message ?? "ตั้งค่าแผนกไม่สำเร็จ");
      }

      // 3. Upload file if present
      if (formData.file) {
        const fd = new FormData();
        fd.append("file", formData.file);
        fd.append("planId", plan.id);
        fd.append("resourceType", "PLAN");
        fd.append("resourceId", plan.id);
        const uploadRes = await fetch("/api/audit/attachments/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) {
          const j = await uploadRes.json().catch(() => ({})) as { message?: string };
          throw new Error(j.message ?? "อัปโหลดไฟล์ไม่สำเร็จ");
        }
      }

      // 4. Create per-department schedules with team
      for (const ds of formData.deptSchedules) {
        if (!ds.enabled || !ds.startAt || !ds.endAt) continue;
        const leadMember = ds.team.find((m) => m.role === "LEAD_AUDITOR");
        const schRes = await fetch(`/api/audit/plans/${plan.id}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionTitle: ds.departmentName,
            startAt: ds.startAt,
            endAt: ds.endAt,
            departmentId: ds.departmentId,
            departmentName: ds.departmentName,
            contactEmail: ds.contactEmail || undefined,
            location: ds.location || undefined,
            leadAuditorAuthUserId: leadMember?.authUserId || undefined,
            leadAuditorNameSnapshot: leadMember?.name || undefined,
            leadAuditorEmailSnapshot: leadMember?.email || undefined,
            auditeeNotifyDept: ds.auditeeNotifyDept,
            team: ds.team.map((m) => ({
              authUserId: m.authUserId,
              nameSnapshot: m.name,
              emailSnapshot: m.email ?? undefined,
              role: m.role,
            })),
          }),
        });
        if (!schRes.ok) {
          const j = await schRes.json().catch(() => ({})) as { message?: string };
          throw new Error(j.message ?? `สร้างตารางแผนก ${ds.departmentName} ไม่สำเร็จ`);
        }
      }

      // 5. Submit (signature + reviewer/approver)
      const submitRes = await fetch(`/api/audit/plans/${plan.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedRole: "PREPARER",
          signaturePath: formData.signaturePath || undefined,
          reviewerAuthUserId: formData.reviewerAuthUserId,
          reviewerEmail: formData.reviewerEmail,
          reviewerNameSnapshot: formData.reviewerName || undefined,
          approverAuthUserId: formData.approverAuthUserId,
          approverEmail: formData.approverEmail,
          approverNameSnapshot: formData.approverName || undefined,
          emailGroupMails: [...formData.emailGroupTo, ...formData.emailGroupCc],
        }),
      });
      if (!submitRes.ok) {
        const j = await submitRes.json().catch(() => ({})) as { message?: string };
        throw new Error(j.message ?? "ส่งแผนไม่สำเร็จ");
      }
      const submitJson = await submitRes.json() as { data?: AuditPlanSummary };
      const finalPlan = submitJson.data ?? plan;

      toast.success(`สร้างแผน ${plan.auditNo} และส่งเพื่ออนุมัติแล้ว`);
      qc.invalidateQueries({ queryKey: auditPlanKeys.all });
      onSuccess?.(finalPlan);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", { duration: Infinity });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Step renderers ─────────────────────────────────────────────────────────

  function renderStep1() {
    const publishedAppointments = appointments.filter((a) => a.status === "PUBLISHED");

    return (
      <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
        {/* Audit Type */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            ประเภทการตรวจสอบ
          </p>
          <div className="flex gap-4">
            {(["INTERNAL", "EXTERNAL"] as const).map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="auditType"
                  value={type}
                  checked={formData.auditType === type}
                  onChange={() => patch({ auditType: type })}
                  className="h-4 w-4 border-slate-300 text-primary"
                />
                <span className="text-sm text-slate-700">
                  {type === "INTERNAL" ? "ตรวจสอบภายใน" : "ตรวจสอบภายนอก"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Appointment picker */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            ผังการแต่งตั้งผู้ตรวจสอบ <span className="text-slate-400 font-normal">(เลือกได้)</span>
          </p>
          {publishedAppointments.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีผังการแต่งตั้งที่เผยแพร่</p>
          ) : (
            <select
              value={formData.appointmentId}
              onChange={(e) => {
                const id = e.target.value;
                const appt = appointments.find((a) => a.id === id);
                patch({
                  appointmentId: id,
                  appointmentMembers: appt
                    ? appt.members.map((m) => ({
                        authUserId: m.authUserId,
                        name: m.name,
                        email: null,
                        role: m.role,
                      }))
                    : [],
                });
              }}
              className={INPUT_CLASS}
            >
              <option value="">-- ไม่เลือก --</option>
              {publishedAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.appointmentNo} — {a.title} ({a.year})
                </option>
              ))}
            </select>
          )}
          {formData.appointmentId && (
            <p className="mt-1.5 text-xs text-slate-500">
              สมาชิกในผัง: {formData.appointmentMembers.length} คน
            </p>
          )}
        </div>

        {/* Departments */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            แผนก <span className="text-rose-500">*</span>
          </p>
          {deptsLoading ? (
            <div className="text-sm text-slate-400">กำลังโหลด...</div>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-50">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedDeptIds.includes(dept.id)}
                    onChange={(e) => {
                      const ids = e.target.checked
                        ? [...formData.selectedDeptIds, dept.id]
                        : formData.selectedDeptIds.filter((id) => id !== dept.id);
                      patch({ selectedDeptIds: ids });
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                  />
                  <span className="text-sm text-slate-700">{dept.name}</span>
                </label>
              ))}
            </div>
          )}
          {formData.selectedDeptIds.length > 0 && (
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-400">ชื่อแผน (auto)</p>
              <p className="text-sm font-medium text-slate-700">{computeTitle()}</p>
            </div>
          )}
        </div>

        {/* ISO Standards */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            มาตรฐาน ISO
          </p>
          {dbStandards.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {dbStandards.filter((s) => s.active).map((s) => {
                const selected = formData.selectedStandards.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      patch({
                        selectedStandards: selected
                          ? formData.selectedStandards.filter((x) => x !== s.name)
                          : [...formData.selectedStandards, s.name],
                      })
                    }
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "bg-primary text-white border-primary"
                        : "border-slate-200 text-slate-600 hover:border-primary/60 hover:text-primary"
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
          <StandardCustomInput
            selected={formData.selectedStandards}
            onAdd={(s) => {
              if (!formData.selectedStandards.includes(s))
                patch({ selectedStandards: [...formData.selectedStandards, s] });
            }}
          />
          {formData.selectedStandards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.selectedStandards.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {s}
                  <button
                    type="button"
                    onClick={() => patch({ selectedStandards: formData.selectedStandards.filter((x) => x !== s) })}
                    className="ml-0.5 text-blue-400 hover:text-blue-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* File upload */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            ไฟล์แนบแผน
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => patch({ file: e.target.files?.[0] ?? null })}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              เลือกไฟล์
            </Button>
            {formData.file ? (
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                {formData.file.name}
                <button
                  type="button"
                  onClick={() => {
                    patch({ file: null });
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : (
              <span className="text-sm text-slate-400">ยังไม่ได้เลือกไฟล์</span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">รองรับ PDF, Word, Excel, PNG, JPEG ขนาดไม่เกิน 20 MB</p>
        </div>
      </div>
    );
  }

  function renderScheduleStep() {
    return (
      <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-4">
        <div className="flex gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <span>กำหนดวันตรวจสอบและทีมตรวจสอบสำหรับแต่ละแผนก ถ้ายังไม่แน่ใจ ข้ามได้แล้วมาเพิ่มทีหลังในแท็บ <strong>ตารางเวลา</strong></span>
        </div>
        <div className="space-y-4">
          {formData.deptSchedules.map((ds, i) => {
            function patchDs(updates: Partial<DeptScheduleEntry>) {
              const next = formData.deptSchedules.map((x, j) => j === i ? { ...x, ...updates } : x);
              patch({ deptSchedules: next });
            }

            function addTeamMember(member: Omit<TeamMemberEntry, "role">, role: TeamMemberEntry["role"]) {
              if (ds.team.some((m) => m.authUserId === member.authUserId && m.role === role)) return;
              patchDs({ team: [...ds.team, { ...member, role }] });
            }

            function removeTeamMember(authUserId: string, role: TeamMemberEntry["role"]) {
              patchDs({ team: ds.team.filter((m) => !(m.authUserId === authUserId && m.role === role)) });
            }

            const appointmentCandidates = formData.appointmentMembers;
            const leadMembers = ds.team.filter((m) => m.role === "LEAD_AUDITOR");
            const auditorMembers = ds.team.filter((m) => m.role === "AUDITOR");
            const observerMembers = ds.team.filter((m) => m.role === "OBSERVER");
            const auditeeMembers = ds.team.filter((m) => m.role === "AUDITEE");

            return (
              <div key={ds.departmentId} className={`rounded-xl border p-4 space-y-4 transition-colors ${ds.enabled ? "border-violet-200 bg-violet-50/30" : "border-slate-100 bg-white"}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ds.enabled}
                    onChange={(e) => patchDs({ enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                  />
                  <span className="font-semibold text-slate-800">{ds.departmentName}</span>
                </label>

                {ds.enabled && (
                  <div className="space-y-4 pl-7">
                    {/* Date range */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">วันเริ่มตรวจ <span className="text-rose-500">*</span></label>
                        <input
                          type="datetime-local"
                          value={ds.startAt}
                          onChange={(e) => patchDs({ startAt: e.target.value })}
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">วันสิ้นสุด <span className="text-rose-500">*</span></label>
                        <input
                          type="datetime-local"
                          value={ds.endAt}
                          onChange={(e) => patchDs({ endAt: e.target.value })}
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    {/* Contact + location */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">อีเมลติดต่อแผนก</label>
                        <input
                          type="email"
                          value={ds.contactEmail}
                          onChange={(e) => patchDs({ contactEmail: e.target.value })}
                          placeholder="dept@company.com"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">สถานที่</label>
                        <input
                          type="text"
                          value={ds.location}
                          onChange={(e) => patchDs({ location: e.target.value })}
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    {/* Lead Auditor */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">{ROLE_LABELS.LEAD_AUDITOR}</p>
                      {appointmentCandidates.length > 0 ? (
                        <select
                          value=""
                          onChange={(e) => {
                            const m = appointmentCandidates.find((c) => c.authUserId === e.target.value);
                            if (m) addTeamMember({ authUserId: m.authUserId, name: m.name, email: m.email }, "LEAD_AUDITOR");
                          }}
                          className={INPUT_CLASS}
                        >
                          <option value="">-- เลือกจากผังการแต่งตั้ง --</option>
                          {appointmentCandidates
                            .filter((c) => !leadMembers.some((m) => m.authUserId === c.authUserId))
                            .map((c) => (
                              <option key={c.authUserId} value={c.authUserId}>{c.name}</option>
                            ))}
                        </select>
                      ) : (
                        <PersonSearch
                          placeholder="ค้นหาหัวผู้ตรวจสอบ..."
                          onSelect={(c) => addTeamMember({ authUserId: c.id, name: c.name, email: c.email }, "LEAD_AUDITOR")}
                          exclude={leadMembers.map((m) => m.authUserId)}
                        />
                      )}
                      {leadMembers.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {leadMembers.map((m) => (
                            <span key={m.authUserId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS.LEAD_AUDITOR)}>
                              {m.name}
                              <button type="button" onClick={() => removeTeamMember(m.authUserId, "LEAD_AUDITOR")} className="ml-0.5 opacity-60 hover:opacity-100">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Auditor */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">{ROLE_LABELS.AUDITOR}</p>
                      {appointmentCandidates.length > 0 ? (
                        <select
                          value=""
                          onChange={(e) => {
                            const m = appointmentCandidates.find((c) => c.authUserId === e.target.value);
                            if (m) addTeamMember({ authUserId: m.authUserId, name: m.name, email: m.email }, "AUDITOR");
                          }}
                          className={INPUT_CLASS}
                        >
                          <option value="">-- เลือกจากผังการแต่งตั้ง --</option>
                          {appointmentCandidates
                            .filter((c) => !auditorMembers.some((m) => m.authUserId === c.authUserId))
                            .map((c) => (
                              <option key={c.authUserId} value={c.authUserId}>{c.name}</option>
                            ))}
                        </select>
                      ) : (
                        <PersonSearch
                          placeholder="ค้นหาผู้ตรวจสอบ..."
                          onSelect={(c) => addTeamMember({ authUserId: c.id, name: c.name, email: c.email }, "AUDITOR")}
                          exclude={auditorMembers.map((m) => m.authUserId)}
                        />
                      )}
                      {auditorMembers.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {auditorMembers.map((m) => (
                            <span key={m.authUserId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS.AUDITOR)}>
                              {m.name}
                              <button type="button" onClick={() => removeTeamMember(m.authUserId, "AUDITOR")} className="ml-0.5 opacity-60 hover:opacity-100">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Observer */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">{ROLE_LABELS.OBSERVER}</p>
                      <PersonSearch
                        placeholder="ค้นหาผู้สังเกตการณ์..."
                        onSelect={(c) => addTeamMember({ authUserId: c.id, name: c.name, email: c.email }, "OBSERVER")}
                        exclude={observerMembers.map((m) => m.authUserId)}
                      />
                      {observerMembers.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {observerMembers.map((m) => (
                            <span key={m.authUserId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS.OBSERVER)}>
                              {m.name}
                              <button type="button" onClick={() => removeTeamMember(m.authUserId, "OBSERVER")} className="ml-0.5 opacity-60 hover:opacity-100">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Auditee */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">{ROLE_LABELS.AUDITEE}</p>
                      <div className="flex items-center gap-3 mb-2">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            checked={ds.auditeeNotifyDept}
                            onChange={() => patchDs({ auditeeNotifyDept: true, team: ds.team.filter((m) => m.role !== "AUDITEE") })}
                            className="h-4 w-4 border-slate-300 text-primary"
                          />
                          ส่งทั้งแผนก
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            checked={!ds.auditeeNotifyDept}
                            onChange={() => patchDs({ auditeeNotifyDept: false })}
                            className="h-4 w-4 border-slate-300 text-primary"
                          />
                          เลือกรายคน
                        </label>
                      </div>
                      {ds.auditeeNotifyDept ? (
                        <p className="text-xs text-teal-600 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                          จะส่งถึงทุกคนในแผนก {ds.departmentName}
                        </p>
                      ) : (
                        <>
                          <PersonSearch
                            placeholder="ค้นหาผู้รับการตรวจ..."
                            onSelect={(c) => addTeamMember({ authUserId: c.id, name: c.name, email: c.email }, "AUDITEE")}
                            exclude={auditeeMembers.map((m) => m.authUserId)}
                          />
                          {auditeeMembers.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {auditeeMembers.map((m) => (
                                <span key={m.authUserId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS.AUDITEE)}>
                                  {m.name}
                                  <button type="button" onClick={() => removeTeamMember(m.authUserId, "AUDITEE")} className="ml-0.5 opacity-60 hover:opacity-100">
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderEmailStep() {
    const groupsWithMail = emailGroups.filter((g) => !!g.mail);

    function groupLabel(mail: string) {
      return mail.split("@")[0];
    }

    function EmailAccordion({
      label,
      badge,
      selected,
      onToggle,
    }: {
      label: string;
      badge: number;
      selected: string[];
      onToggle: (mail: string, checked: boolean) => void;
    }) {
      const [accordionOpen, setAccordionOpen] = useState(false);
      return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setAccordionOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <div className="flex items-center gap-2">
              {badge > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {badge}
                </span>
              )}
              <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", accordionOpen && "rotate-90")} />
            </div>
          </button>
          {accordionOpen && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {groupsWithMail.map((g) => {
                const checked = selected.includes(g.mail!);
                return (
                  <label
                    key={g.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
                      checked ? "bg-primary/5" : "hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggle(g.mail!, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary"
                    />
                    <div className="min-w-0">
                      <p className={cn("text-sm leading-tight", checked ? "font-semibold text-slate-800" : "font-medium text-slate-700")}>
                        {g.displayName}
                      </p>
                      <p className="text-[11px] text-slate-400">{groupLabel(g.mail!)}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5">
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>อีเมลจะถูกส่งหลังจาก <strong>Reviewer</strong> และ <strong>Approver</strong> อนุมัติครบแล้วเท่านั้น</span>
        </div>

        {groupsWithMail.length === 0 ? (
          <p className="text-sm text-slate-400">ไม่มีกลุ่มอีเมลในระบบ</p>
        ) : (
          <div className="space-y-3">
            <EmailAccordion
              label="To — ส่งถึง"
              badge={formData.emailGroupTo.length}
              selected={formData.emailGroupTo}
              onToggle={(mail, checked) =>
                patch({
                  emailGroupTo: checked
                    ? [...formData.emailGroupTo, mail]
                    : formData.emailGroupTo.filter((m) => m !== mail),
                })
              }
            />
            <EmailAccordion
              label="CC — สำเนาถึง"
              badge={formData.emailGroupCc.length}
              selected={formData.emailGroupCc}
              onToggle={(mail, checked) =>
                patch({
                  emailGroupCc: checked
                    ? [...formData.emailGroupCc, mail]
                    : formData.emailGroupCc.filter((m) => m !== mail),
                })
              }
            />
          </div>
        )}
      </div>
    );
  }

  function renderSignaturePad() {
    return (
      <div className="flex-1 overflow-y-auto p-5 md:p-7">
        <p className="mb-4 text-sm text-slate-600">
          กรุณาลงลายมือชื่อเพื่อยืนยันการสร้างแผนการตรวจสอบ
        </p>
        <SignaturePad
          onConfirm={(dataUrl) => handleSignatureConfirm(dataUrl)}
          onCancel={() => setStep("email")}
        />
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
        <p className="text-sm text-slate-600">
          เลือก Reviewer และ Approver สำหรับแผนการตรวจสอบ
        </p>

        {/* Reviewer */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reviewer <span className="text-rose-500">*</span>
          </p>
          <PersonSearch
            placeholder="ค้นหา Reviewer..."
            onSelect={(c) =>
              patch({
                reviewerAuthUserId: c.id,
                reviewerEmail: c.email ?? "",
                reviewerName: c.name,
              })
            }
          />
          {formData.reviewerAuthUserId && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-violet-800">{formData.reviewerName}</p>
                <p className="text-xs text-violet-500">{formData.reviewerEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => patch({ reviewerAuthUserId: "", reviewerEmail: "", reviewerName: "" })}
                className="text-violet-400 hover:text-violet-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Approver */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Approver <span className="text-rose-500">*</span>
          </p>
          <PersonSearch
            placeholder="ค้นหา Approver..."
            onSelect={(c) =>
              patch({
                approverAuthUserId: c.id,
                approverEmail: c.email ?? "",
                approverName: c.name,
              })
            }
          />
          {formData.approverAuthUserId && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-fuchsia-800">{formData.approverName}</p>
                <p className="text-xs text-fuchsia-500">{formData.approverEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => patch({ approverAuthUserId: "", approverEmail: "", approverName: "" })}
                className="text-fuchsia-400 hover:text-fuchsia-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step label ─────────────────────────────────────────────────────────────

  function stepLabel(): string {
    if (step === 1) return "ขั้นที่ 1 / 4 — ข้อมูลแผน";
    if (step === "schedule") return "ขั้นที่ 2 / 4 — ตารางและทีมตรวจ";
    if (step === "email") return "ขั้นที่ 3 / 4 — กลุ่มรับอีเมล";
    if (step === "signature") return "ลงลายมือชื่อ";
    return "ขั้นที่ 4 / 4 — เลือกผู้อนุมัติ";
  }

  function renderFooter() {
    if (step === "signature") return null; // SignaturePad has its own buttons

    if (step === 1) {
      return (
        <div className="flex justify-between border-t border-slate-100 bg-white px-5 py-4 md:px-7">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleStep1Next}>
            ถัดไป <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (step === "schedule") {
      return (
        <div className="flex justify-between border-t border-slate-100 bg-white px-5 py-4 md:px-7">
          <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
            <ChevronLeft className="mr-1 h-4 w-4" /> ย้อนกลับ
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="text-slate-400" onClick={handleScheduleNext}>
              ข้ามก่อน
            </Button>
            <Button type="button" onClick={handleScheduleNext}>
              ถัดไป <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (step === "email") {
      return (
        <div className="flex justify-between border-t border-slate-100 bg-white px-5 py-4 md:px-7">
          <Button type="button" variant="outline" onClick={() => setStep("schedule")} disabled={isSubmitting}>
            <ChevronLeft className="mr-1 h-4 w-4" /> ย้อนกลับ
          </Button>
          <Button type="button" onClick={handleEmailSubmit}>
            ถัดไป <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex justify-between border-t border-slate-100 bg-white px-5 py-4 md:px-7">
          <Button type="button" variant="outline" onClick={() => setStep("signature")} disabled={isSubmitting}>
            <ChevronLeft className="mr-1 h-4 w-4" /> ย้อนกลับ
          </Button>
          <Button type="button" onClick={handleFinalSubmit} disabled={isSubmitting}>
            {isSubmitting && (
              <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      );
    }
  }

  function renderContent() {
    if (step === 1) return renderStep1();
    if (step === "schedule") return renderScheduleStep();
    if (step === "email") return renderEmailStep();
    if (step === "signature") return renderSignaturePad();
    return renderStep3();
  }

  const title = "สร้างแผนการตรวจสอบใหม่";
  const subtitle = stepLabel();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="flex h-[95vh] flex-col gap-0 rounded-t-3xl p-0">
          <SheetHeader className="border-b border-slate-100 px-4 pb-3 pt-2 text-left">
            <SheetTitle className="pr-10 text-base font-bold text-slate-900">{title}</SheetTitle>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </SheetHeader>
          {renderContent()}
          {renderFooter()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[min(96vw,44rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </DialogHeader>
        {renderContent()}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
}

export function AuditPlanFormModalTrigger({ onSuccess }: { onSuccess?: (plan: AuditPlanSummary) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        สร้างแผนใหม่
      </Button>
      <AuditPlanFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}
