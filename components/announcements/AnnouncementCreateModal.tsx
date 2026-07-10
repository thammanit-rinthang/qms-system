"use client";

import { useT } from "@/lib/i18n";
import { useCreateAnnouncement } from "@/hooks/use-create-announcement";
import AnnouncementBgPicker from "@/components/announcements/AnnouncementBgPicker";
import GraphGroupPicker, { type GraphGroupResult } from "@/components/shared/GraphGroupPicker";
import ResponsiveFormOverlay from "@/components/common/ResponsiveFormOverlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (success: boolean, errorMessage?: string) => void;
};

const inputCls = "w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors";
const labelCls = "text-slate-800 text-sm font-semibold mb-2 block";

export default function AnnouncementCreateModal({ open, onClose, onCreated }: Props) {
  const t = useT();
  const { form, setForm, file, setFile, bgImageFile, setBgImageFile, loading, handleSubmit } = useCreateAnnouncement(onCreated);

  if (!open) return null;

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={t("announcement.createTitle")}
      description={t("announcement.createDescription")}
      desktopContentClassName="w-[min(96vw,72rem)] max-w-4xl"
      bodyClassName="space-y-4 px-4 py-5 md:px-6 md:py-6"
      footerClassName="flex-row justify-end gap-2 sm:justify-end"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.title.trim() || !form.content.trim()}
            className="min-w-28"
          >
            {loading && <div className="mr-2 h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {t("announcement.publish")}
          </Button>
        </>
      }
    >
          <div>
            <label className={labelCls}>{t("announcement.fieldTitle")} <span className="text-rose-600">*</span></label>
            <input
              type="text"
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={255}
            />
          </div>

          <div>
            <label className={labelCls}>{t("announcement.fieldContent")} <span className="text-rose-600">*</span></label>
            <Textarea
              className="min-h-28"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              maxLength={5000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("announcement.fieldSourceSystem")}</label>
              <select
                className={`${inputCls}`}
                value={form.sourceSystem}
                onChange={(e) => setForm((f) => ({ ...f, sourceSystem: e.target.value }))}
              >
                {["QMS", "IT", "HR", "GA", "SAFETY"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("announcement.fieldDisplayType")}</label>
              <select
                className={inputCls}
                value={form.displayType}
                onChange={(e) => setForm((f) => ({ ...f, displayType: e.target.value }))}
              >
                <option value="LIST">{t("announcement.displayTypeNormal")}</option>
                <option value="SCROLLING">{t("announcement.displayTypeMain")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("announcement.fieldStartDate")}</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{t("announcement.fieldEndDate")}</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
              <p className="text-slate-400 text-xs mt-1">{t("announcement.endDateHint")}</p>
            </div>
          </div>

          <div>
            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-white transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-[#0F1059] cursor-pointer"
                checked={form.pushToCompanyCenter}
                onChange={(e) => setForm((f) => ({ ...f, pushToCompanyCenter: e.target.checked }))}
              />
              <div>
                <span className="text-slate-800 text-sm font-semibold block">{t("announcement.fieldPushToCompany")}</span>
                <span className="text-slate-400 text-xs">{t("announcement.pushToCompanyHint")}</span>
              </div>
            </label>
          </div>

          <div>
            <label className={labelCls}>{t("announcement.fieldAttachment")}</label>
            <input
              type="file"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#0F1059] file:text-white hover:file:bg-[#161875]"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div>
            <GraphGroupPicker
              label={t("announcement.fieldEmailGroups")}
              value={form.emailGroups}
              onChange={(groups: GraphGroupResult[]) => setForm((f) => ({ ...f, emailGroups: groups }))}
              placeholder={t("announcement.emailGroupsPlaceholder")}
            />
            <p className="text-slate-400 text-xs mt-1">{t("announcement.emailGroupsHint")}</p>
          </div>

          <AnnouncementBgPicker
            bgColor={form.bgColor}
            bgImageUrl={null}
            bgImageFile={bgImageFile}
            textColor={form.textColor}
            onColorChange={(c) => setForm((f) => ({ ...f, bgColor: c }))}
            onImageChange={setBgImageFile}
            onTextColorChange={(c) => setForm((f) => ({ ...f, textColor: c }))}
          />
    </ResponsiveFormOverlay>
  );
}
