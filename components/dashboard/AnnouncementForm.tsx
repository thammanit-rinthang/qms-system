"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readApiErrorMessage, readApiJson } from "@/lib/client-api";
import { useT } from "@/lib/i18n";

type SharePointUploadResponse = {
  data?: {
    id: string;
    webUrl: string;
    "@microsoft.graph.downloadUrl"?: string;
  } | null;
  error?: string | null;
};

export default function AnnouncementForm() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // 1. Upload file if exists
      let attachmentData: SharePointUploadResponse | null = null;
      if (file) {
        const fileData = new FormData();
        // Use URL-encoded filename to bypass Next.js/Undici multipart non-ASCII body parsing bugs
        const safeName = encodeURIComponent(file.name);
        fileData.append("file", file, safeName);
        fileData.append("filename", file.name);
        fileData.append("path", "Announcements");
        
        const uploadRes = await fetch("/api/sharepoint/upload-file", {
          method: "POST",
          body: fileData,
        });
        
        if (!uploadRes.ok) throw new Error(await readApiErrorMessage(uploadRes, t("announcement.uploadFail")));
        attachmentData = await readApiJson<SharePointUploadResponse>(uploadRes, t("announcement.uploadFail"));
      }

      // 2. Add attachment details to formData if uploaded
      if (attachmentData?.data) {
        formData.append("spItemId", attachmentData.data.id);
        formData.append("spWebUrl", attachmentData.data.webUrl);
        formData.append("spDownloadUrl", attachmentData.data["@microsoft.graph.downloadUrl"] || "");
        formData.append("fileName", file!.name);
        formData.append("mimeType", file!.type);
      }

      // 3. Create announcement via Server Action or API
      const createRes = await fetch("/api/announcements", {
        method: "POST",
        body: formData, // passing formData directly to a route handler
      });

      if (!createRes.ok) {
        throw new Error(await readApiErrorMessage(createRes, t("announcement.saveFail")));
      }

      router.push("/qms/announcements");
      router.refresh();

    } catch (error) {
      console.error(error);
      toast.error(t("common.error") + ": " + (error as Error).message, { duration: Infinity });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      <div className="card-premium border border-slate-100 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm md:text-base font-bold text-primary">{t("announcement.details")}</h2>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs md:text-sm font-semibold mb-2 text-slate-700">{t("announcement.fieldTitle")} <span className="text-rose-500">*</span></label>
            <Input type="text" name="title" required className="w-full text-sm" placeholder={t("announcement.placeholderTitle")} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs md:text-sm font-semibold mb-2 text-slate-700">{t("announcement.fieldContent")} <span className="text-rose-500">*</span></label>
            <Textarea name="content" required className="h-32" placeholder={t("announcement.placeholderContent")} />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-semibold mb-2 text-slate-700">{t("announcement.fieldSourceSystem")}</label>
            <select name="sourceSystem" className="w-full h-9 px-3 py-1 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="QMS">QMS</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="GA">GA</option>
              <option value="SAFETY">SAFETY</option>
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-semibold mb-2 text-slate-700">{t("announcement.fieldDisplayType")}</label>
            <select name="displayType" className="w-full h-9 px-3 py-1 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="LIST">{t("announcement.displayTypeList")}</option>
              <option value="SCROLLING">{t("announcement.displayTypeScrolling")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-semibold mb-2 text-slate-700">{t("announcement.fieldStartDate")} <span className="text-gray-400 font-normal text-xs">{t("common.optional")}</span></label>
            <Input type="datetime-local" name="startDate" className="w-full text-sm" />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-semibold mb-2 text-slate-700">{t("announcement.fieldEndDate")} <span className="text-gray-400 font-normal text-xs">{t("common.optional")}</span></label>
            <Input type="datetime-local" name="endDate" className="w-full text-sm" />
            <p className="text-[11px] md:text-xs text-gray-500 mt-1">{t("announcement.endDateHint")}</p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer">
              <input type="checkbox" name="pushToCompanyCenter" value="true" defaultChecked className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500" />
              <div>
                <span className="text-xs md:text-sm font-semibold block">{t("announcement.fieldPushToCompany")}</span>
                <span className="text-[11px] md:text-xs text-gray-500">{t("announcement.pushToCompanyHint")}</span>
              </div>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs md:text-sm font-semibold mb-2 text-slate-700">{t("announcement.fieldAttachment")} <span className="text-gray-400 font-normal text-xs">{t("common.optional")}</span></label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm pt-1.5"
            />
            {file && (
              <p className="text-[11px] md:text-xs text-primary mt-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200">
          <Button type="button" onClick={() => router.back()} variant="ghost" size="sm">{t("common.cancel")}</Button>
          <Button type="submit" disabled={loading} size="sm" className="min-w-37.5">
            {loading ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : t("announcement.publishBtn")}
          </Button>
        </div>
      </div>
    </form>
  );
}
