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
  createdBy: { id: string; authUserId?: string | null; name: string | null };
  createdAt: string;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  categoryId: string | null;
  category?: { id: string; name: string; departmentId: string } | null;
}

export interface DocumentControlRevisionDetail {
  id: string;
  documentControlId: string;
  revision: string;
  effectiveDate: string | null;
  status: DocControlStatus;
  spWebUrl: string | null;
  spDownloadUrl: string | null;
  spFolderPath: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdBy: { id: string; authUserId?: string | null; name: string | null };
  createdAt: string;
}

export interface DocumentControlDetail extends DocumentControlSummary {
  spWebUrl: string | null;
  spDownloadUrl: string | null;
  spFolderPath: string | null;
  fileSize: number | null;
  mimeType: string | null;
  updatedBy: { id: string; authUserId?: string | null; name: string | null } | null;
  updatedAt: string;
  revisions: DocumentControlRevisionDetail[];
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

export interface CreateDocumentControlInput {
  categoryId: string;
  departmentId: string;
  docNumber: string;
  docName: string;
  description?: string | null;
  status?: DocControlStatus;
}

export interface UpdateDocumentControlInput {
  categoryId?: string;
  departmentId?: string;
  docName?: string;
  description?: string | null;
  status?: DocControlStatus;
}

export interface UploadRevisionInput {
  revision: string;
  effectiveDate?: string | null;
  status?: DocControlStatus;
}
