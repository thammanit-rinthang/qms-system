import type { DocControlStatus } from '@/generated/prisma/client';
export type { DocControlStatus } from '@/generated/prisma/client';

export interface DocumentCategorySummary {
  id: string;
  name: string;
  description: string | null;
  order: number;
  departmentId: string;
  department?: { id: string; name: string };
  _count?: { documents: number };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentControlSummary {
  id: string;
  docNumber: string;
  docName: string;
  revision: string | null;
  description: string | null;
  status: DocControlStatus;
  effectiveDate: string | null;
  fileName: string | null;
  spItemId?: string | null;
  spDownloadUrl?: string | null;
  createdBy: { id: string; authUserId?: string | null; name: string | null };
  createdAt: string;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  categoryId: string | null;
  category?: { id: string; name: string; departmentId: string } | null;
  revisions?: {
    id: string;
    revision: string;
    status: DocControlStatus;
    effectiveDate?: string | null;
    createdAt: string;
  }[];
}

export interface DocumentControlRevisionDetail {
  id: string;
  documentControlId: string;
  revision: string;
  effectiveDate: string | null;
  status: DocControlStatus;
  spItemId: string | null;
  spWebUrl: string | null;
  spDownloadUrl: string | null;
  spFolderPath: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdBy: { id: string; authUserId?: string | null; name: string | null };
  createdAt: string;
  darMasterId?: string | null;
  darMaster?: { id: string; darNo: string | null; objective: string } | null;
  distribution?: { id: string; linkToDocumentControl: boolean } | null;
}

export interface DocumentControlDetail extends DocumentControlSummary {
  spItemId: string | null;
  spWebUrl: string | null;
  spDownloadUrl: string | null;
  spFolderPath: string | null;
  fileSize: number | null;
  mimeType: string | null;
  updatedBy: { id: string; authUserId?: string | null; name: string | null } | null;
  updatedAt: string;
  revisions: DocumentControlRevisionDetail[];
  distributions?: DocumentDistribution[];
}

export interface CreateDocumentCategoryInput {
  departmentId: string;
  name: string;
  description?: string | null;
  order?: number;
}

export interface UpdateDocumentCategoryInput {
  name?: string;
  description?: string | null;
  order?: number;
}

export interface DocumentDistribution {
  departmentName: string;
  authDepartmentId: string | null;
}

export interface CreateDocumentControlInput {
  categoryId: string;
  departmentId: string;
  docNumber: string;
  docName: string;
  description?: string | null;
  status?: DocControlStatus;
  distributions?: DocumentDistribution[];
}

export interface UpdateDocumentControlInput {
  categoryId?: string;
  departmentId?: string;
  docName?: string;
  description?: string | null;
  status?: DocControlStatus;
  distributions?: DocumentDistribution[];
}

export interface UploadRevisionInput {
  revision: string;
  effectiveDate?: string | null;
  status?: DocControlStatus;
}

export interface DocumentControlExportRow {
  id: string;
  docNumber: string;
  docName: string;
  revision: string | null;
  status: DocControlStatus;
  effectiveDate: string | null;
  description: string | null;
  departmentName: string | null;
  categoryName: string | null;
  createdByName: string | null;
  createdAt: string;
  requestedByName: string | null;
  latestRevisionCreatedAt: string | null;
  latestRevisionCreatedByName: string | null;
  latestDarNo: string | null;
  latestDarObjective: string | null;
  latestDarRequestDate: string | null;
  distributions?: { departmentName: string; authDepartmentId: string | null }[];
}
