import path from "path";
import ExcelJS from "exceljs";

function resolveOutputPath(argv: string[]) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) return path.resolve(arg);
    if (arg.startsWith("--out=")) return path.resolve(arg.slice("--out=".length));
    if (arg === "--out") return path.resolve(argv[index + 1] ?? "legacy-import-template.xlsx");
  }
  return path.resolve("legacy-import-template.xlsx");
}

const outputPath = resolveOutputPath(process.argv.slice(2));

function addSheet(wb: ExcelJS.Workbook, name: string, headers: string[], sample: Record<string, string>) {
  const ws = wb.addWorksheet(name);
  ws.columns = headers.map((header) => ({ header, key: header, width: Math.max(16, header.length + 4) }));
  ws.addRow(sample);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
}

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QMS System";
  wb.created = new Date();

  const guide = wb.addWorksheet("README");
  guide.getCell("A1").value = "Legacy Import Template";
  guide.getCell("A2").value = "One workbook can include DAR, CAR, KPI, and KPI Monthly sheets.";
  guide.getCell("A3").value = "Run dry-run first: npm run import:legacy -- --file .\\your-file.xlsx --dry-run";
  guide.getCell("A4").value = "Re-run with --upsert if you want existing unique keys updated.";
  guide.getCell("A6").value = "Key rules";
  guide.getCell("A7").value = "DAR: one row per DAR item. Repeat darNo for the same request.";
  guide.getCell("A8").value = "CAR: one row per CAR. Re-CAR links use reCarRefNo = referenced carNo.";
  guide.getCell("A9").value = "KPI: one row per KPI objective. Repeat department/yearly for the same KPI.";
  guide.getCell("A10").value = "KPI Monthly: one row per monthly detail. Repeat rows if one detail has multiple corrective actions.";
  guide.columns = [{ width: 140 }];

  addSheet(
    wb,
    "DAR",
    [
      "darNo",
      "requestDate",
      "status",
      "requesterName",
      "requesterEmail",
      "requesterEmployeeId",
      "requesterDepartmentName",
      "departmentCode",
      "objective",
      "docType",
      "docTypeOther",
      "reason",
      "itemNo",
      "docNumber",
      "docName",
      "revision",
      "distributionDepartments",
      "qmsUserName",
      "qmsUserEmployeeId",
      "qmsProcessDate",
      "qmsComments",
      "qmsChkHasAttachment",
      "qmsChkPrintAndValidate",
      "qmsChkRenumber",
      "qmsChkImpactInvestigated",
      "qmsChkSubmitVerification",
      "qmsChkGetBackProcess",
      "qmsChkCopyDistribute",
    ],
    {
      darNo: "DAR-2026-0001",
      requestDate: "2026-06-01",
      status: "COMPLETED",
      requesterName: "Somchai",
      requesterEmail: "somchai@example.com",
      requesterEmployeeId: "E001",
      requesterDepartmentName: "QA",
      departmentCode: "QA",
      objective: "NEW",
      docType: "WI",
      reason: "Legacy import",
      itemNo: "1",
      docNumber: "WI-QA-001",
      docName: "Work Instruction",
      revision: "00",
      distributionDepartments: "QA:Quality Assurance|PD:Production",
      qmsUserName: "QMS Admin",
      qmsProcessDate: "2026-06-03",
      qmsComments: "Imported from legacy system",
      qmsChkHasAttachment: "true",
    }
  );

  addSheet(
    wb,
    "CAR",
    [
      "carNo",
      "carYear",
      "sequenceNo",
      "status",
      "sourceType",
      "sourceDetail",
      "isoStandards",
      "defectDetail",
      "nonConformanceRef",
      "issuerName",
      "issuerEmail",
      "issuerEmployeeId",
      "issuerPosition",
      "issuedAt",
      "targetDepartmentName",
      "targetDepartmentCode",
      "targetEmailGroups",
      "targetEmailGroupsCc",
      "responseDueAt",
      "reCar",
      "reCarRefNo",
      "responderName",
      "responderEmail",
      "responderEmployeeId",
      "responderPosition",
      "respondedAt",
      "responseType",
      "fiveWhysJson",
      "whyAnalysis",
      "additionalToolDetail",
      "rootCausePerson",
      "rootCauseMaterial",
      "rootCauseMachine",
      "rootCauseMethod",
      "rootCauseOther",
      "rootCauseOtherDetail",
      "rootCauseSummary",
      "immediateAction",
      "preventiveAction",
      "plannedCompletionDate",
      "verify1Result",
      "verify1Date",
      "verify1Findings",
      "verify1VerifierName",
      "verify1VerifierEmail",
      "verify1VerifierEmployeeId",
      "verify1VerifierPosition",
      "verify1NextDueDate",
      "verify2Result",
      "verify2Date",
      "verify2Findings",
      "verify2VerifierName",
      "verify2VerifierEmail",
      "verify2VerifierEmployeeId",
      "verify2VerifierPosition",
      "mrReviewAction",
      "mrReviewDate",
      "mrReviewBy",
      "mrReviewEmail",
      "mrReviewComment",
      "mrSignedAt",
      "mrSignerName",
      "mrSignerEmail",
      "mrSignComment",
    ],
    {
      carNo: "CAR-2026-0001",
      carYear: "2026",
      sequenceNo: "1",
      status: "CLOSED",
      sourceType: "I",
      isoStandards: "ISO9001|ISO14001",
      defectDetail: "Legacy NC detail",
      nonConformanceRef: "NC-001",
      issuerName: "QMS Lead",
      issuerEmail: "qms@example.com",
      issuerPosition: "QMS",
      issuedAt: "2026-06-01",
      targetDepartmentName: "Production",
      targetDepartmentCode: "PD",
      responseDueAt: "2026-06-08",
      responderName: "Prod Lead",
      responderEmail: "prod@example.com",
      responderPosition: "Manager",
      respondedAt: "2026-06-05",
      responseType: "OTHER",
      whyAnalysis: "Imported legacy response",
      rootCauseSummary: "Root cause summary",
      immediateAction: "Immediate action",
      preventiveAction: "Preventive action",
      plannedCompletionDate: "2026-06-10",
      verify1Result: "PASSED",
      verify1Date: "2026-06-11",
      verify1Findings: "Verified",
      verify1VerifierName: "Auditor 1",
      verify1VerifierPosition: "Auditor",
      mrSignedAt: "2026-06-12",
      mrSignerName: "MR User",
    }
  );

  addSheet(
    wb,
    "KPI",
    [
      "yearly",
      "department",
      "departmentEmailGroup",
      "status",
      "prepare",
      "reviewer",
      "reviewerEmail",
      "approver",
      "approverEmail",
      "submittedAt",
      "objective",
      "target",
      "unit",
      "frequency",
      "calculationFormula",
      "actionPlanGuidelines",
      "referenceDocuments",
    ],
    {
      yearly: "2026",
      department: "QA",
      status: "APPROVED",
      prepare: "QA Owner",
      reviewer: "QMS Lead",
      reviewerEmail: "qms@example.com",
      approver: "MR User",
      approverEmail: "mr@example.com",
      submittedAt: "2026-01-15",
      objective: "Customer complaint closed within target",
      target: "95",
      unit: "%",
      frequency: "Monthly",
      calculationFormula: "Closed/Total * 100",
      actionPlanGuidelines: "Review monthly gap",
      referenceDocuments: "WI-QA-001",
    }
  );

  addSheet(
    wb,
    "KPI Monthly",
    [
      "yearly",
      "month",
      "department",
      "status",
      "prepareBy",
      "reviewBy",
      "approveBy",
      "submittedAt",
      "approvedAt",
      "remark",
      "objective",
      "actualResult",
      "achievedStatus",
      "correctiveTimes",
      "correctiveRootCause",
      "correctiveGuidelines",
      "correctiveResponsiblePerson",
      "correctiveDueDate",
    ],
    {
      yearly: "2026",
      month: "Jan",
      department: "QA",
      status: "APPROVED",
      prepareBy: "QA Owner",
      reviewBy: "QMS Lead",
      approveBy: "MR User",
      submittedAt: "2026-02-01",
      approvedAt: "2026-02-03",
      objective: "Customer complaint closed within target",
      actualResult: "92",
      achievedStatus: "NOT_OK",
      correctiveTimes: "1",
      correctiveRootCause: "Delay in response",
      correctiveGuidelines: "Weekly monitoring",
      correctiveResponsiblePerson: "QA Supervisor",
      correctiveDueDate: "2026-02-28",
    }
  );

  await wb.xlsx.writeFile(outputPath);
  console.log(`Template written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
