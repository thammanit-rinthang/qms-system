import ExcelJS from "exceljs";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const DAR_SHEET = "DAR";
const CAR_SHEET = "CAR";
const KPI_SHEET = "KPI";
const KPI_MONTHLY_SHEET = "KPI Monthly";

const MONTH_ALIASES: Record<string, string> = {
  jan: "Jan",
  january: "Jan",
  feb: "Feb",
  february: "Feb",
  mar: "Mar",
  march: "Mar",
  apr: "Apr",
  april: "Apr",
  may: "May",
  jun: "Jun",
  june: "Jun",
  jul: "Jul",
  july: "Jul",
  aug: "Aug",
  august: "Aug",
  sep: "Sep",
  sept: "Sep",
  september: "Sep",
  oct: "Oct",
  october: "Oct",
  nov: "Nov",
  november: "Nov",
  dec: "Dec",
  december: "Dec",
};

const DAR_STATUS = new Set(["DRAFT", "PENDING_REVIEW", "PENDING_APPROVE", "QMS_PROCESSING", "COMPLETED", "CANCELLED"]);
const CAR_STATUS = new Set(["DRAFT", "ISSUED", "RESPONDED", "VERIFY_1", "VERIFY_2", "CLOSED", "RE_CAR", "CANCELLED"]);
const CAR_SOURCE = new Set(["I", "C", "N", "O"]);
const KPI_STATUS = new Set(["DRAFT", "PENDING_REVIEW", "PENDING_APPROVAL", "APPROVED", "REJECTED"]);
const MONTHLY_STATUS = new Set(["DRAFT", "PENDING_REVIEW", "PENDING_APPROVAL", "APPROVED", "REJECTED"]);
const ACHIEVED_STATUS = new Set(["PENDING", "OK", "NOT_OK"]);
const VERIFY_RESULT = new Set(["PASSED", "FAILED"]);
const RESPONSE_TYPE = new Set(["FIVE_WHY", "OTHER"]);

type ImportModule = "dar" | "car" | "kpi" | "kpi-monthly";

type LegacyImportOptions = {
  filePath: string;
  modules?: ImportModule[];
  dryRun?: boolean;
  upsert?: boolean;
};

type ImportCounters = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

type ImportError = {
  module: ImportModule;
  sheet: string;
  row: number;
  key: string;
  message: string;
};

type ImportResult = {
  dryRun: boolean;
  workbook: string;
  modules: Record<ImportModule, ImportCounters>;
  errors: ImportError[];
};

type RowMap = Record<string, string>;

type PersonSnapshot = {
  id: string;
  authUserId: string | null;
  name: string | null;
  email: string | null;
  employeeId: string | null;
};

type DepartmentSnapshot = {
  id: string;
  authDepartmentId: string | null;
  name: string;
};

type DarGroup = {
  key: string;
  rows: { rowNumber: number; values: RowMap }[];
};

type KpiGroup = {
  key: string;
  rows: { rowNumber: number; values: RowMap }[];
};

type MonthlyGroup = {
  key: string;
  rows: { rowNumber: number; values: RowMap }[];
};

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function parseStringList(value: string, delimiters = /[|,;\n]/) {
  return value
    .split(delimiters)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseBoolean(value: string, fallback = false) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value: string, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a number`);
  }
  return parsed;
}

function parseDate(value: string, field: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} must be a valid date`);
  }
  return parsed;
}

function parseOptionalDate(value: string) {
  if (!value) return null;
  return parseDate(value, "date");
}

function parseEnum<T extends string>(value: string, allowed: Set<string>, field: string) {
  const upper = value.trim().toUpperCase();
  if (!allowed.has(upper)) {
    throw new Error(`${field} has unsupported value "${value}"`);
  }
  return upper as T;
}

function parseMonth(value: string) {
  const normalized = value.trim().toLowerCase();
  const month = MONTH_ALIASES[normalized];
  if (!month) {
    throw new Error(`month has unsupported value "${value}"`);
  }
  return month;
}

function parseJson<T>(value: string, field: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${field} must be valid JSON`);
  }
}

function makeLegacyId(prefix: string, ...parts: Array<string | null | undefined>) {
  const token = parts
    .map((part) => cleanString(part).toLowerCase())
    .filter(Boolean)
    .join("|")
    .replace(/[^a-z0-9|._-]/g, "-");
  return `${prefix}:${token || "unknown"}`;
}

function buildPerson(name: string, email: string, employeeId: string, preferredKey?: string) {
  const key = preferredKey || email || employeeId || name;
  return {
    id: makeLegacyId("legacy-user", key),
    authUserId: null,
    name: name || null,
    email: email || null,
    employeeId: employeeId || null,
  } satisfies PersonSnapshot;
}

function buildDepartment(name: string, code: string) {
  const normalizedName = cleanString(name);
  const normalizedCode = cleanString(code);
  const key = normalizedCode || normalizedName;
  return {
    id: key,
    authDepartmentId: normalizedCode || null,
    name: normalizedName || key,
  } satisfies DepartmentSnapshot;
}

function getWorksheet(workbook: ExcelJS.Workbook, name: string) {
  return workbook.getWorksheet(name) ?? null;
}

function readSheetRows(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  const headers = headerRow.values as Array<string | number | undefined>;
  const headerMap = new Map<number, string>();

  headers.forEach((header, index) => {
    if (index === 0) return;
    const key = cleanString(header);
    if (key) headerMap.set(index, key);
  });

  const rows: Array<{ rowNumber: number; values: RowMap }> = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: RowMap = {};
    let hasData = false;
    headerMap.forEach((header, index) => {
      const raw = row.getCell(index).value;
      const value =
        raw instanceof Date
          ? raw.toISOString()
          : typeof raw === "object" && raw && "text" in raw
            ? cleanString((raw as { text?: string }).text)
            : cleanString(raw);
      values[header] = value;
      if (value) hasData = true;
    });
    if (hasData) rows.push({ rowNumber, values });
  });

  return rows;
}

function groupRows(rows: Array<{ rowNumber: number; values: RowMap }>, keyField: string, moduleLabel: string) {
  const grouped = new Map<string, Array<{ rowNumber: number; values: RowMap }>>();
  for (const row of rows) {
    const key = cleanString(row.values[keyField]);
    if (!key) {
      throw new Error(`${moduleLabel} row ${row.rowNumber} is missing ${keyField}`);
    }
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }
  return grouped;
}

async function ensureKpiDepartment(name: string, emailGroup?: string | null) {
  const existing = await db.kpiDept.findUnique({ where: { name } });
  if (existing) return existing;
  return db.kpiDept.create({
    data: {
      name,
      emailGroup: emailGroup ?? null,
      isActive: true,
    },
  });
}

async function upsertApprovalSignatures(
  tx: Prisma.TransactionClient,
  module: "KPI" | "KPI_MONTHLY",
  documentId: string,
  entries: Array<{
    step: "PREPARER" | "REVIEWER" | "APPROVER";
    action: "PENDING" | "APPROVED" | "REJECTED";
    actor: PersonSnapshot;
    departmentName?: string | null;
    actionDate?: Date | null;
    comment?: string | null;
  }>
) {
  await tx.approvalSignature.deleteMany({
    where: { module, documentId },
  });

  for (const entry of entries) {
    await tx.approvalSignature.create({
      data: {
        module,
        documentId,
        step: entry.step,
        action: entry.action,
        actionDate: entry.actionDate ?? null,
        signerUserId: entry.actor.id,
        signerAuthUserId: entry.actor.authUserId,
        signerName: entry.actor.name,
        signerEmail: entry.actor.email,
        signerDepartmentName: entry.departmentName ?? null,
        comment: entry.comment ?? null,
      },
    });
  }
}

export class LegacyImportService {
  async importWorkbook(options: LegacyImportOptions): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(options.filePath);

    const requestedModules = new Set<ImportModule>(options.modules?.length ? options.modules : ["dar", "car", "kpi", "kpi-monthly"]);
    const result: ImportResult = {
      dryRun: options.dryRun ?? false,
      workbook: options.filePath,
      modules: {
        dar: { created: 0, updated: 0, skipped: 0, errors: 0 },
        car: { created: 0, updated: 0, skipped: 0, errors: 0 },
        kpi: { created: 0, updated: 0, skipped: 0, errors: 0 },
        "kpi-monthly": { created: 0, updated: 0, skipped: 0, errors: 0 },
      },
      errors: [],
    };

    if (requestedModules.has("dar")) {
      await this.runModule(result, "dar", DAR_SHEET, options, async () => {
        const sheet = getWorksheet(workbook, DAR_SHEET);
        if (!sheet) return;
        const grouped = groupRows(readSheetRows(sheet), "darNo", "DAR");
        for (const [key, rows] of grouped.entries()) {
          await this.importDarGroup({ key, rows }, options, result);
        }
      });
    }

    if (requestedModules.has("car")) {
      await this.runModule(result, "car", CAR_SHEET, options, async () => {
        const sheet = getWorksheet(workbook, CAR_SHEET);
        if (!sheet) return;
        const rows = readSheetRows(sheet);
        for (const row of rows) {
          await this.importCarRow(row.rowNumber, row.values, options, result);
        }
        await this.resolveReCarLinks(options, result);
      });
    }

    if (requestedModules.has("kpi")) {
      await this.runModule(result, "kpi", KPI_SHEET, options, async () => {
        const sheet = getWorksheet(workbook, KPI_SHEET);
        if (!sheet) return;
        const rows = readSheetRows(sheet).map((row) => ({
          ...row,
          values: {
            ...row.values,
            kpiKey: `${cleanString(row.values.department)}|${cleanString(row.values.yearly)}`,
          },
        }));
        const grouped = groupRows(rows, "kpiKey", "KPI");
        for (const [key, rows] of grouped.entries()) {
          await this.importKpiGroup({ key, rows }, options, result);
        }
      });
    }

    if (requestedModules.has("kpi-monthly")) {
      await this.runModule(result, "kpi-monthly", KPI_MONTHLY_SHEET, options, async () => {
        const sheet = getWorksheet(workbook, KPI_MONTHLY_SHEET);
        if (!sheet) return;
        const rows = readSheetRows(sheet).map((row) => ({
          ...row,
          values: {
            ...row.values,
            monthlyKey: `${cleanString(row.values.department)}|${cleanString(row.values.yearly)}|${cleanString(row.values.month)}`,
          },
        }));
        const grouped = groupRows(rows, "monthlyKey", "KPI Monthly");
        for (const [key, groupedRows] of grouped.entries()) {
          await this.importMonthlyGroup({ key, rows: groupedRows }, options, result);
        }
      });
    }

    return result;
  }

  private async runModule(
    result: ImportResult,
    module: ImportModule,
    sheetName: string,
    options: LegacyImportOptions,
    runner: () => Promise<void>
  ) {
    try {
      await runner();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.modules[module].errors += 1;
      result.errors.push({
        module,
        sheet: sheetName,
        row: 0,
        key: "",
        message,
      });
      if (!options.dryRun) {
        throw error;
      }
    }
  }

  private async importDarGroup(group: DarGroup, options: LegacyImportOptions, result: ImportResult) {
    const head = group.rows[0];
    try {
      const row = head.values;
      const requester = buildPerson(row.requesterName, row.requesterEmail, row.requesterEmployeeId, row.requesterEmail || row.requesterEmployeeId || row.requesterName);
      const department = buildDepartment(row.requesterDepartmentName, row.departmentCode);
      const status = parseEnum<"DRAFT" | "PENDING_REVIEW" | "PENDING_APPROVE" | "QMS_PROCESSING" | "COMPLETED" | "CANCELLED">(row.status || "DRAFT", DAR_STATUS, "status");
      const requestDate = parseDate(row.requestDate, "requestDate");
      const distributions = parseStringList(row.distributionDepartments);
      const items = group.rows.map((entry, index) => ({
        itemNo: entry.values.itemNo ? parseNumber(entry.values.itemNo, "itemNo") : index + 1,
        docNumber: cleanString(entry.values.docNumber),
        docName: cleanString(entry.values.docName),
        revision: cleanString(entry.values.revision || "-"),
      }));

      if (items.some((item) => !item.docNumber || !item.docName)) {
        throw new Error("every DAR item must include docNumber and docName");
      }

      const qmsUser = buildPerson(row.qmsUserName, "", row.qmsUserEmployeeId, row.qmsUserEmployeeId || row.qmsUserName);
      const qmsProcessDate = parseOptionalDate(row.qmsProcessDate);

      const existing = await db.darMaster.findUnique({
        where: { darNo: group.key },
        select: { id: true },
      });

      if (existing && !options.upsert) {
        result.modules.dar.skipped += 1;
        return;
      }

      if (!options.dryRun) {
        await db.$transaction(async (tx) => {
          const master = existing
            ? await tx.darMaster.update({
                where: { id: existing.id },
                data: {
                  requestDate,
                  objective: cleanString(row.objective),
                  docType: cleanString(row.docType),
                  docTypeOther: cleanString(row.docTypeOther) || null,
                  reason: cleanString(row.reason),
                  status,
                  requesterId: requester.id,
                  requesterAuthUserId: requester.authUserId,
                  requesterName: requester.name,
                  requesterEmployeeId: requester.employeeId,
                  requesterEmail: requester.email,
                  requesterDepartmentName: department.name,
                  departmentId: department.id,
                  authDepartmentId: department.authDepartmentId,
                },
              })
            : await tx.darMaster.create({
                data: {
                  darNo: group.key,
                  requestDate,
                  objective: cleanString(row.objective),
                  docType: cleanString(row.docType),
                  docTypeOther: cleanString(row.docTypeOther) || null,
                  reason: cleanString(row.reason),
                  status,
                  requesterId: requester.id,
                  requesterAuthUserId: requester.authUserId,
                  requesterName: requester.name,
                  requesterEmployeeId: requester.employeeId,
                  requesterEmail: requester.email,
                  requesterDepartmentName: department.name,
                  departmentId: department.id,
                  authDepartmentId: department.authDepartmentId,
                },
              });

          await tx.darItem.deleteMany({ where: { darMasterId: master.id } });
          await tx.darDistribution.deleteMany({ where: { darMasterId: master.id } });
          await tx.qmsProcessing.deleteMany({ where: { darMasterId: master.id } });

          await tx.darItem.createMany({
            data: items.map((item) => ({
              darMasterId: master.id,
              itemNo: item.itemNo,
              docNumber: item.docNumber,
              docName: item.docName,
              revision: item.revision,
            })),
          });

          if (distributions.length > 0) {
            await tx.darDistribution.createMany({
              data: distributions.map((entry) => {
                const [codeOrName, maybeName] = entry.includes(":") ? entry.split(":", 2) : [entry, ""];
                const distDept = buildDepartment(maybeName || codeOrName, maybeName ? codeOrName : "");
                return {
                  darMasterId: master.id,
                  departmentId: distDept.id,
                  authDepartmentId: distDept.authDepartmentId,
                  departmentName: distDept.name,
                };
              }),
            });
          }

          if (qmsProcessDate || row.qmsComments || row.qmsUserName) {
            await tx.qmsProcessing.create({
              data: {
                darMasterId: master.id,
                qmsUserId: qmsUser.id,
                qmsAuthUserId: qmsUser.authUserId,
                qmsUserName: qmsUser.name,
                qmsUserEmployeeId: qmsUser.employeeId,
                processDate: qmsProcessDate,
                comments: cleanString(row.qmsComments) || null,
                chkHasAttachment: parseBoolean(row.qmsChkHasAttachment),
                chkPrintAndValidate: parseBoolean(row.qmsChkPrintAndValidate),
                chkRenumber: parseBoolean(row.qmsChkRenumber),
                chkImpactInvestigated: parseBoolean(row.qmsChkImpactInvestigated),
                chkSubmitVerification: parseBoolean(row.qmsChkSubmitVerification),
                chkGetBackProcess: parseBoolean(row.qmsChkGetBackProcess),
                chkCopyDistribute: parseBoolean(row.qmsChkCopyDistribute),
              },
            });
          }
        });
      }

      if (existing) result.modules.dar.updated += 1;
      else result.modules.dar.created += 1;
    } catch (error) {
      this.pushError(result, "dar", DAR_SHEET, head.rowNumber, group.key, error);
    }
  }

  private async importCarRow(rowNumber: number, row: RowMap, options: LegacyImportOptions, result: ImportResult) {
    const key = cleanString(row.carNo);
    try {
      if (!key) throw new Error("carNo is required");
      const status = parseEnum<"DRAFT" | "ISSUED" | "RESPONDED" | "VERIFY_1" | "VERIFY_2" | "CLOSED" | "RE_CAR" | "CANCELLED">(row.status || "DRAFT", CAR_STATUS, "status");
      const sourceType = parseEnum<"I" | "C" | "N" | "O">(row.sourceType, CAR_SOURCE, "sourceType");
      const issuer = buildPerson(row.issuerName, row.issuerEmail, row.issuerEmployeeId, row.issuerEmail || row.issuerEmployeeId || row.issuerName);
      const targetDepartment = buildDepartment(row.targetDepartmentName, row.targetDepartmentCode);
      const existing = await db.carMaster.findUnique({
        where: { carNo: key },
        select: { id: true },
      });

      if (existing && !options.upsert) {
        result.modules.car.skipped += 1;
        return;
      }

      const carYear = row.carYear ? parseNumber(row.carYear, "carYear") : parseDate(row.issuedAt || row.createdAt || new Date().toISOString(), "issuedAt").getFullYear();
      const sequenceNo = row.sequenceNo ? parseNumber(row.sequenceNo, "sequenceNo") : 1;
      const issuedAt = parseOptionalDate(row.issuedAt);
      const responseDueAt = parseOptionalDate(row.responseDueAt);

      const responsePayload = row.respondedAt || row.rootCauseSummary || row.immediateAction
        ? {
            responder: buildPerson(row.responderName, row.responderEmail, row.responderEmployeeId, row.responderEmail || row.responderEmployeeId || row.responderName),
            responderPosition: cleanString(row.responderPosition || "-"),
            respondedAt: parseDate(row.respondedAt || row.issuedAt, "respondedAt"),
            responseType: parseEnum<"FIVE_WHY" | "OTHER">(row.responseType || "FIVE_WHY", RESPONSE_TYPE, "responseType"),
            fiveWhys: row.fiveWhysJson ? parseJson<Array<{ question: string; answer: string }>>(row.fiveWhysJson, "fiveWhysJson") : null,
            whyAnalysis: cleanString(row.whyAnalysis),
            additionalToolDetail: cleanString(row.additionalToolDetail) || null,
            rootCausePerson: parseBoolean(row.rootCausePerson),
            rootCauseMaterial: parseBoolean(row.rootCauseMaterial),
            rootCauseMachine: parseBoolean(row.rootCauseMachine),
            rootCauseMethod: parseBoolean(row.rootCauseMethod),
            rootCauseOther: parseBoolean(row.rootCauseOther),
            rootCauseOtherDetail: cleanString(row.rootCauseOtherDetail) || null,
            rootCauseSummary: cleanString(row.rootCauseSummary || "-"),
            immediateAction: cleanString(row.immediateAction || "-"),
            preventiveAction: cleanString(row.preventiveAction || "-"),
            plannedCompletionDate: parseDate(row.plannedCompletionDate || row.respondedAt || row.issuedAt, "plannedCompletionDate"),
          }
        : null;

      const verify1 = row.verify1Result
        ? {
            result: parseEnum<"PASSED" | "FAILED">(row.verify1Result, VERIFY_RESULT, "verify1Result"),
            verifiedAt: parseDate(row.verify1Date, "verify1Date"),
            findings: cleanString(row.verify1Findings || "-"),
            verifier: buildPerson(row.verify1VerifierName, row.verify1VerifierEmail, row.verify1VerifierEmployeeId, row.verify1VerifierEmail || row.verify1VerifierEmployeeId || row.verify1VerifierName),
            verifierPosition: cleanString(row.verify1VerifierPosition || "-"),
            nextDueDate: parseOptionalDate(row.verify1NextDueDate),
          }
        : null;

      const verify2 = row.verify2Result
        ? {
            result: parseEnum<"PASSED" | "FAILED">(row.verify2Result, VERIFY_RESULT, "verify2Result"),
            verifiedAt: parseDate(row.verify2Date, "verify2Date"),
            findings: cleanString(row.verify2Findings || "-"),
            verifier: buildPerson(row.verify2VerifierName, row.verify2VerifierEmail, row.verify2VerifierEmployeeId, row.verify2VerifierEmail || row.verify2VerifierEmployeeId || row.verify2VerifierName),
            verifierPosition: cleanString(row.verify2VerifierPosition || "-"),
          }
        : null;

      const mrReview = row.mrReviewAction
        ? {
            action: cleanString(row.mrReviewAction).toUpperCase(),
            reviewedAt: parseDate(row.mrReviewDate || row.verify1Date || row.respondedAt, "mrReviewDate"),
            actor: buildPerson(row.mrReviewBy, row.mrReviewEmail, "", row.mrReviewEmail || row.mrReviewBy),
            comment: cleanString(row.mrReviewComment) || null,
          }
        : null;

      const mrSignature = row.mrSignedAt
        ? {
            signedAt: parseDate(row.mrSignedAt, "mrSignedAt"),
            actor: buildPerson(row.mrSignerName, row.mrSignerEmail, "", row.mrSignerEmail || row.mrSignerName),
            comment: cleanString(row.mrSignComment) || null,
          }
        : null;

      if (!options.dryRun) {
        await db.$transaction(async (tx) => {
          const master = existing
            ? await tx.carMaster.update({
                where: { id: existing.id },
                data: {
                  carYear,
                  sequenceNo,
                  status,
                  sourceType,
                  sourceDetail: cleanString(row.sourceDetail) || null,
                  isoStandards: parseStringList(row.isoStandards),
                  defectDetail: cleanString(row.defectDetail),
                  nonConformanceRef: cleanString(row.nonConformanceRef),
                  issuerId: issuer.id,
                  issuerAuthUserId: issuer.authUserId,
                  issuerName: issuer.name,
                  issuerEmployeeId: issuer.employeeId,
                  issuerPosition: cleanString(row.issuerPosition),
                  issuedAt,
                  targetDepartmentId: targetDepartment.id,
                  targetAuthDepartmentId: targetDepartment.authDepartmentId,
                  targetDepartmentName: targetDepartment.name,
                  targetEmailGroups: parseStringList(row.targetEmailGroups),
                  targetEmailGroupsCc: parseStringList(row.targetEmailGroupsCc),
                  responseDueAt,
                  reCar: parseBoolean(row.reCar),
                  reCarRefId: null,
                },
              })
            : await tx.carMaster.create({
                data: {
                  carNo: key,
                  carYear,
                  sequenceNo,
                  status,
                  sourceType,
                  sourceDetail: cleanString(row.sourceDetail) || null,
                  isoStandards: parseStringList(row.isoStandards),
                  defectDetail: cleanString(row.defectDetail),
                  nonConformanceRef: cleanString(row.nonConformanceRef),
                  issuerId: issuer.id,
                  issuerAuthUserId: issuer.authUserId,
                  issuerName: issuer.name,
                  issuerEmployeeId: issuer.employeeId,
                  issuerPosition: cleanString(row.issuerPosition),
                  issuedAt,
                  targetDepartmentId: targetDepartment.id,
                  targetAuthDepartmentId: targetDepartment.authDepartmentId,
                  targetDepartmentName: targetDepartment.name,
                  targetEmailGroups: parseStringList(row.targetEmailGroups),
                  targetEmailGroupsCc: parseStringList(row.targetEmailGroupsCc),
                  responseDueAt,
                  reCar: parseBoolean(row.reCar),
                },
              });

          await tx.carResponse.deleteMany({ where: { carMasterId: master.id } });
          await tx.carVerification.deleteMany({ where: { carMasterId: master.id } });
          await tx.carMrResponseReview.deleteMany({ where: { carMasterId: master.id } });
          await tx.carMrSignature.deleteMany({ where: { carMasterId: master.id } });

          if (responsePayload) {
            const responseRecord = await tx.carResponse.create({
              data: {
                carMasterId: master.id,
                responderId: responsePayload.responder.id,
                responderAuthUserId: responsePayload.responder.authUserId,
                responderName: responsePayload.responder.name,
                responderEmployeeId: responsePayload.responder.employeeId,
                responderPosition: responsePayload.responderPosition,
                respondedAt: responsePayload.respondedAt,
                responseType: responsePayload.responseType,
                fiveWhys: responsePayload.fiveWhys ? (responsePayload.fiveWhys as Prisma.InputJsonValue) : Prisma.JsonNull,
                whyAnalysis: responsePayload.whyAnalysis,
                additionalToolDetail: responsePayload.additionalToolDetail,
                rootCausePerson: responsePayload.rootCausePerson,
                rootCauseMaterial: responsePayload.rootCauseMaterial,
                rootCauseMachine: responsePayload.rootCauseMachine,
                rootCauseMethod: responsePayload.rootCauseMethod,
                rootCauseOther: responsePayload.rootCauseOther,
                rootCauseOtherDetail: responsePayload.rootCauseOtherDetail,
                rootCauseSummary: responsePayload.rootCauseSummary,
                immediateAction: responsePayload.immediateAction,
                preventiveAction: responsePayload.preventiveAction,
                plannedCompletionDate: responsePayload.plannedCompletionDate,
              },
            });
            void responseRecord;
          }

          if (verify1) {
            await tx.carVerification.create({
              data: {
                carMasterId: master.id,
                round: 1,
                verifierId: verify1.verifier.id,
                verifierAuthUserId: verify1.verifier.authUserId,
                verifierName: verify1.verifier.name,
                verifierEmployeeId: verify1.verifier.employeeId,
                verifierPosition: verify1.verifierPosition,
                verifiedAt: verify1.verifiedAt,
                findings: verify1.findings,
                result: verify1.result,
                nextDueDate: verify1.nextDueDate,
              },
            });
          }

          if (verify2) {
            await tx.carVerification.create({
              data: {
                carMasterId: master.id,
                round: 2,
                verifierId: verify2.verifier.id,
                verifierAuthUserId: verify2.verifier.authUserId,
                verifierName: verify2.verifier.name,
                verifierEmployeeId: verify2.verifier.employeeId,
                verifierPosition: verify2.verifierPosition,
                verifiedAt: verify2.verifiedAt,
                findings: verify2.findings,
                result: verify2.result,
              },
            });
          }

          if (mrReview) {
            await tx.carMrResponseReview.create({
              data: {
                carMasterId: master.id,
                mrUserId: mrReview.actor.id,
                mrAuthUserId: mrReview.actor.authUserId,
                mrUserName: mrReview.actor.name,
                mrEmployeeId: mrReview.actor.employeeId,
                reviewedAt: mrReview.reviewedAt,
                action: mrReview.action,
                comment: mrReview.comment,
              },
            });
          }

          if (mrSignature) {
            await tx.carMrSignature.create({
              data: {
                carMasterId: master.id,
                mrUserId: mrSignature.actor.id,
                mrAuthUserId: mrSignature.actor.authUserId,
                mrUserName: mrSignature.actor.name,
                mrEmployeeId: mrSignature.actor.employeeId,
                signedAt: mrSignature.signedAt,
                comment: mrSignature.comment,
              },
            });
          }
        });
      }

      if (existing) result.modules.car.updated += 1;
      else result.modules.car.created += 1;
    } catch (error) {
      this.pushError(result, "car", CAR_SHEET, rowNumber, key, error);
    }
  }

  private async resolveReCarLinks(options: LegacyImportOptions, result: ImportResult) {
    if (options.dryRun) return;
    const cars = await db.carMaster.findMany({
      where: { reCar: true },
      select: { id: true, carNo: true },
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(options.filePath);
    const sheet = getWorksheet(workbook, CAR_SHEET);
    if (!sheet) return;
    const rows = readSheetRows(sheet);
    const byCarNo = new Map(cars.map((car) => [car.carNo, car.id]));

    for (const row of rows) {
      const carNo = cleanString(row.values.carNo);
      const reCarRefNo = cleanString(row.values.reCarRefNo);
      if (!carNo || !reCarRefNo || !parseBoolean(row.values.reCar)) continue;

      const currentId = byCarNo.get(carNo);
      const refId = byCarNo.get(reCarRefNo);
      if (!currentId || !refId) {
        this.pushError(result, "car", CAR_SHEET, row.rowNumber, carNo, new Error(`reCarRefNo "${reCarRefNo}" was not found in imported CAR records`));
        continue;
      }

      try {
        await db.carMaster.update({
          where: { id: currentId },
          data: { reCarRefId: refId },
        });
      } catch (error) {
        this.pushError(result, "car", CAR_SHEET, row.rowNumber, carNo, error);
      }
    }
  }

  private async importKpiGroup(group: KpiGroup, options: LegacyImportOptions, result: ImportResult) {
    const head = group.rows[0];
    try {
      const row = head.values;
      const yearly = parseNumber(row.yearly, "yearly");
      const departmentName = cleanString(row.department);
      if (!departmentName) throw new Error("department is required");
      const status = parseEnum<"DRAFT" | "PENDING_REVIEW" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED">(row.status || "DRAFT", KPI_STATUS, "status");
      const prepare = buildPerson(row.prepare, "", "", row.prepare);
      const reviewer = buildPerson(row.reviewer, row.reviewerEmail, "", row.reviewerEmail || row.reviewer);
      const approver = buildPerson(row.approver, row.approverEmail, "", row.approverEmail || row.approver);
      const submittedAt = parseOptionalDate(row.submittedAt);
      const objectives = group.rows.map((entry) => ({
        objective: cleanString(entry.values.objective),
        target: parseNumber(entry.values.target, "target"),
        unit: cleanString(entry.values.unit) || null,
        frequency: cleanString(entry.values.frequency || "Monthly"),
        calculationFormula: cleanString(entry.values.calculationFormula || "-"),
        actionPlanGuidelines: cleanString(entry.values.actionPlanGuidelines || "-"),
        referenceDocuments: cleanString(entry.values.referenceDocuments) || null,
      }));

      if (objectives.some((objective) => !objective.objective)) {
        throw new Error("every KPI row must include objective");
      }

      await ensureKpiDepartment(departmentName, cleanString(row.departmentEmailGroup) || null);

      const existing = await db.kPI.findFirst({
        where: { department: departmentName, yearly },
        select: { id: true },
      });

      if (existing && !options.upsert) {
        result.modules.kpi.skipped += 1;
        return;
      }

      if (!options.dryRun) {
        await db.$transaction(async (tx) => {
          const kpi = existing
            ? await tx.kPI.update({
                where: { id: existing.id },
                data: {
                  yearly,
                  department: departmentName,
                  prepare: prepare.name ?? "",
                  reviewer: reviewer.name ?? "",
                  reviewerUserId: reviewer.id,
                  reviewerEmail: reviewer.email,
                  approver: approver.name ?? "",
                  approverUserId: approver.id,
                  approverEmail: approver.email,
                  submittedAt,
                  status,
                },
              })
            : await tx.kPI.create({
                data: {
                  yearly,
                  department: departmentName,
                  prepare: prepare.name ?? "",
                  reviewer: reviewer.name ?? "",
                  reviewerUserId: reviewer.id,
                  reviewerEmail: reviewer.email,
                  approver: approver.name ?? "",
                  approverUserId: approver.id,
                  approverEmail: approver.email,
                  submittedAt,
                  status,
                },
              });

          await tx.kPIObjective.deleteMany({ where: { kpiId: kpi.id } });
          await tx.kPIObjective.createMany({
            data: objectives.map((objective) => ({
              kpiId: kpi.id,
              target: objective.target,
              unit: objective.unit,
              objective: objective.objective,
              frequency: objective.frequency,
              calculationFormula: objective.calculationFormula,
              actionPlanGuidelines: objective.actionPlanGuidelines,
              referenceDocuments: objective.referenceDocuments,
            })),
          });

          const approvalEntries: Parameters<typeof upsertApprovalSignatures>[3] = [
            {
              step: "PREPARER",
              action: "APPROVED",
              actor: prepare,
              departmentName,
              actionDate: submittedAt,
            },
          ];

          if (reviewer.name || reviewer.email) {
            approvalEntries.push({
              step: "REVIEWER",
              action: status === "PENDING_REVIEW" ? "PENDING" : status === "REJECTED" ? "REJECTED" : "APPROVED",
              actor: reviewer,
              departmentName,
              actionDate: status === "PENDING_REVIEW" ? null : submittedAt,
            });
          }

          if (approver.name || approver.email) {
            approvalEntries.push({
              step: "APPROVER",
              action: status === "APPROVED" ? "APPROVED" : status === "PENDING_APPROVAL" ? "PENDING" : status === "REJECTED" ? "REJECTED" : "PENDING",
              actor: approver,
              departmentName,
              actionDate: status === "APPROVED" ? submittedAt : null,
            });
          }

          await upsertApprovalSignatures(tx, "KPI", kpi.id, approvalEntries);
        });
      }

      if (existing) result.modules.kpi.updated += 1;
      else result.modules.kpi.created += 1;
    } catch (error) {
      this.pushError(result, "kpi", KPI_SHEET, head.rowNumber, group.key, error);
    }
  }

  private async importMonthlyGroup(group: MonthlyGroup, options: LegacyImportOptions, result: ImportResult) {
    const head = group.rows[0];
    try {
      const row = head.values;
      const yearly = parseNumber(row.yearly, "yearly");
      const month = parseMonth(row.month);
      const departmentName = cleanString(row.department);
      const status = parseEnum<"DRAFT" | "PENDING_REVIEW" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED">(row.status || "DRAFT", MONTHLY_STATUS, "status");

      const kpi = await db.kPI.findFirst({
        where: { department: departmentName, yearly },
        include: { objectives: true },
      });
      if (!kpi) throw new Error(`KPI ${departmentName}/${yearly} must exist before KPI Monthly import`);

      const existing = await db.kPIMonthlyReport.findUnique({
        where: { kpiId_month_year: { kpiId: kpi.id, month, year: yearly } },
        select: { id: true },
      });

      if (existing && !options.upsert) {
        result.modules["kpi-monthly"].skipped += 1;
        return;
      }

      const prepare = buildPerson(row.prepareBy, "", "", row.prepareBy);
      const reviewer = buildPerson(row.reviewBy, "", "", row.reviewBy);
      const approver = buildPerson(row.approveBy, "", "", row.approveBy);
      const submittedAt = parseOptionalDate(row.submittedAt);
      const approvedAt = parseOptionalDate(row.approvedAt);
      const objectiveMap = new Map(kpi.objectives.map((objective) => [objective.objective.trim().toLowerCase(), objective]));

      if (!options.dryRun) {
        await db.$transaction(async (tx) => {
          const report = existing
            ? await tx.kPIMonthlyReport.update({
                where: { id: existing.id },
                data: {
                  status,
                  prepareBy: prepare.id,
                  reviewBy: reviewer.id || null,
                  approveBy: approver.id || null,
                  submittedAt,
                  approvedAt,
                  remark: cleanString(row.remark) || null,
                },
              })
            : await tx.kPIMonthlyReport.create({
                data: {
                  kpiId: kpi.id,
                  month,
                  year: yearly,
                  status,
                  prepareBy: prepare.id,
                  reviewBy: reviewer.id || null,
                  approveBy: approver.id || null,
                  submittedAt,
                  approvedAt,
                  remark: cleanString(row.remark) || null,
                },
              });

          await tx.kPICorrectiveAction.deleteMany({
            where: { monthlyDetail: { monthlyReportId: report.id } },
          });
          await tx.kPIMonthlyDetail.deleteMany({
            where: { monthlyReportId: report.id },
          });

          const detailIdByObjective = new Map<string, string>();

          for (const entry of group.rows) {
            const objectiveKey = cleanString(entry.values.objective).toLowerCase();
            const linkedObjective = objectiveMap.get(objectiveKey);
            if (!linkedObjective) {
              throw new Error(`objective "${entry.values.objective}" does not match KPI objective master`);
            }

            let detailId = detailIdByObjective.get(objectiveKey);
            if (!detailId) {
              const detail = await tx.kPIMonthlyDetail.create({
                data: {
                  monthlyReportId: report.id,
                  kpiObjectiveId: linkedObjective.id,
                  actualResult: entry.values.actualResult ? parseNumber(entry.values.actualResult, "actualResult") : null,
                  achievedStatus: parseEnum<"PENDING" | "OK" | "NOT_OK">(entry.values.achievedStatus || "PENDING", ACHIEVED_STATUS, "achievedStatus"),
                },
              });
              detailId = detail.id;
              detailIdByObjective.set(objectiveKey, detail.id);
            }

            if (cleanString(entry.values.correctiveTimes)) {
              await tx.kPICorrectiveAction.create({
                data: {
                  monthlyDetailId: detailId,
                  times: parseNumber(entry.values.correctiveTimes, "correctiveTimes"),
                  rootCause: cleanString(entry.values.correctiveRootCause || "-"),
                  guidelines: cleanString(entry.values.correctiveGuidelines || "-"),
                  responsiblePerson: cleanString(entry.values.correctiveResponsiblePerson || "-"),
                  dueDate: parseDate(entry.values.correctiveDueDate || approvedAt?.toISOString() || submittedAt?.toISOString() || new Date().toISOString(), "correctiveDueDate"),
                },
              });
            }
          }

          const approvalEntries: Parameters<typeof upsertApprovalSignatures>[3] = [
            {
              step: "PREPARER",
              action: "APPROVED",
              actor: prepare,
              departmentName,
              actionDate: submittedAt,
            },
          ];

          if (reviewer.name) {
            approvalEntries.push({
              step: "REVIEWER",
              action: status === "PENDING_REVIEW" ? "PENDING" : status === "REJECTED" ? "REJECTED" : "APPROVED",
              actor: reviewer,
              departmentName,
              actionDate: status === "PENDING_REVIEW" ? null : submittedAt,
            });
          }

          if (approver.name) {
            approvalEntries.push({
              step: "APPROVER",
              action: status === "APPROVED" ? "APPROVED" : status === "PENDING_APPROVAL" ? "PENDING" : status === "REJECTED" ? "REJECTED" : "PENDING",
              actor: approver,
              departmentName,
              actionDate: approvedAt,
            });
          }

          await upsertApprovalSignatures(tx, "KPI_MONTHLY", report.id, approvalEntries);
        });
      }

      if (existing) result.modules["kpi-monthly"].updated += 1;
      else result.modules["kpi-monthly"].created += 1;
    } catch (error) {
      this.pushError(result, "kpi-monthly", KPI_MONTHLY_SHEET, head.rowNumber, group.key, error);
    }
  }

  private pushError(result: ImportResult, module: ImportModule, sheet: string, row: number, key: string, error: unknown) {
    result.modules[module].errors += 1;
    result.errors.push({
      module,
      sheet,
      row,
      key,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export type { ImportModule, ImportResult, LegacyImportOptions };
