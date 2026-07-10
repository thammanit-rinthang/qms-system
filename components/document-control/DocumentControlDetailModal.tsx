'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentControlModal } from './DocumentControlModal';
import { UploadRevisionDialog } from './UploadRevisionDialog';
import { formatDate, formatBytes } from '@/lib/formatters';
import type { DocumentControlDetail } from '@/types/documentControl';

interface DocumentControlDetailModalProps {
  documentId: string | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onSuccess?: () => void;
}

export function DocumentControlDetailModal({
  documentId,
  open,
  onClose,
  canEdit,
  canDelete,
}: DocumentControlDetailModalProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    retry: (_, err) => !([401, 403, 404].includes((err as any).status)),
  });

  const document = data?.data;

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

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['document-detail', documentId] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-[#0F1059] font-bold text-xl leading-tight pr-8">
              {isLoading ? (
                <Skeleton className="h-6 w-48 rounded-lg" />
              ) : (
                document?.docName || t('documentControl.viewTitle')
              )}
            </DialogTitle>
            {isLoading ? (
              <Skeleton className="h-4 w-32 rounded-lg mt-1" />
            ) : document ? (
              <DialogDescription className="font-mono text-slate-500 text-sm">
                {document.docNumber}
                {document.revision && ` · REV: ${document.revision}`}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : error ? (
              (() => {
                const status = (error as any).status;
                if (status === 401 || status === 403) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                      </div>
                      <p className="text-slate-800 font-semibold text-sm">{t('unauthorized.title')}</p>
                      <p className="text-slate-400 text-sm max-w-xs">{t('unauthorized.insufficientRole')}</p>
                      <Button variant="outline" size="sm" onClick={onClose} className="mt-1 rounded-xl">
                        {t('common.close')}
                      </Button>
                    </div>
                  );
                }
                if (status === 404) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      <p className="text-slate-800 font-semibold text-sm">{t('documentControl.empty')}</p>
                      <p className="text-slate-400 text-sm">{t('documentControl.emptyDesc')}</p>
                      <Button variant="outline" size="sm" onClick={onClose} className="mt-1 rounded-xl">
                        {t('common.close')}
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                    </div>
                    <p className="text-slate-800 font-semibold text-sm">{t('common.error')}</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-1 rounded-xl">
                      {t('common.retry')}
                    </Button>
                  </div>
                );
              })()
            ) : document ? (
              <>
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {document.spWebUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(document.spWebUrl!, '_blank')}
                      className="rounded-xl h-9"
                    >
                      {t('documentControl.button.preview')}
                    </Button>
                  )}
                  {document.spDownloadUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(document.spDownloadUrl!, '_blank')}
                      className="rounded-xl h-9"
                    >
                      {t('documentControl.button.download')}
                    </Button>
                  )}
                  {canEdit && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setUploadDialogOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-xl"
                      >
                        {t('documentControl.button.uploadRevision')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setEditModalOpen(true)}
                        className="bg-[#0F1059] hover:bg-[#161875] text-white h-9 rounded-xl"
                      >
                        {t('documentControl.button.edit')}
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      className="h-9 rounded-xl"
                    >
                      {t('documentControl.button.delete')}
                    </Button>
                  )}
                </div>

                {/* Info Grid */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">
                      {t('dar.field.department')}
                    </p>
                    <p className="text-slate-800 font-medium text-sm">
                      {document.department?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">
                      {t('documentControl.field.category')}
                    </p>
                    <p className="text-slate-800 font-medium text-sm">
                      {(document as any).category?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">
                      {t('documentControl.field.status')}
                    </p>
                    <DocumentStatusBadge status={document.status as any} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">
                      {t('documentControl.field.effectiveDate')}
                    </p>
                    <p className="text-slate-800 font-mono text-sm">
                      {document.effectiveDate ? formatDate(document.effectiveDate) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">
                      {t('documentControl.field.createdBy')}
                    </p>
                    <p className="text-slate-800 font-medium text-sm">
                      {document.createdBy?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">
                      {t('documentControl.field.updatedAt')}
                    </p>
                    <p className="text-slate-800 font-mono text-sm">
                      {formatDate(document.updatedAt)}
                    </p>
                  </div>
                </div>

                {/* Current File */}
                {document.fileName && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-3">
                      {t('documentControl.section.fileInfo')}
                    </p>
                    <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{document.fileName}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                          {document.fileSize && formatBytes(document.fileSize)}
                          {document.fileSize && document.mimeType && ' · '}
                          {document.mimeType}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {document.spWebUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(document.spWebUrl!, '_blank')}
                            className="rounded-xl"
                          >
                            {t('documentControl.button.preview')}
                          </Button>
                        )}
                        {document.spDownloadUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(document.spDownloadUrl!, '_blank')}
                            className="rounded-xl"
                          >
                            {t('documentControl.button.download')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Revision History */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
                  <p className="text-slate-800 font-semibold text-sm mb-4">
                    {t('documentControl.section.revisionHistory')}
                  </p>
                  {!document.revisions?.length ? (
                    <p className="text-sm text-slate-400 py-2">
                      {t('documentControl.section.noRevisions')}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-white border-b border-slate-100">
                          <tr>
                            <th className="text-slate-800 text-sm font-semibold text-left py-2 px-3">
                              {t('documentControl.field.revision')}
                            </th>
                            <th className="text-slate-800 text-sm font-semibold text-left py-2 px-3">
                              {t('documentControl.field.status')}
                            </th>
                            <th className="text-slate-800 text-sm font-semibold text-left py-2 px-3">
                              {t('documentControl.field.effectiveDate')}
                            </th>
                            <th className="text-slate-800 text-sm font-semibold text-left py-2 px-3">
                              {t('documentControl.field.createdBy')}
                            </th>
                            <th className="text-slate-800 text-sm font-semibold text-right py-2 px-3">
                              {t('documentControl.table.colActions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {document.revisions.map((rev) => (
                            <tr
                              key={rev.id}
                              className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-700 font-mono">
                                {rev.revision}
                              </td>
                              <td className="py-2.5 px-3">
                                <DocumentStatusBadge status={rev.status as any} />
                              </td>
                              <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                                {rev.effectiveDate ? formatDate(rev.effectiveDate) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-xs">
                                {rev.createdBy?.name || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {rev.spWebUrl && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => window.open(rev.spWebUrl!, '_blank')}
                                      className="h-8 text-slate-600 hover:bg-slate-100 text-xs"
                                    >
                                      {t('documentControl.button.preview')}
                                    </Button>
                                  )}
                                  {rev.spDownloadUrl && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => window.open(rev.spDownloadUrl!, '_blank')}
                                      className="h-8 text-[#0F1059] hover:bg-slate-100 text-xs"
                                    >
                                      {t('documentControl.button.download')}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal (stacks on top) */}
      {document && (
        <DocumentControlModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          document={document}
          onSuccess={handleSuccess}
        />
      )}

      {/* Upload Revision Dialog */}
      {documentId && (
        <UploadRevisionDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          documentId={documentId}
          onSuccess={handleSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('documentControl.deleteConfirm')}</DialogTitle>
            <DialogDescription>{t('documentControl.deleteMsg')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.loading') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
