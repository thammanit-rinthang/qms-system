import { useCallback } from "react";
import { useLocale } from "@/lib/locale-context";
import th from "@/messages/th.json";
import en from "@/messages/en.json";

export type Locale = "th" | "en";

const messages = { th, en };

const legacyKeyMap = {
  confirm: "common.confirm",
  cancel: "common.cancel",
  save: "common.save",
  edit: "common.edit",
  delete: "common.delete",
  back: "common.back",
  retry: "common.retry",
  loading: "common.loading",
  error: "common.error",
  errorRetry: "common.errorRetry",
  success: "common.success",
  irreversible: "common.irreversible",
  emptyDarUser: "dar.emptyUser",
  emptyDarUserDesc: "dar.emptyUserDesc",
  emptyDarQms: "dar.emptyQms",
  newRequest: "dar.new",
  sectionRequester: "dar.section.requester",
  sectionObjective: "dar.section.objective",
  sectionReason: "dar.section.reason",
  sectionItems: "dar.section.items",
  sectionDistrib: "dar.section.distrib",
  sectionAttach: "dar.section.attach",
  fieldFullName: "dar.field.fullName",
  fieldEmpId: "dar.field.empId",
  fieldDepartment: "dar.field.department",
  fieldDate: "dar.field.date",
  fieldObjective: "dar.field.objective",
  fieldDocType: "dar.field.docType",
  fieldDocTypeOther: "dar.field.docTypeOther",
  fieldDocNum: "dar.field.docNum",
  fieldDocName: "dar.field.docName",
  fieldRevision: "dar.field.revision",
  fieldEffectiveDate: "dar.field.effectiveDate",
  fieldDarNo: "dar.field.darNo",
  fieldDarNoDraft: "dar.field.darNoDraft",
  phReasonForRequest: "dar.placeholder.reason",
  phSelectObjective: "dar.placeholder.selectObjective",
  phSelectDocType: "dar.placeholder.selectDocType",
  phSpecifyDocType: "dar.placeholder.specifyDocType",
  phDocNum: "dar.placeholder.docNum",
  phDocName: "dar.placeholder.docName",
  phRevision: "dar.placeholder.revision",
  phEffectiveDate: "dar.placeholder.effectiveDate",
  colNo: "dar.table.colNo",
  colDocNum: "dar.table.colDocNum",
  colDocName: "dar.table.colDocName",
  colRevision: "dar.table.colRevision",
  colEffectiveDate: "dar.table.colEffectiveDate",
  emptyItems: "dar.table.emptyItems",
  addItem: "dar.table.addItem",
  emptyItemsTable: "dar.table.emptyItemsTable",
  noDeptFound: "dar.distrib.noDeptFound",
  saveDraft: "dar.action.saveDraft",
  saveEdits: "dar.action.saveEdits",
  submitRequest: "dar.action.submitRequest",
  deleteDraft: "dar.action.deleteDraft",
  confirmDeleteDraft: "dar.action.confirmDeleteDraft",
  deleteDraftMsg: "dar.action.deleteDraftMsg",
  confirmDelete: "dar.action.confirmDelete",
  emptyUsers: "it.users.empty",
  emptyUsersDesc: "it.users.emptyDesc",
  manageDepts: "it.departments.manage",
  noDepts: "it.departments.noDepts",
  emptyDepts: "it.departments.empty",
  emptyDeptsDesc: "it.departments.emptyDesc",
  attachDesc: "sharepoint.attachDesc",
  spTitle: "sharepoint.title",
  spSubtitle: "sharepoint.subtitle",
  spEmpty: "sharepoint.empty",
  spLoadFail: "sharepoint.loadFail",
  spDeleteFail: "sharepoint.deleteFail",
  spNoPreview: "sharepoint.noPreview",
  spOpenSP: "sharepoint.openSP",
  spPdfFallback: "sharepoint.pdfFallback",
  spConfirmDelete: "sharepoint.confirmDelete",
  spDeleteFolder: "sharepoint.deleteFolder",
  spDeleteFile: "sharepoint.deleteFile",
  spDeleteSuffix: "sharepoint.deleteSuffix",
  spDeleteFileSuffix: "sharepoint.deleteFileSuffix",
  spColName: "sharepoint.colName",
  spColType: "sharepoint.colType",
  spColSize: "sharepoint.colSize",
  spColModified: "sharepoint.colModified",
  spPreview: "sharepoint.preview",
  spItems: "sharepoint.items",
  spRefresh: "sharepoint.refresh",
  spGoBack: "sharepoint.goBack",
  spDeleteBtn: "sharepoint.deleteBtn",
  errorTitle: "error.title",
  errorRetryBtn: "error.retryBtn",
  syncBtn: "it.syncBtn",
  syncBtnShort: "it.syncBtnShort",
  syncing: "it.syncing",
  syncSuccess: "it.syncSuccess",
  syncCreated: "it.syncCreated",
  syncUpdated: "it.syncUpdated",
  syncSkipped: "it.syncSkipped",
  serverError: "common.serverError"
} as const;

export type TranslationKey = keyof typeof legacyKeyMap | (string & {});

export function t(
  key: TranslationKey,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  const mappedKey = (legacyKeyMap as Record<string, string>)[key] || key;
  const segments = mappedKey.split(".");
  let current: Record<string, unknown> = messages[locale] as Record<string, unknown>;
  
  for (const segment of segments) {
    if (current && typeof current === "object" && segment in current) {
      const next = current[segment];
      if (next !== null && typeof next === "object") {
        current = next as Record<string, unknown>;
      } else {
        if (typeof next !== "string") return key;
        if (!params) return next;
        return next.replace(/\{(\w+)\}/g, (_, paramKey: string) => {
          const value = params[paramKey];
          return value === undefined ? `{${paramKey}}` : String(value);
        });
      }
    } else {
      return key;
    }
  }

  return key;
}

/** React hook — use inside client components */
export function useT() {
  const locale = useLocale();
  return useCallback((key: TranslationKey, params?: Record<string, string | number>) => t(key, locale, params), [locale]);
}
