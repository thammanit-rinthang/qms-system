import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(
  __dirname,
  "..",
  "docs",
  "export-format",
  "FM-DC-04 Rev.02 ทะเบียนรายชื่อเอกสารควบคุม Master List.xlsx"
);

const workbook = new ExcelJS.Workbook();
workbook.creator = "QMS System";
workbook.created = new Date();

const ws = workbook.addWorksheet("Master List");

// Column widths
ws.getColumn(1).width = 5;   // A: No
ws.getColumn(2).width = 36;  // B: Doc Name
ws.getColumn(3).width = 10;  // C: (merged with B)
ws.getColumn(4).width = 20;  // D: Doc No
ws.getColumn(5).width = 8;   // E: Revision
ws.getColumn(6).width = 14;  // F: Effective Date
ws.getColumn(7).width = 12;  // G: Status

// Columns H-X for departments
for (let col = 8; col <= 24; col++) {
  ws.getColumn(col).width = 6;
}

// Row 1: Title
ws.mergeCells("A1:X1");
const titleCell = ws.getCell("A1");
titleCell.value = "ทะเบียนรายชื่อเอกสารควบคุม (Master List)";
titleCell.font = { name: "Tahoma", size: 16, bold: true, color: { argb: "FF0F1059" } };
titleCell.alignment = { vertical: "middle", horizontal: "center" };
ws.getRow(1).height = 30;

// Row 2: Document number
ws.mergeCells("A2:X2");
const docNoCell = ws.getCell("A2");
docNoCell.value = "FM-DC-04 Rev.02";
docNoCell.font = { name: "Tahoma", size: 10, color: { argb: "FF666666" } };
docNoCell.alignment = { vertical: "middle", horizontal: "center" };
ws.getRow(2).height = 20;

// Row 3: Empty spacer

// Row 4: Update date label and value
ws.getCell("B4").value = "วันที่ปรับปรุง:";
ws.getCell("B4").font = { name: "Tahoma", size: 10, bold: true };
ws.getCell("C4").font = { name: "Tahoma", size: 10 };

// Row 5-6: Empty

// Row 7: Header row
const headerLabels = [
  "ลำดับ",       // A
  "ชื่อเอกสาร",  // B
  "",            // C (merged)
  "รหัสเอกสาร",  // D
  "Rev.",        // E
  "วันที่มีผล",  // F
  "สถานะ",       // G
  "MD", "QMS", "SM", "PU", "HR", "SHE", "PD", "QA", "QC",
  "QC\nLab", "WH", "MO", "EN", "IT", "MN", "GA", "PN"
];

ws.mergeCells("B7:C7");

const headerRow = ws.getRow(7);
headerRow.height = 30;
headerLabels.forEach((label, idx) => {
  const cell = headerRow.getCell(idx + 1);
  cell.value = label;
  cell.font = { name: "Tahoma", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F1059" }
  };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: "FFFFFFFF" } },
    left: { style: "thin", color: { argb: "FFFFFFFF" } },
    bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
    right: { style: "thin", color: { argb: "FFFFFFFF" } }
  };
});

// Freeze panes below header
ws.views = [{ state: "frozen", ySplit: 7 }];

await workbook.xlsx.writeFile(outputPath);
console.log("Template created:", outputPath);
