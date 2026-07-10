'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentControlModal } from './DocumentControlModal';
import { UploadRevisionDialog } from './UploadRevisionDialog';
import { formatDate, formatBytes } from '@/lib/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { DocumentControlDetail } from '@/types/documentControl';

interface DocumentControlDetailClientProps {
  document: DocumentControlDetail;
  canEdit: boolean;
  canDelete: boolean;
}

export function DocumentControlDetailClient({
  document,
  canEdit,
  canDelete,
}: DocumentControlDetailClientProps) {
  const t = useT();
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F1059]">{document.docName}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('documentControl.field.docNumber')}:{' '}
              <span className="font-mono">{document.docNumber}</span>
              {document.revision && (
                <>
                  {' · '}
                  {t('documentControl.field.revision')}: {document.revision}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {document.spDownloadUrl && (
              <Button
                onClick={() => window.open(document.spDownloadUrl!, '_blank')}
                variant="outline"
                className="h-11 rounded-xl"
              >
                {t('documentControl.button.download')}
              </Button>
            )}
            {canEdit && (
              <>
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-xl"
                >
                  {t('documentControl.button.uploadRevision')}
                </Button>
                <Button
                  onClick={() => setEditModalOpen(true)}
                  className="bg-[#0F1059] hover:bg-[#161875] text-white h-11 rounded-xl"
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

        {/* Main Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
              {t('dar.field.department')}
            </p>
            <p className="text-slate-800 font-medium">
              {document.department?.name || '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
              {t('documentControl.field.category')}
            </p>
            <p className="text-slate-800 font-medium">
              {(document as any).category?.name || '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
              {t('documentControl.field.status')}
            </p>
            <DocumentStatusBadge status={document.status as any} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
              {t('documentControl.field.effectiveDate')}
            </p>
            <p className="text-slate-800 font-mono">
              {document.effectiveDate ? formatDate(document.effectiveDate) : '—'}
            </p>
          </div>
        </div>

        {/* Description */}
        {document.description && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-3">
              {t('documentControl.field.description')}
            </p>
            <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed">
              {document.description}
            </p>
          </div>
        )}

        {/* File Info */}
        {document.fileName && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-4">
              {t('documentControl.section.fileInfo')}
            </p>
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl">
              <div>
                <p className="font-medium text-slate-800 text-sm">{document.fileName}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {document.fileSize && formatBytes(document.fileSize)}
                  {document.fileSize && document.mimeType && ' · '}
                  {document.mimeType}
                </p>
              </div>
              {document.spDownloadUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(document.spDownloadUrl!, '_blank')}
                >
                  {t('documentControl.button.download')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Revision History */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <p className="text-slate-800 font-semibold text-sm mb-4">
            {t('documentControl.section.revisionHistory')}
          </p>
          {!document.revisions?.length ? (
            <p className="text-sm text-slate-400 py-2">
              {t('documentControl.section.noRevisions')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-slate-800 text-sm font-semibold py-3 px-4">{t('documentControl.field.revision')}</th>
                    <th className="text-slate-800 text-sm font-semibold py-3 px-4">{t('documentControl.field.status')}</th>
                    <th className="text-slate-800 text-sm font-semibold py-3 px-4">{t('documentControl.field.effectiveDate')}</th>
                    <th className="text-slate-800 text-sm font-semibold py-3 px-4">{t('documentControl.field.fileName')}</th>
                    <th className="text-slate-800 text-sm font-semibold py-3 px-4">{t('documentControl.field.createdBy')}</th>
                    <th className="text-slate-800 text-sm font-semibold py-3 px-4">{t('documentControl.field.createdAt')}</th>
                    <th className="text-slate-800 text-sm font-semibold py-3 px-4 text-right">{t('documentControl.table.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {document.revisions.map((rev) => (
                    <tr key={rev.id} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-700">{rev.revision}</td>
                      <td className="py-3 px-4">
                        <DocumentStatusBadge status={rev.status as any} />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {rev.effectiveDate ? formatDate(rev.effectiveDate) : '—'}
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-600 font-medium" title={rev.fileName || ''}>
                        {rev.fileName || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{rev.createdBy?.name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {formatDate(rev.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {rev.spDownloadUrl && rev.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(rev.spDownloadUrl!, '_blank')}
                            className="text-primary hover:bg-slate-100 h-9"
                          >
                            {t('documentControl.button.download')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <h3 className="text-slate-800 font-semibold text-sm mb-4">
            {t('documentControl.section.metadata')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">
                {t('documentControl.field.createdBy')}
              </p>
              <p className="text-slate-800 font-medium mt-0.5">
                {document.createdBy?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">
                {t('documentControl.field.createdAt')}
              </p>
              <p className="text-slate-800 font-medium font-mono mt-0.5">
                {formatDate(document.createdAt)}
              </p>
            </div>
            {document.updatedBy && (
              <>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide">
                    {t('documentControl.field.updatedBy')}
                  </p>
                  <p className="text-slate-800 font-medium mt-0.5">
                    {document.updatedBy.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide">
                    {t('documentControl.field.updatedAt')}
                  </p>
                  <p className="text-slate-800 font-medium font-mono mt-0.5">
                    {formatDate(document.updatedAt)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <DocumentControlModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        document={document}
        onSuccess={() => router.refresh()}
      />

      {/* Upload Revision Dialog */}
      <UploadRevisionDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        documentId={document.id}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirmation Dialog */}
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
