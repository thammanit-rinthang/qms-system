"use client";

import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcementService";
import { useEditAnnouncement } from "@/hooks/use-edit-announcement";
import AnnouncementBgPicker from "@/components/announcements/AnnouncementBgPicker";
import ResponsiveFormOverlay from "@/components/common/ResponsiveFormOverlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  item: AnnouncementRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: (success: boolean, errorMessage?: string) => void;
};

const inputCls = "w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors";
const labelCls = "text-slate-800 text-sm font-semibold mb-2 block";

export default function AnnouncementEditModal({ item, open, onClose, onSaved }: Props) {
  const t = useT();
  const { form, setForm, bgImageFile, setBgImageFile, clearBgImage, setClearBgImage, loading, handleSave } = useEditAnnouncement(item, onSaved);
  const isTh = t("common.cancel") === "ยกเลิก";

  const currentBgImageUrl = clearBgImage ? null : (item?.bgImageUrl ?? null);

  if (!open) return null;

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={t("announcement.editTitle")}
      description={item?.title}
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
            onClick={handleSave}
            disabled={loading || !form.title.trim() || !form.content.trim()}
            className="min-w-28"
          >
            {loading && <div className="mr-2 h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {t("common.save")}
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
              className="min-h-[7.5rem]"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              maxLength={5000}
            />
          </div>

          <div>
            <label className={labelCls}>{t("announcement.fieldSourceSystem")}</label>
            <select
              className={inputCls}
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
            </div>
          </div>

          <div>
            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-white transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border border-slate-300 accent-[#0F1059] cursor-pointer mt-0.5 focus:ring-2 focus:ring-[#0F1059] focus:ring-offset-2"
                checked={form.pushToCompanyCenter}
                onChange={(e) => setForm((f) => ({ ...f, pushToCompanyCenter: e.target.checked }))}
              />
              <span className="text-slate-800 text-sm font-medium">{t("announcement.fieldPushToCompany")}</span>
            </label>
          </div>

          <AnnouncementBgPicker
            bgColor={form.bgColor}
            bgImageUrl={currentBgImageUrl}
            bgImageFile={bgImageFile}
            textColor={form.textColor}
            onColorChange={(c) => setForm((f) => ({ ...f, bgColor: c }))}
            onImageChange={(f) => { setBgImageFile(f); setClearBgImage(!f); }}
            onTextColorChange={(c) => setForm((f) => ({ ...f, textColor: c }))}
            isTh={isTh}
          />
    </ResponsiveFormOverlay>
  );
}
