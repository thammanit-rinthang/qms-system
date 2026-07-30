"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/error-message";
import type { GraphGroupResult } from "@/components/shared/GraphGroupPicker";

export type CreateFormData = {
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  startDate: string;
  endDate: string;
  pushToCompanyCenter: boolean;
  bgColor: string;
  textColor: string;
  emailGroups: GraphGroupResult[];
};

const EMPTY_FORM: CreateFormData = {
  title: "",
  content: "",
  sourceSystem: "QMS",
  displayType: "LIST",
  startDate: "",
  endDate: "",
  pushToCompanyCenter: true,
  bgColor: "#0F1059",
  textColor: "#FFFFFF",
  emailGroups: [],
};

export function useCreateAnnouncement(
  onCreated: (success: boolean, errorMessage?: string) => void,
) {
  const [form, setForm] = useState<CreateFormData>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setForm(EMPTY_FORM);
    setFile(null);
    setBgImageFile(null);
  }

  async function uploadToSharePoint(f: File, path: string) {
    const fd = new FormData();
    // Use URL-encoded filename to bypass Next.js/Undici multipart non-ASCII body parsing bugs
    const safeName = encodeURIComponent(f.name);
    fd.append("file", f, safeName);
    fd.append("filename", f.name);
    fd.append("path", path);
    const res = await fetch("/api/sharepoint/upload-file", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()) as { data: { id: string; webUrl: string; "@microsoft.graph.downloadUrl"?: string } | null };
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("content", form.content);
      formData.append("sourceSystem", form.sourceSystem);
      formData.append("displayType", form.displayType);
      formData.append("pushToCompanyCenter", String(form.pushToCompanyCenter));
      if (form.startDate) formData.append("startDate", new Date(form.startDate).toISOString());
      if (form.endDate) formData.append("endDate", new Date(form.endDate).toISOString());
      formData.append("bgColor", form.bgColor);
      formData.append("textColor", form.textColor);
      const mails = form.emailGroups.map((g) => g.mail ?? g.id).filter((v) => v.includes("@"));
      console.log("[announcement] emailGroups:", form.emailGroups, "mails:", mails);
      if (mails.length) {
        formData.append("emailGroupMails", JSON.stringify(mails));
      }

      // Upload attachment
      if (file) {
        const upload = await uploadToSharePoint(file, "Announcements");
        if (upload.data) {
          formData.append("spItemId", upload.data.id);
          formData.append("spWebUrl", upload.data.webUrl);
          formData.append("spDownloadUrl", upload.data["@microsoft.graph.downloadUrl"] ?? "");
          formData.append("fileName", file.name);
          formData.append("mimeType", file.type);
        }
      }

      // Upload background image
      if (bgImageFile) {
        const upload = await uploadToSharePoint(bgImageFile, "Announcements/Backgrounds");
        if (upload.data) {
          formData.append("bgImageUrl", upload.data.webUrl);
          formData.append("bgImageSpId", upload.data.id);
          formData.delete("bgColor"); // image takes priority
        }
      }

      const res = await fetch("/api/announcements", { method: "POST", body: formData });
      const json = (await res.json()) as { data: unknown; error: unknown };
      if (!res.ok || json.error) { onCreated(false, getErrorMessage(json.error)); return; }
      reset();
      onCreated(true);
    } catch {
      onCreated(false);
    } finally {
      setLoading(false);
    }
  }

  return { form, setForm, file, setFile, bgImageFile, setBgImageFile, loading, handleSubmit, reset };
}
