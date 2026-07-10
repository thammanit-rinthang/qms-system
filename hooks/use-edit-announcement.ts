"use client";

import { useState, useEffect } from "react";
import type { AnnouncementRow } from "@/services/announcementService";
import { getErrorMessage } from "@/lib/error-message";

export type EditFormData = {
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  pushToCompanyCenter: boolean;
  startDate: string;
  endDate: string;
  bgColor: string;
  textColor: string;
};

function formatDatetimeLocal(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM: EditFormData = {
  title: "", content: "", sourceSystem: "QMS", displayType: "LIST",
  pushToCompanyCenter: false, startDate: "", endDate: "", bgColor: "#0F1059", textColor: "#FFFFFF",
};

export function useEditAnnouncement(
  item: AnnouncementRow | null,
  onSaved: (success: boolean, errorMessage?: string) => void,
) {
  const [form, setForm] = useState<EditFormData>(EMPTY_FORM);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [clearBgImage, setClearBgImage] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title, content: item.content, sourceSystem: item.sourceSystem,
        displayType: item.displayType, pushToCompanyCenter: item.pushToCompanyCenter,
        startDate: formatDatetimeLocal(item.startDate), endDate: formatDatetimeLocal(item.endDate),
        bgColor: item.bgColor ?? "#0F1059",
        textColor: item.textColor ?? "#FFFFFF",
      });
      setBgImageFile(null);
      setClearBgImage(false);
    }
  }, [item]);

  async function handleSave() {
    if (!item) return;
    setLoading(true);
    try {
      let bgImageUrl: string | null = item.bgImageUrl;
      let bgImageSpId: string | null = item.bgImageSpId;

      if (clearBgImage) {
        bgImageUrl = null;
        bgImageSpId = null;
      }

      if (bgImageFile) {
        const fd = new FormData();
        fd.append("file", bgImageFile);
        fd.append("path", "Announcements/Backgrounds");
        const uploadRes = await fetch("/api/sharepoint/upload-file", { method: "POST", body: fd });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const upload = (await uploadRes.json()) as { data: { id: string; webUrl: string } | null };
        if (upload.data) { bgImageUrl = upload.data.webUrl; bgImageSpId = upload.data.id; }
      }

      const body = {
        title: form.title, content: form.content, sourceSystem: form.sourceSystem,
        displayType: form.displayType, pushToCompanyCenter: form.pushToCompanyCenter,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        bgColor: bgImageUrl ? null : form.bgColor,
        bgImageUrl, bgImageSpId,
        textColor: form.textColor,
      };

      const res = await fetch(`/api/announcements/${item.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data: unknown; error: unknown };
      onSaved(res.ok && !json.error, json.error ? getErrorMessage(json.error) : undefined);
    } catch {
      onSaved(false);
    } finally {
      setLoading(false);
    }
  }

  return { form, setForm, bgImageFile, setBgImageFile, clearBgImage, setClearBgImage, loading, handleSave };
}
