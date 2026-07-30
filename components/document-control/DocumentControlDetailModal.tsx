'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface DocumentControlDetailModalProps {
  documentId: string | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canViewAuditLog?: boolean;
  onSuccess?: () => void;
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

export function DocumentControlDetailModal({
  documentId,
  open,
  onClose,
  canEdit,
  canDelete,
  canViewAuditLog = false,
  onSuccess,
}: DocumentControlDetailModalProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [revisionToDelete, setRevisionToDelete] = useState<DocumentControlRevisionDetail | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);
  const hasChildOverlay = editModalOpen || uploadDialogOpen || showDeleteDialog || !!revisionToDelete || !!previewTarget;

  const { data, isLoading, error } = useQuery<{ data: DocumentControlDetail }, { status?: number }>({
    queryKey: ['document-detail', documentId],
    queryFn: async () => {
      const res = await fetch(`/api/document-controls/${documentId}`);
      if (!res.ok) {
        const err = Object.assign(new Error('Failed to fetch document'), { status: res.status });
        throw err;
      }
      return res.json();
    },
    enabled: !!documentId && open,
    retry: (_, err) => ![401, 403, 404].includes(err.status ?? 0),
  });

  const document = data?.data;

  const { data: downloadLogsData, refetch: refetchLogs } = useQuery<DownloadLogRow[]>({
    queryKey: ['document-download-logs', documentId],
    queryFn: async () => {
      const res = await fetch(`/api/document-controls/${documentId}/download-logs`);
      if (!res.ok) throw new Error('Failed to fetch download logs');
      const json = await res.json();
      return (json.data || []) as DownloadLogRow[];
    },
    enabled: !!documentId && open && canViewAuditLog,
  });

  const downloadLogs = downloadLogsData ?? [];

  const activeRevision = useMemo(
    () => (document ? getActiveRevision(document) : null),
    [document],
  );

  const latestPreviewTarget = useMemo(() => {
    if (!document || document.status !== 'ACTIVE') return null;
    return buildPreviewTarget(
      activeRevision?.fileName ?? document.fileName,
      activeRevision?.mimeType ?? document.mimeType,
      activeRevision?.spItemId ?? document.spItemId,
      activeRevision?.spDownloadUrl ?? document.spDownloadUrl,
    );
  }, [activeRevision, document]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/document-controls/${documentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentControl.messages.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowDeleteDialog(false);
      onClose();
    },
    onError: () => toast.error(t('common.error')),
  });

  const deleteRevisionMutation = useMutation({
    mutationFn: async (revisionId: string) => {
      const res = await fetch(`/api/document-controls/${documentId}/revisions/${revisionId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? json.error ?? 'Failed to delete revision');
      return json;
    },
    onSuccess: () => {
      toast.success('Revision deleted');
      setRevisionToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['document-detail', documentId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['document-detail', documentId] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    onSuccess?.();
  };

  const handleDocDownload = () => {
    if (!documentId) return;
    window.open(`/api/document-controls/${documentId}/download-latest`, '_blank', 'noopener,noreferrer');
    if (canViewAuditLog) {
      setTimeout(() => void refetchLogs(), 1200);
    }
  };

  const handleRevisionDownload = (revisionId: string) => {
    if (!documentId) return;
    window.open(`/api/document-controls/${documentId}/revisions/${revisionId}/download`, '_blank', 'noopener,noreferrer');
    if (canViewAuditLog) {
      setTimeout(() => void refetchLogs(), 1200);
    }
  };

  return (
    <>
      <Dialog open={open && !hasChildOverlay} onOpenChange={(value) => !value && onClose()}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6">
            <DialogTitle className="pr-8 text-xl font-bold text-slate-900">
              {isLoading ? <Skeleton className="h-7 w-56 rounded-xl" /> : document?.docName || t('documentControl.viewTitle')}
            </DialogTitle>
            {isLoading ? (
              <Skeleton className="mt-1 h-4 w-40 rounded-xl" />
            ) : document ? (
              <DialogDescription className="font-mono text-sm text-slate-500">
                {document.docNumber}
                {document.revision ? ` · REV: ${document.revision}` : ''}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                {t('common.error')}
              </div>
            ) : document ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {latestPreviewTarget && (
                    <Button variant="outline" size="sm" onClick={() => setPreviewTarget(latestPreviewTarget)} className="h-9 rounded-xl">
                      {t('documentControl.button.preview')}
                    </Button>
                  )}
                  {document.status === 'ACTIVE' && (activeRevision?.spItemId || activeRevision?.spDownloadUrl || document.spItemId || document.spDownloadUrl) && (
                    <Button variant="outline" size="sm" onClick={handleDocDownload} className="h-9 rounded-xl">
                      {t('documentControl.button.download')}
                    </Button>
                  )}
                  {canEdit && (
                    <>
                      <Button size="sm" onClick={() => setUploadDialogOpen(true)} className="h-9 rounded-xl">
                        {t('documentControl.button.uploadRevision')}
                      </Button>
                      <Button size="sm" onClick={() => setEditModalOpen(true)} className="h-9 rounded-xl">
                        {t('documentControl.button.edit')}
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)} className="h-9 rounded-xl">
                      {t('documentControl.button.delete')}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t('dar.field.department')}</p>
                    <p className="text-sm font-medium text-slate-800">{document.department?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t('documentControl.field.category')}</p>
                    <p className="text-sm font-medium text-slate-800">{document.category?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t('documentControl.field.status')}</p>
                    <DocumentStatusBadge status={document.status} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t('documentControl.field.effectiveDate')}</p>
                    <p className="text-sm font-mono text-slate-800">{document.effectiveDate ? formatDate(document.effectiveDate) : '-'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{t('documentControl.field.description')}</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{document.description || '-'}</p>
                </div>

                {document.fileName && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">{t('documentControl.section.fileInfo')}</p>
                    <div className="flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{document.fileName}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">
                          {document.fileSize ? formatBytes(document.fileSize) : ''}
                          {document.fileSize && document.mimeType ? ' · ' : ''}
                          {document.mimeType || ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
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

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="mb-4 text-sm font-semibold text-slate-800">{t('documentControl.section.revisionHistory')}</p>
                  {!document.revisions.length ? (
                    <p className="py-2 text-sm text-slate-400">{t('documentControl.section.noRevisions')}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 font-semibold text-slate-800">{t('documentControl.field.revision')}</th>
                            <th className="px-3 py-2 font-semibold text-slate-800">{t('documentControl.field.status')}</th>
                            <th className="px-3 py-2 font-semibold text-slate-800">{t('documentControl.field.effectiveDate')}</th>
                            <th className="px-3 py-2 font-semibold text-slate-800">{t('documentControl.field.fileName')}</th>
                            <th className="px-3 py-2 font-semibold text-slate-800">DAR</th>
                            <th className="px-3 py-2 font-semibold text-slate-800">{t('documentControl.field.createdBy')}</th>
                            <th className="px-3 py-2 font-semibold text-slate-800">{t('documentControl.table.colActions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {document.revisions.map((revision) => {
                            const revisionPreviewTarget =
                                document.status === 'ACTIVE' && revision.status === 'ACTIVE'
                                ? buildPreviewTarget(revision.fileName, revision.mimeType, revision.spItemId, revision.spDownloadUrl)
                                : null;

                            return (
                              <tr key={revision.id} className="border-t border-slate-100">
                                <td className="px-3 py-3 font-semibold text-slate-700">{revision.revision}</td>
                                <td className="px-3 py-3"><DocumentStatusBadge status={revision.status} /></td>
                                <td className="px-3 py-3 font-mono text-xs text-slate-500">{revision.effectiveDate ? formatDate(revision.effectiveDate) : '-'}</td>
                                <td className="px-3 py-3 text-slate-700">{revision.fileName || '-'}</td>
                                <td className="px-3 py-3 font-mono text-xs text-slate-700">{revision.darMaster?.darNo || '-'}</td>
                                <td className="px-3 py-3 text-slate-500">{revision.createdBy?.name || '-'}</td>
                                <td className="px-3 py-3">
                                  <div className="flex justify-end gap-2">
                                    {revisionPreviewTarget && (
                                      <Button size="sm" variant="ghost" onClick={() => setPreviewTarget(revisionPreviewTarget)}>
                                        {t('documentControl.button.preview')}
                                      </Button>
                                    )}
                                    {document.status === 'ACTIVE' && revision.status === 'ACTIVE' && (
                                      <Button size="sm" variant="ghost" onClick={() => handleRevisionDownload(revision.id)}>
                                        {t('documentControl.button.download')}
                                      </Button>
                                    )}
                                    {canDelete && revision.status !== 'ACTIVE' && (
                                      <Button size="sm" variant="ghost" onClick={() => setRevisionToDelete(revision)} className="text-rose-600 hover:bg-rose-50">
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
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="mb-4 text-sm font-semibold text-slate-800">Download Audit Log</p>
                    {!downloadLogs.length ? (
                      <p className="py-2 text-sm text-slate-400">No download history for this document yet.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-slate-800">User</th>
                              <th className="px-3 py-2 font-semibold text-slate-800">Role</th>
                              <th className="px-3 py-2 font-semibold text-slate-800">Revision</th>
                              <th className="px-3 py-2 font-semibold text-slate-800">Downloaded At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {downloadLogs.map((log) => (
                              <tr key={log.id} className="border-t border-slate-100">
                                <td className="px-3 py-3 text-slate-700">{log.actorName || 'Unknown User'}</td>
                                <td className="px-3 py-3 text-slate-500">{log.actorRole}</td>
                                <td className="px-3 py-3 font-mono text-xs text-slate-700">{log.after?.revision || '-'}</td>
                                <td className="px-3 py-3 font-mono text-xs text-slate-500">{formatDate(log.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {document && (
        <DocumentControlModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          document={document}
          onSuccess={handleSuccess}
        />
      )}

      {documentId && (
        <UploadRevisionDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          documentId={documentId}
          onSuccess={handleSuccess}
        />
      )}

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
