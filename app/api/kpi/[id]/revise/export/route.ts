import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { handleApiError } from '@/lib/apiErrorHandler';
import ExcelJS from 'exceljs';
import { KpiService } from '@/services/kpiService';
import { QmsConfigService } from '@/services/qmsConfigService';

const service = new KpiService();
const qmsConfigService = new QmsConfigService();

const paramSchema = z.object({ id: z.string().uuid() });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('QMS', 'MR', 'IT');
    const { id } = paramSchema.parse(await params);

    const detail = await service.getKpiById(id);
    const naming = await qmsConfigService.getExportNamingMeta('KPI_REVISION', {
      label: 'KPI Revision History',
      fileBaseName: `kpi-revision-${detail.department}-${detail.yearly}`,
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'QMS System';
    wb.created = new Date();

    const ws = wb.addWorksheet(naming.worksheetName);

    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1059' } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFCCCCCC' } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };
    const revisedFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };

    ws.columns = [
      { header: 'Revision #', key: 'revision', width: 14 },
      { header: 'Revised At', key: 'revisedAt', width: 22 },
      { header: 'By Role', key: 'revisedBy', width: 16 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Objective', key: 'objective', width: 45 },
      { header: 'Target', key: 'target', width: 10 },
      { header: 'Unit', key: 'unit', width: 8 },
      { header: 'Frequency', key: 'frequency', width: 14 },
      { header: 'Responsible', key: 'responsible', width: 24 },
      { header: 'Formula', key: 'formula', width: 30 },
      { header: 'Guidelines', key: 'guidelines', width: 30 },
      { header: 'Reference', key: 'reference', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 22;

    const history = detail.revisionHistory;
    let dataRowCount = 0;

    for (let revIdx = 0; revIdx < history.length; revIdx++) {
      const entry = history[revIdx];
      const revNum = history.length - revIdx;
      const snapshots = entry.objectiveSnapshots;

      if (snapshots.length === 0) {
        ws.addRow({
          revision: `#${revNum}`,
          revisedAt: new Date(entry.revisedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
          revisedBy: entry.revisedByRole,
          reason: entry.reason || '-',
          objective: '(no objectives recorded)',
          target: '',
          unit: '',
          frequency: '',
          responsible: '',
          formula: '',
          guidelines: '',
          reference: '',
          status: '-',
        }).eachCell((cell) => {
          cell.border = allBorders;
          cell.alignment = { vertical: 'top', wrapText: true };
        });
        dataRowCount++;
        continue;
      }

      for (let sIdx = 0; sIdx < snapshots.length; sIdx++) {
        const snap = snapshots[sIdx];
        const isRevised = entry.revisedObjectiveIds.includes(snap.objectiveId);
        const added = ws.addRow({
          revision: sIdx === 0 ? `#${revNum}` : '',
          revisedAt: sIdx === 0 ? new Date(entry.revisedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '',
          revisedBy: sIdx === 0 ? entry.revisedByRole : '',
          reason: sIdx === 0 ? (entry.reason || '-') : '',
          objective: snap.objective,
          target: snap.target.toString(),
          unit: snap.unit || '-',
          frequency: snap.frequency,
          responsible: snap.responsibleNameSnapshot || snap.responsibleEmailSnapshot || '-',
          formula: snap.calculationFormula,
          guidelines: snap.actionPlanGuidelines,
          reference: snap.referenceDocuments || '-',
          status: isRevised ? 'REVISED' : '',
        });
        added.eachCell((cell, colIdx) => {
          if (isRevised && colIdx >= 5) {
            cell.fill = revisedFill;
          }
          cell.border = allBorders;
          cell.alignment = { vertical: 'top', wrapText: true };
        });
        dataRowCount++;
      }
    }

    if (dataRowCount === 0) {
      ws.addRow({
        revision: '-',
        revisedAt: '-',
        revisedBy: '-',
        reason: '-',
        objective: 'No revision history found',
        target: '', unit: '', frequency: '', responsible: '', formula: '', guidelines: '', reference: '', status: '',
      }).eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    }

    ws.autoFilter = { from: 'A1', to: `M${dataRowCount + 1}` };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new Response(buffer as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${naming.fileBaseName}-${date}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
