"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/shared/RichTextEditor";
import GraphGroupPicker, { type GraphGroupResult } from "@/components/shared/GraphGroupPicker";
import { toast } from "sonner";
import { Loader2, Mail, Send } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  kpiId: string;
  year: number;
  onSuccess: () => void;
}

export default function KpiMasterAnnounceDialog({ open, onClose, kpiId, year, onSuccess }: Props) {
  const [toGroups, setToGroups] = useState<GraphGroupResult[]>([]);
  const [ccGroups, setCcGroups] = useState<GraphGroupResult[]>([]);
  const [wysiwygContent, setWysiwygContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setToGroups([]);
    setCcGroups([]);
    setWysiwygContent(
      `<p>เรียน ทุกท่าน / Dear All,</p>` +
      `<p>ขอประกาศใช้แผนวัตถุประสงค์คุณภาพประจำปี <strong>FM-MR-01 ประจำปี ${year}</strong> ที่ได้รับการอนุมัติอย่างเป็นทางการแล้ว โดยท่านสามารถตรวจสอบแผนงานและดาวน์โหลดเอกสารแนบได้ทางลิงก์แนบในอีเมลนี้ / Please be informed that the Annual Quality Objectives <strong>FM-MR-01 for Year ${year}</strong> has been officially approved. You can check the plan and download attachments via the link provided in this email.</p>` +
      `<p>จึงเรียนมาเพื่อทราบและถือปฏิบัติ / Please be informed and comply accordingly.</p>` +
      `<p>---<br>ฝ่ายควบคุมระบบคุณภาพ (QMS) / Quality Management System (QMS) Department</p>`,
    );
  }, [open, year]);

  const toEmails = Array.from(new Set(
    toGroups.map((group) => group.mail?.trim() ?? "").filter((mail) => mail.length > 0),
  ));
  const ccEmails = Array.from(new Set(
    ccGroups.map((group) => group.mail?.trim() ?? "").filter((mail) => mail.length > 0),
  ));

  const handleSubmit = async () => {
    if (toEmails.length === 0) {
      toast.error("กรุณาเลือกผู้รับอย่างน้อย 1 กลุ่ม / Please select at least 1 recipient group");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/kpi/${kpiId}/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toGroupEmails: toEmails,
          ccGroupEmails: ccEmails,
          wysiwygContent,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to publish announcement");
      }

      toast.success("ประกาศใช้และส่งอีเมลเรียบร้อยแล้ว / Announced and emails sent successfully");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการประกาศใช้ / Error occurred during announcement";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !submitting && !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
            <Mail className="w-5 h-5 text-[#0F1059]" />
            <span>ประกาศใช้และประชาสัมพันธ์ FM-MR-01 / Announce FM-MR-01 ({year})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <GraphGroupPicker
              label="ส่งถึงกลุ่มอีเมล (To) / Recipient Email Groups (To)"
              value={toGroups}
              onChange={setToGroups}
              placeholder="ค้นหากลุ่มอีเมลสำหรับผู้รับหลัก... / Search recipient email groups..."
              required
            />

          </div>

          <div className="space-y-2">
            <GraphGroupPicker
              label="สำเนาถึง (CC) / CC Email Groups (CC)"
              value={ccGroups}
              onChange={setCcGroups}
              placeholder="ค้นหากลุ่มอีเมลสำหรับสำเนา... / Search CC email groups..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">
              รายละเอียดเพิ่มเติม / Additional Email Content
            </label>
            <RichTextEditor
              value={wysiwygContent}
              onChange={setWysiwygContent}
              minHeight={150}
              placeholder="พิมพ์ข้อความรายละเอียดที่นี่... / Type additional details here..."
            />
          </div>

          <div className="rounded-xl border border-[#0F1059]/20 bg-[#0F1059]/5 px-4 py-3 text-xs text-[#0F1059] flex items-center gap-2">
            <Send className="w-4 h-4 shrink-0" />
            <span>อีเมลประกาศจะแนบไฟล์ตารางวัตถุประสงค์คุณภาพประจำปี (PDF) ไปด้วยโดยอัตโนมัติ / The announcement email will automatically attach the Annual Quality Objectives sheet (PDF).</span>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl text-xs font-semibold"
          >
            ยกเลิก / Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || toEmails.length === 0}
            className="bg-[#0F1059] hover:bg-[#161875] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 px-5 h-9"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>ยืนยันส่งประกาศ / Confirm Announcement</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
