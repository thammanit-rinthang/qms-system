'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { FilePreviewModal, type FilePreviewTarget } from '@/components/common/FilePreviewModal';
import ConfirmModal from '@/components/common/ConfirmModal';
import { formatBytes, formatDate } from '@/lib/formatters';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentControlModal } from './DocumentControlModal';
import { UploadRevisionDialog } from './UploadRevisionDialog';
import type { DocumentControlDetail, DocumentControlRevisionDetail } from '@/types/documentControl';

interface DownloadLogRow {
  id: string;
  actorName?: string | null;
  actorRole: string;
  createdAt: string;
  after?: { revision?: string } | null;
}

interface DocumentControlDetailClientProps {
  document: DocumentControlDetail;
  canEdit: boolean;
  canDelete: boolean;
  canViewAuditLog: boolean;
}

function buildPreviewTarget(
  fileName: string | null,
  mimeType: string | null,
  spItemId: string | null | undefined,
  spDownloadUrl: string | null | undefined,
): FilePreviewTarget | null {
  if (!fileName || (!spItemId && !spDownloadUrl)) return null;
  return {
    fileName,
    mimeType,
    sharePointItemId: spItemId ?? null,
    spDownloadUrl: spDownloadUrl ?? null,
  };
}

function getActiveRevision(document: DocumentControlDetail): DocumentControlRevisionDetail | null {
  return document.revisions.find((revision) => revision.status === 'ACTIVE') ?? document.revisions[0] ?? null;
}

export function DocumentControlDetailClient({
  document,
  canEdit,
  canDelete,
  canViewAuditLog,
}: DocumentControlDetailClientProps) {
  const t = useT();
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [revisionToDelete, setRevisionToDelete] = useState<DocumentControlRevisionDetail | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);

  const { data: downloadLogsData, refetch: refetchLogs } = useQuery<DownloadLogRow[]>({
    queryKey: ['document-download-logs', document.id],
    queryFn: async () => {
      const res = await fetch(`/api/document-controls/${document.id}/download-logs`);
      if (!res.ok) throw new Error('Failed to fetch download logs');
      const json = await res.json();
      return (json.data || []) as DownloadLogRow[];
    },
    enabled: canViewAuditLog,
  });

  const downloadLogs = downloadLogsData ?? [];
  const activeRevision = useMemo(() => getActiveRevision(document), [document]);

  const latestPreviewTarget = useMemo(() => {
    if (document.status !== 'ACTIVE') return null;
    return buildPreviewTarget(
      activeRevision?.fileName ?? document.fileName,
      activeRevision?.mimeType ?? document.mimeType,
      activeRevision?.spItemId ?? document.spItemId,
      activeRevision?.spDownloadUrl ?? document.spDownloadUrl,
    );
  }, [activeRevision, document]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/document-controls/${document.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentControl.messages.deleteSuccess'));
      router.push('/qms/document-controls');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteRevisionMutation = useMutation({
    mutationFn: async (revisionId: string) => {
      const res = await fetch(`/api/document-controls/${document.id}/revisions/${revisionId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? json.error ?? 'Failed to delete revision');
      return json;
    },
    onSuccess: () => {
      toast.success('Revision deleted');
      setRevisionToDelete(null);
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDocDownload = () => {
    window.open(`/api/document-controls/${document.id}/download-latest`, '_blank', 'noopener,noreferrer');
    if (canViewAuditLog) {
      setTimeout(() => void refetchLogs(), 1200);
    }
  };

  const handleRevisionDownload = (revisionId: string) => {
    window.open(`/api/document-controls/${document.id}/revisions/${revisionId}/download`, '_blank', 'noopener,noreferrer');
    if (canViewAuditLog) {
      setTimeout(() => void refetchLogs(), 1200);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F1059]">{document.docName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {t('documentControl.field.docNumber')}: <span className="font-mono">{document.docNumber}</span>
              {document.revision ? ` · ${t('documentControl.field.revision')}: ${document.revision}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestPreviewTarget && (
              <Button onClick={() => setPreviewTarget(latestPreviewTarget)} variant="outline" className="h-11 rounded-xl">
                {t('documentControl.button.preview')}
              </Button>
            )}
            {document.status === 'ACTIVE' && (
              <Button onClick={handleDocDownload} variant="outline" className="h-11 rounded-xl">
                {t('documentControl.button.download')}
              </Button>
            )}
            {canEdit && (
              <>
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {t('documentControl.button.uploadRevision')}
                </Button>
                <Button
                  onClick={() => setEditModalOpen(true)}
                  className="h-11 rounded-xl bg-[#0F1059] text-white hover:bg-[#161875]"
                >
                  {t('documentControl.button.edit')}
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                className="h-11 rounded-xl"
              >
                {t('documentControl.button.delete')}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('dar.field.department')}
            </p>
            <p className="font-medium text-slate-800">{document.department?.name || '-'}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('documentControl.field.category')}
            </p>
            <p className="font-medium text-slate-800">{document.category?.name || '-'}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('documentControl.field.status')}
            </p>
            <DocumentStatusBadge status={document.status} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('documentControl.field.effectiveDate')}
            </p>
            <p className="font-mono text-slate-800">
              {document.effectiveDate ? formatDate(document.effectiveDate) : '-'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('documentControl.field.description')}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{document.description || '-'}</p>
        </div>

        {document.fileName && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('documentControl.section.fileInfo')}
            </p>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{document.fileName}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {document.fileSize ? formatBytes(document.fileSize) : ''}
                  {document.fileSize && document.mimeType ? ' · ' : ''}
                  {document.mimeType || ''}
                </p>
              </div>
              <div className="flex gap-2">
                {latestPreviewTarget && (
                  <Button size="sm" variant="outline" onClick={() => setPreviewTarget(latestPreviewTarget)}>
                    {t('documentControl.button.preview')}
                  </Button>
                )}
                {document.status === 'ACTIVE' && (
                  <Button size="sm" variant="outline" onClick={handleDocDownload}>
                    {t('documentControl.button.download')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="mb-4 text-sm font-semibold text-slate-800">
            {t('documentControl.section.revisionHistory')}
          </p>
          {!document.revisions?.length ? (
            <p className="py-2 text-sm text-slate-400">{t('documentControl.section.noRevisions')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">{t('documentControl.field.revision')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">{t('documentControl.field.status')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">{t('documentControl.field.effectiveDate')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">{t('documentControl.field.fileName')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">DAR</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">{t('documentControl.field.createdBy')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">{t('documentControl.field.createdAt')}</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-800">{t('documentControl.table.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {document.revisions.map((rev) => {
                    const revisionPreviewTarget =
                      document.status === 'ACTIVE' && rev.status === 'ACTIVE'
                        ? buildPreviewTarget(rev.fileName, rev.mimeType, rev.spItemId, rev.spDownloadUrl)
                        : null;

                    return (
                      <tr key={rev.id} className="border-b border-slate-100/50 transition-colors hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{rev.revision}</td>
                        <td className="px-4 py-3">
                          <DocumentStatusBadge status={rev.status} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {rev.effectiveDate ? formatDate(rev.effectiveDate) : '-'}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 font-medium text-slate-600" title={rev.fileName || ''}>
                          {rev.fileName || '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-600">
                          {rev.darMaster?.darNo ? (
                            <a
                              href={`/qms/dar/${rev.darMasterId}`}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {rev.darMaster.darNo}
                            </a>
                          ) : (
                            '-'
                          )}
                          {rev.distribution?.linkToDocumentControl && (
                            <a
                              href={`/qms/distribution/${rev.distribution.id}`}
                              className="ml-2 inline-block text-[10px] font-semibold text-info bg-info/10 rounded-full px-2 py-0.5 hover:underline"
                            >
                              แจกจ่ายแล้ว
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{rev.createdBy?.name || '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDate(rev.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {revisionPreviewTarget && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewTarget(revisionPreviewTarget)}
                                className="h-9 hover:bg-slate-100"
                              >
                                {t('documentControl.button.preview')}
                              </Button>
                            )}
                            {document.status === 'ACTIVE' && rev.status === 'ACTIVE' && (rev.spItemId || rev.spDownloadUrl) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRevisionDownload(rev.id)}
                                className="h-9 text-primary hover:bg-slate-100"
                              >
                                {t('documentControl.button.download')}
                              </Button>
                            )}
                            {canDelete && rev.status !== 'ACTIVE' && (
                              <Button size="sm" variant="ghost" onClick={() => setRevisionToDelete(rev)} className="h-9 text-rose-600 hover:bg-rose-50">
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canViewAuditLog && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="mb-4 text-sm font-semibold text-slate-800">Download Audit Log</p>
            {!downloadLogs.length ? (
              <p className="py-4 text-center text-xs text-slate-400">No download history for this document yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-600">User</th>
                      <th className="px-3 py-2 font-semibold text-slate-600">Role</th>
                      <th className="px-3 py-2 font-semibold text-slate-600">Revision</th>
                      <th className="px-3 py-2 font-semibold text-slate-600">Downloaded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downloadLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100/50 transition-colors hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-medium text-slate-700">{log.actorName || 'Unknown User'}</td>
                        <td className="px-3 py-2 text-slate-500">{log.actorRole}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {log.after?.revision ? `Rev. ${log.after.revision}` : '-'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">{formatDate(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">{t('documentControl.section.metadata')}</h3>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('documentControl.field.createdBy')}</p>
              <p className="mt-0.5 font-medium text-slate-800">{document.createdBy?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('documentControl.field.createdAt')}</p>
              <p className="mt-0.5 font-mono font-medium text-slate-800">{formatDate(document.createdAt)}</p>
            </div>
            {document.updatedBy && (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t('documentControl.field.updatedBy')}</p>
                  <p className="mt-0.5 font-medium text-slate-800">{document.updatedBy.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t('documentControl.field.updatedAt')}</p>
                  <p className="mt-0.5 font-mono font-medium text-slate-800">{formatDate(document.updatedAt)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <DocumentControlModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        document={document}
        onSuccess={() => router.refresh()}
      />

      <UploadRevisionDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        documentId={document.id}
        onSuccess={() => router.refresh()}
      />

      {showDeleteDialog && (
        <ConfirmModal
          title={t('documentControl.deleteConfirm')}
          message={t('documentControl.deleteMsg')}
          confirmLabel={deleteMutation.isPending ? t('common.loading') : t('common.delete')}
          cancelLabel={t('common.cancel')}
          loading={deleteMutation.isPending}
          danger
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}

      {revisionToDelete && (
        <ConfirmModal
          title="Delete revision"
          message={`Delete revision ${revisionToDelete.revision}? This cannot be undone.`}
          confirmLabel={deleteRevisionMutation.isPending ? t('common.loading') : t('common.delete')}
          cancelLabel={t('common.cancel')}
          loading={deleteRevisionMutation.isPending}
          danger
          onConfirm={() => deleteRevisionMutation.mutate(revisionToDelete.id)}
          onCancel={() => setRevisionToDelete(null)}
        />
      )}

      {previewTarget && <FilePreviewModal target={previewTarget} onClose={() => setPreviewTarget(null)} />}
    </>
  );
}
