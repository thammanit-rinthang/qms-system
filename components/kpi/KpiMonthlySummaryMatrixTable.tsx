import type { KpiYearlyPreviewData } from "@/services/kpiExportService";
import type { KPIMonthlySummaryReview, ApprovalSignature } from "@/generated/prisma/client";

const STATUS_BG: Record<string, string> = {
  achieved: "#92D050",
  failed: "#FF5050",
  pending: "#FFFF00",
};

interface Props {
  preview: KpiYearlyPreviewData;
  record: Pick<KPIMonthlySummaryReview, "reviewerName" | "approverName"> | null;
  signatures: Pick<ApprovalSignature, "step" | "action" | "signaturePath">[];
  /** Print page caps the card at A4-landscape width; other contexts can go wider. */
  fullWidth?: boolean;
  /** Shown in the "Revision No." box, top right of the header — defaults to 1. */
  revisionNo?: number;
  /** Shown in the "Update วันที่" box, top right of the header — defaults to now. */
  updatedAt?: Date | string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function KpiMonthlySummaryMatrixTable({ preview, record, signatures, fullWidth, revisionNo = 1, updatedAt }: Props) {
  const preparerSig = signatures.find((s) => s.step === "PREPARER" && s.action === "APPROVED");
  const reviewerSig = signatures.find((s) => s.step === "REVIEWER" && s.action === "APPROVED");
  const approverSig = signatures.find((s) => s.step === "APPROVER" && s.action === "APPROVED");
  const updateDateLabel = new Date(updatedAt ?? Date.now()).toLocaleDateString("en-US");

  return (
    <div className={`mx-auto bg-white p-6 shadow-sm ${fullWidth ? "w-full" : "max-w-[280mm]"}`}>
      <table className="w-full border-collapse text-[11px] mb-2" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "16%" }} />
          <col />
          <col style={{ width: "13%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="border border-black p-2 align-middle" rowSpan={2}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/logo.webp" alt="NDC Industrial" className="h-8 object-contain mx-auto" />
            </td>
            <td className="border border-black text-center align-middle" rowSpan={2}>
              <div className="font-bold text-sm" style={{ color: "#0F1059" }}>บริษัท เอ็นดีซี อินดัสเทรียล จำกัด</div>
              <div className="font-bold text-sm" style={{ color: "#0F1059" }}>NDC INDUSTRIAL CO., LTD.</div>
              <div className="font-bold text-[13px] mt-1" style={{ color: "#0F1059" }}>สรุปผลการดำเนินงานตามวัตถุประสงค์คุณภาพ ประจำปี {preview.yearBE}</div>
              <div className="font-semibold text-xs" style={{ color: "#0F1059" }}>Summary of Key Performance Results Year {preview.year}</div>
            </td>
            <td className="border border-black text-center font-semibold p-1 whitespace-nowrap">Revision No.</td>
            <td className="border border-black text-center p-1">{String(revisionNo).padStart(2, "0")}</td>
          </tr>
          <tr>
            <td className="border border-black text-center font-semibold p-1 whitespace-nowrap">Update วันที่</td>
            <td className="border border-black text-center p-1">{updateDateLabel}</td>
          </tr>
        </tbody>
      </table>

      <div className="overflow-x-auto">
        <table className="w-full min-w-275 border-collapse text-[11px]">
          <thead>
            <tr style={{ backgroundColor: "#0F1059", color: "#fff" }}>
              <th className="border border-black px-2 py-1.5" rowSpan={2}>No.</th>
              <th className="border border-black px-2 py-1.5 text-left" rowSpan={2}>Quality Objectives and Indicators</th>
              <th className="border border-black px-2 py-1.5" rowSpan={2}>Target</th>
              <th className="border border-black px-2 py-1.5" rowSpan={2}>Frequency</th>
              <th className="border border-black px-2 py-1.5" rowSpan={2}>Team</th>
              <th className="border border-black px-2 py-1.5" colSpan={12}>ประจำปี {preview.yearBE} / Year {preview.year}</th>
              <th className="border border-black px-2 py-1.5" rowSpan={2}>Average<br />Y {preview.year}</th>
              <th className="border border-black px-2 py-1.5" rowSpan={2}>New Target<br />Y {preview.nextYear}</th>
            </tr>
            <tr style={{ backgroundColor: "#0F1059", color: "#fff" }}>
              {MONTHS.map((m) => (
                <th key={m} className="border border-black px-1.5 py-1.5">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.no}>
                <td className="border border-black px-2 py-1 text-center">{row.no}</td>
                <td className="border border-black px-2 py-1">{row.objective}</td>
                <td className="border border-black px-2 py-1 text-center">{row.target}</td>
                <td className="border border-black px-2 py-1 text-center">{row.frequency}</td>
                <td className="border border-black px-2 py-1 text-center">{row.team}</td>
                {row.months.map((month) => (
                  <td
                    key={month.key}
                    className="border border-black px-1.5 py-1 text-center"
                    style={{
                      backgroundColor: STATUS_BG[month.status],
                      color: month.status === "failed" ? "#fff" : "#000",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    {month.status === "pending" ? "" : month.value}
                  </td>
                ))}
                <td className="border border-black px-2 py-1 text-center font-semibold">{row.average}</td>
                <td className="border border-black px-2 py-1 text-center text-slate-400">-</td>
              </tr>
            ))}
            {preview.rows.length === 0 && (
              <tr>
                <td colSpan={19} className="border border-black text-center italic py-4">
                  ไม่มีข้อมูลสำหรับปีนี้ / No data for this year
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-6 mt-4 text-xs">
        <span className="font-semibold">หมายเหตุ/Note :</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 border border-black" style={{ backgroundColor: STATUS_BG.achieved }} />
          Achieve Target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 border border-black" style={{ backgroundColor: STATUS_BG.failed }} />
          Not Achieve Target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 border border-black" style={{ backgroundColor: STATUS_BG.pending }} />
          Not yet
        </span>
      </div>

      {record && (
        <div className="grid grid-cols-3 gap-4 mt-6 text-xs">
          <div className="border border-black p-2 text-center">
            <div className="font-semibold">ผู้จัดทำ / Prepared By</div>
            <div className="h-11 flex items-center justify-center">
              {preparerSig?.signaturePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preparerSig.signaturePath} alt="Preparer signature" className="max-h-10 object-contain" />
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          </div>
          <div className="border border-black p-2 text-center">
            <div className="font-semibold">ผู้ตรวจสอบ / Reviewed By</div>
            <div className="mt-1">{record.reviewerName ?? "-"}</div>
            <div className="h-11 flex items-center justify-center">
              {reviewerSig?.signaturePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={reviewerSig.signaturePath} alt="Reviewer signature" className="max-h-10 object-contain" />
              ) : (
                <span className="text-[10px] text-slate-500">{reviewerSig ? "Approved" : "Pending"}</span>
              )}
            </div>
          </div>
          <div className="border border-black p-2 text-center">
            <div className="font-semibold">ผู้อนุมัติ / Approved By</div>
            <div className="mt-1">{record.approverName ?? "-"}</div>
            <div className="h-11 flex items-center justify-center">
              {approverSig?.signaturePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={approverSig.signaturePath} alt="Approver signature" className="max-h-10 object-contain" />
              ) : (
                <span className="text-[10px] text-slate-500">{approverSig ? "Approved" : "Pending"}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
