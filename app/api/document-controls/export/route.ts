import { type NextRequest } from "next/server";
import { z } from "zod";
import ExcelJS from "exceljs";
import path from "path";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DocumentControlExportService } from "@/services/documentControlExportService";
import { QmsConfigService } from "@/services/qmsConfigService";
import { DepartmentCodeRepository } from "@/repositories/departmentCodeRepository";
import { DocumentControlExportRow } from "@/types/documentControl";

const exportService = new DocumentControlExportService();
const qmsConfigService = new QmsConfigService();
const deptCodeRepo = new DepartmentCodeRepository();

const querySchema = z.object({
  departmentId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CANCELLED", "OBSOLETE"]).optional(),
  search: z.string().optional(),
});

function formatDate(value: string | Date | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
}

const DEPT_COLUMN_CODES = [
  "MD", "QMS", "SM", "PU", "HR", "SHE", "PD", "QA", "QC", "QC Lab", "WH", "MO", "EN", "IT", "MN", "GA", "PN"
];

function isDistributedTo(row: DocumentControlExportRow, code: string, codeMap: Map<string, string>, nameMap: Map<string, string>): boolean {
  if (!row.distributions) return false;
  const targetCode = code.toUpperCase().trim();
  return row.distributions.some((dist: { departmentName: string; authDepartmentId: string | null }) => {
    if (dist.authDepartmentId) {
      const mappedCode = codeMap.get(dist.authDepartmentId);
      if (mappedCode && mappedCode.toUpperCase() === targetCode) return true;
    }
    if (dist.departmentName) {
      const cleanName = dist.departmentName.toLowerCase().trim();
      const mappedCode = nameMap.get(cleanName);
      if (mappedCode && mappedCode.toUpperCase() === targetCode) return true;
      
      const nameUpper = dist.departmentName.toUpperCase();
      if (nameUpper === targetCode || nameUpper.includes(` ${targetCode}`) || nameUpper.includes(`${targetCode} `) || nameUpper.startsWith(targetCode)) {
        return true;
      }
    }
    return false;
  });
}

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "IT", "MR");

    const searchParams = req.nextUrl.searchParams;
    const query = querySchema.parse({
      departmentId: searchParams.get("departmentId") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
    });

    const where: Prisma.DocumentControlWhereInput = {
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { docNumber: { contains: query.search, mode: "insensitive" } },
              { docName: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, naming, deptCodes] = await Promise.all([
      exportService.listRows(where),
      qmsConfigService.getExportNamingMeta("DOC_CONTROL", {
        label: "Document Control Master List",
        fileBaseName: "document-control-master-list",
        worksheetName: "Master List",
      }),
      deptCodeRepo.findAll(),
    ]);

    const codeMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    for (const d of deptCodes) {
      if (d.authDeptId) codeMap.set(d.authDeptId, d.code);
      if (d.departmentName) nameMap.set(d.departmentName.toLowerCase().trim(), d.code);
    }

    const templatePath = path.join(process.cwd(), "docs", "export-format", "FM-DC-04 Rev.02 ทะเบียนรายชื่อเอกสารควบคุม Master List.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];

    // Clear conditional formattings to prevent Excel repair popup
    (worksheet as unknown as { conditionalFormattings: unknown[] }).conditionalFormattings = [];

    // Set sheet name
    if (naming.worksheetName && naming.worksheetName.length <= 31) {
      worksheet.name = naming.worksheetName;
    }

    // Set update date in row 4
    const today = new Date();
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const thaiDateStr = `${String(today.getDate()).padStart(2, "0")} ${thaiMonths[today.getMonth()]} ${today.getFullYear() + 543}`;
    worksheet.getCell("C4").value = thaiDateStr;

    const borderStyle: ExcelJS.Border = {
      style: "thin",
      color: { argb: "FFCCCCCC" }
    };
    const allBorders: Partial<ExcelJS.Borders> = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle
    };

    rows.forEach((row, index) => {
      const rowNum = 8 + index;
      const added = worksheet.getRow(rowNum);

      const distValues: Record<string, string> = {};
      DEPT_COLUMN_CODES.forEach((code) => {
        const checked = isDistributedTo(row, code, codeMap, nameMap);
        distValues[code] = checked ? "✓" : "";
      });

      added.values = [
        index + 1, // A: No (col 1)
        row.docName, // B: Doc Name (col 2)
        "", // C: empty (col 3)
        row.docNumber, // D: Doc No (col 4)
        row.revision ?? "00", // E: Revision (col 5)
        row.effectiveDate ? formatDate(row.effectiveDate) : "", // F: Effective Date (col 6)
        row.status === "ACTIVE" ? "ใช้งาน" : row.status === "CANCELLED" ? "ยกเลิก" : row.status, // G: Status (col 7)
        distValues["MD"], // H
        distValues["QMS"], // I
        distValues["SM"], // J
        distValues["PU"], // K
        distValues["HR"], // L
        distValues["SHE"], // M
        distValues["PD"], // N
        distValues["QA"], // O
        distValues["QC"], // P
        distValues["QC Lab"], // Q
        distValues["WH"], // R
        distValues["MO"], // S
        distValues["EN"], // T
        distValues["IT"], // U
        distValues["MN"], // V
        distValues["GA"], // W
        distValues["PN"], // X
      ];

      try {
        worksheet.mergeCells(`B${rowNum}`, `C${rowNum}`);
      } catch {
        // ignore
      }

      added.eachCell((cell, colNumber) => {
        cell.font = { name: "Tahoma", size: 9 };
        cell.border = allBorders;

        if (colNumber === 2 || colNumber === 3) {
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }

        // Highlight Cancelled / Obsolete status column cell manually
        if (colNumber === 7 && (row.status === "CANCELLED" || row.status === "OBSOLETE")) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFC7CE" }
          };
          cell.font = {
            name: "Tahoma",
            size: 9,
            color: { argb: "FF9C0006" },
            bold: true
          };
        }
      });
      added.height = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const suffix = query.departmentId ? "department" : query.categoryId ? "category" : "all";

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${naming.fileBaseName}-${suffix}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
