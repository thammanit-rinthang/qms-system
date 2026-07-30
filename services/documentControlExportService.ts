import type { Prisma } from "@/generated/prisma/client";
import { DocumentControlRepository } from "@/repositories/documentControlRepository";
import type { DocumentControlExportRow } from "@/types/documentControl";

function parseDistributions(raw: Prisma.JsonValue | null): { departmentName: string; authDepartmentId: string | null }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((d) => ({
      departmentName: (d as { departmentName?: string })?.departmentName ?? "",
      authDepartmentId: (d as { authDepartmentId?: string | null })?.authDepartmentId ?? null,
    }));
  }
  return [];
}

function mergeDistributions(
  docDistributions: ReturnType<typeof parseDistributions>,
  darDistributions: ReturnType<typeof parseDistributions>,
) {
  const seen = new Set<string>();
  const merged = [...docDistributions];
  for (const d of docDistributions) {
    if (d.authDepartmentId) seen.add(d.authDepartmentId);
  }
  for (const d of darDistributions) {
    if (d.authDepartmentId && !seen.has(d.authDepartmentId)) {
      merged.push(d);
      seen.add(d.authDepartmentId);
    }
  }
  return merged;
}

export class DocumentControlExportService {
  private repo = new DocumentControlRepository();

  async listRows(where: Prisma.DocumentControlWhereInput): Promise<DocumentControlExportRow[]> {
    const rows = await this.repo.findForExport(where);
    const results: DocumentControlExportRow[] = [];

    for (const row of rows) {
      const docDistributions = parseDistributions(row.distributions);

      if (!row.revisions || row.revisions.length === 0) {
        results.push({
          id: row.id,
          docNumber: row.docNumber,
          docName: row.docName,
          revision: row.revision,
          status: row.status,
          effectiveDate: row.effectiveDate?.toISOString() ?? null,
          description: row.description ?? null,
          departmentName: row.departmentName ?? null,
          categoryName: row.category?.name ?? null,
          createdByName: row.createdByName ?? null,
          createdAt: row.createdAt.toISOString(),
          requestedByName: row.createdByName ?? null,
          latestRevisionCreatedAt: null,
          latestRevisionCreatedByName: null,
          latestDarNo: null,
          latestDarObjective: null,
          latestDarRequestDate: null,
          distributions: docDistributions,
        });
      } else {
        for (const rev of row.revisions) {
          const darDistributions = rev.darMaster?.distributions.map((d: { departmentName: string | null; authDepartmentId: string | null }) => ({
            departmentName: d.departmentName ?? "",
            authDepartmentId: d.authDepartmentId,
          })) ?? [];

          results.push({
            id: `${row.id}-${rev.revision}`,
            docNumber: row.docNumber,
            docName: row.docName,
            revision: rev.revision,
            status: rev.status,
            effectiveDate: rev.effectiveDate?.toISOString() ?? null,
            description: row.description ?? null,
            departmentName: row.departmentName ?? null,
            categoryName: row.category?.name ?? null,
            createdByName: rev.createdByName ?? null,
            createdAt: row.createdAt.toISOString(),
            requestedByName: rev.darMaster?.requesterName ?? rev.createdByName ?? row.createdByName ?? null,
            latestRevisionCreatedAt: rev.createdAt?.toISOString() ?? null,
            latestRevisionCreatedByName: rev.createdByName ?? null,
            latestDarNo: rev.darMaster?.darNo ?? null,
            latestDarObjective: rev.darMaster?.objective ?? null,
            latestDarRequestDate: rev.darMaster?.requestDate?.toISOString() ?? null,
            distributions: mergeDistributions(docDistributions, darDistributions),
          });
        }
      }
    }

    return results;
  }
}
