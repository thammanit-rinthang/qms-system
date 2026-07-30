'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentControlModal } from './DocumentControlModal';
import { DocumentControlDetailModal } from './DocumentControlDetailModal';
import { formatDate } from '@/lib/formatters';
import PageHeader from '@/components/common/PageHeader';
import FilterBar from '@/components/common/FilterBar';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { ActionIconButton } from '@/components/common/ActionButtons';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { Plus, ChevronRight, Hash, Download, Home } from 'lucide-react';
import type { DocumentControlSummary } from '@/types/documentControl';
import { useLocale } from '@/lib/locale-context';
import DocumentControlExportPreviewModal from './DocumentControlExportPreviewModal';

interface DocumentControlListClientProps {
  department: { id: string; name: string };
  category: { id: string; name: string };
  canCreate: boolean;
  canDelete: boolean;
}

interface DocumentListResponse {
  data: DocumentControlSummary[];
  meta: { page: number; limit: number; total: number };
}

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'CANCELLED', 'OBSOLETE'];
const EDITABLE_STATUS_OPTIONS = ['ACTIVE', 'CANCELLED'];

const STATUS_SELECT_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  OBSOLETE: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function DocumentControlListClient({ department, category, canCreate, canDelete }: DocumentControlListClientProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const locale = useLocale();
  const isTh = locale === 'th';

  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ['search', 'status', 'page', 'sortBy', 'sortOrder'] as const,
    searchKey: 'search',
    debounceMs: 300,
  });

  const page = Math.max(1, parseInt(params.page || '1', 10));

  const { data, isLoading, error } = useQuery<DocumentListResponse>({
    queryKey: ['documents', category.id, params.search, params.status, page, params.sortBy, params.sortOrder],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('page', String(page));
      p.set('limit', '20');
      p.set('categoryId', category.id);
      if (params.search) p.set('search', params.search);
      if (params.status) p.set('status', params.status);
      if (params.sortBy) p.set('sortBy', params.sortBy);
      if (params.sortOrder) p.set('sortOrder', params.sortOrder);
      const res = await fetch(`/api/document-controls?${p}`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
  });

  const totalPages = data?.meta ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  const statusFilterOptions = STATUS_OPTIONS.map((st) => ({
    label: t(`documentControl.status.${st}` as never),
    value: st,
  }));

  const openDetail = (id: string) => {
    setSelectedDocId(id);
    setDetailModalOpen(true);
  };

  const handleExport = () => {
    setExportPreviewOpen(true);
  };

  const executeExport = () => {
    const exportParams = new URLSearchParams();
    exportParams.set('departmentId', department.id);
    exportParams.set('categoryId', category.id);
    if (params.status) exportParams.set('status', params.status);
    if (params.search) exportParams.set('search', params.search);
    exportParams.set('t', String(Date.now()));
    window.open(`/api/document-controls/export?${exportParams.toString()}`, '_blank');
    setExportPreviewOpen(false);
  };

  const updateStatus = async (docId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/document-controls/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Error');
      queryClient.invalidateQueries({ queryKey: ['documents', category.id] });
      toast.success(t(`documentControl.messages.updateSuccess` as never));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('documentControl.messages.updateFailed' as never));
    }
  };

  const handleStatusChange = (docId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus) {
      updateStatus(docId, newStatus);
    }
  };

  const sortOptions = [
    { value: 'createdAt-desc', label: t('documentControl.sort.latestCreated') },
    { value: 'docNumber-asc', label: t('documentControl.sort.docNumberAsc') },
    { value: 'docNumber-desc', label: t('documentControl.sort.docNumberDesc') },
    { value: 'docName-asc', label: t('documentControl.sort.docNameAsc') },
    { value: 'docName-desc', label: t('documentControl.sort.docNameDesc') },
    { value: 'effectiveDate-desc', label: t('documentControl.sort.effectiveDateDesc') },
    { value: 'effectiveDate-asc', label: t('documentControl.sort.effectiveDateAsc') },
  ];
  const sortVal = params.sortBy && params.sortOrder ? `${params.sortBy}-${params.sortOrder}` : '';

  if (error) {
    return (
      <div className="card-premium p-16 flex flex-col items-center justify-center text-center">
        <p className="font-semibold text-base text-[#0F1059] mb-1">{t('common.error')}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4 rounded-xl">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-neutral flex-wrap">
          <Link href="/qms/document-controls" className="hover:text-[#0F1059] transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Document Controls</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <Link href={`/qms/document-controls/dept/${department.id}`} className="hover:text-[#0F1059] transition-colors">
            {department.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="text-[#0F1059] font-medium">{category.name}</span>
        </nav>

        {/* Page Header */}
        <PageHeader
          title={category.name}
          subtitle={t('documentControl.list')}
          actions={
            canCreate && (
              <>
                <Button variant="outline" onClick={handleExport} className="gap-1.5">
                  <Download className="w-4 h-4" />
                  Export Master List
                </Button>
                <Button onClick={() => setModalOpen(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  {t('documentControl.button.create')}
                </Button>
              </>
            )
          }
        />

        {/* Filter Bar */}
        <FilterBar
          searchValue={rawValues.search}
          onSearchChange={(v) => setParam('search', v)}
          searchPlaceholder={t('documentControl.placeholder.search')}
          filters={[
            {
              key: 'status',
              label: t('documentControl.table.colStatus'),
              options: statusFilterOptions,
              allLabel: t('documentControl.filterBar.allStatuses'),
            },
            {
              key: 'sort',
              label: t('documentControl.sort.label'),
              options: sortOptions,
              allLabel: t('documentControl.sort.latestCreated'),
              minWidth: '14rem',
            },
          ]}
          filterValues={{ ...params, sort: sortVal }}
          onFilterChange={(key, val) => {
            if (key === 'status') {
              setParam('status', val);
              setParam('page', '1');
            } else if (key === 'sort') {
              if (!val) {
                setParam('sortBy', '');
                setParam('sortOrder', '');
              } else {
                const [by, order] = val.split('-');
                setParam('sortBy', by);
                setParam('sortOrder', order);
              }
              setParam('page', '1');
            } else if (
              key === 'search' ||
              key === 'page' ||
              key === 'sortBy' ||
              key === 'sortOrder'
            ) {
              setParam(key, val);
            }
          }}
          hasActiveFilters={hasFilters}
          onClearAll={clearAll}
          resultCount={data?.data?.length ?? 0}
          totalCount={data?.meta?.total ?? 0}
          countLabel={t('documentControl.pagination.items')}
        />

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="card-premium p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <div className="card-premium p-16 flex justify-center items-center">
            <EmptyState title={t('documentControl.empty')} description={t('documentControl.emptyDesc')} />
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="lg:hidden space-y-3">
              {data.data.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => openDetail(doc.id)}
                  className="card-premium p-4 flex flex-col gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-[#0F1059] leading-snug line-clamp-2">{doc.docName}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-neutral">
                        <Hash className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono truncate">{doc.docNumber}</span>
                      </div>
                    </div>
                    {canCreate ? (
                      <select
                        value={doc.status}
                        onChange={(e) => { e.stopPropagation(); handleStatusChange(doc.id, e); }}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs font-medium rounded-full border px-2.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F1059]/20 shrink-0 ${STATUS_SELECT_STYLES[doc.status] ?? 'bg-white text-slate-700 border-slate-200'}`}
                      >
                        {EDITABLE_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st} className={STATUS_SELECT_STYLES[st]}>
                            {t(`documentControl.status.${st}` as never)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <DocumentStatusBadge status={doc.status} />
                    )}
                  </div>
                  {doc.status === 'ACTIVE' && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/document-controls/${doc.id}/download-latest`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-neutral hover:text-[#0F1059] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block card-premium overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-[11px] font-semibold uppercase tracking-wide text-neutral px-4 py-3 text-left w-36">{t('documentControl.table.colNumber')}</th>
                    <th className="text-[11px] font-semibold uppercase tracking-wide text-neutral px-4 py-3 text-left">{t('documentControl.table.colName')}</th>
                    <th className="text-[11px] font-semibold uppercase tracking-wide text-neutral px-4 py-3 text-center w-24">{t('documentControl.field.revision')}</th>
                    <th className="text-[11px] font-semibold uppercase tracking-wide text-neutral px-4 py-3 text-center w-28">{t('documentControl.table.colStatus')}</th>
                    <th className="text-[11px] font-semibold uppercase tracking-wide text-neutral px-4 py-3 text-center w-32">{t('documentControl.field.effectiveDate')}</th>
                    <th className="text-[11px] font-semibold uppercase tracking-wide text-neutral px-4 py-3 text-right w-20 select-none">
                      {t('documentControl.table.colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => openDetail(doc.id)}
                      className="border-b border-slate-100 hover:bg-[#0F1059]/[0.02] transition-colors cursor-pointer last:border-b-0"
                    >
                      <td className="text-neutral text-sm font-mono px-4 py-3">{doc.docNumber}</td>
                      <td className="text-slate-800 text-sm font-medium px-4 py-3 max-w-[280px]">
                        <span className="line-clamp-1">{doc.docName}</span>
                      </td>
                      <td className="text-center px-4 py-3">
                        {doc.revision ? (
                          <span className="inline-flex items-center bg-[#0F1059]/10 text-[#0F1059] text-xs font-mono font-semibold px-2.5 py-1 rounded-full">
                            {doc.revision}
                          </span>
                        ) : (
                          <span className="text-neutral/40 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {canCreate ? (
                          <select
                            value={doc.status}
                            onChange={(e) => { e.stopPropagation(); handleStatusChange(doc.id, e); }}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-xs font-medium rounded-full border px-2.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F1059]/20 ${STATUS_SELECT_STYLES[doc.status] ?? 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            {EDITABLE_STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st} className={STATUS_SELECT_STYLES[st]}>
                                {t(`documentControl.status.${st}` as never)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <DocumentStatusBadge status={doc.status} />
                        )}
                      </td>
                      <td className="text-neutral text-xs font-mono px-4 py-3 text-center">
                        {doc.effectiveDate ? formatDate(doc.effectiveDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionIconButton
                            tone="view"
                            label="View"
                            onClick={(e) => { e.stopPropagation(); openDetail(doc.id); }}
                          />
                          {doc.status === 'ACTIVE' && (doc.spItemId || doc.spDownloadUrl) && (
                            <a
                              href={`/api/document-controls/${doc.id}/download-latest`}
                              onClick={(e) => e.stopPropagation()}
                              title="Download Latest"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#0F1059]/[0.06] text-neutral transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={data.meta.total}
              countLabel={t('documentControl.pagination.items')}
              onPageChange={(p) => setParam('page', String(p))}
            />
          </>
        )}
      </div>

      {/* Create Modal */}
      <DocumentControlModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categoryId={category.id}
        departmentId={department.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents', category.id] });
          setParam('page', '1');
        }}
      />

      {/* Detail Modal — upload revision is inside here */}
      <DocumentControlDetailModal
        documentId={selectedDocId}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        canEdit={canCreate}
        canDelete={canDelete}
        canViewAuditLog={canCreate}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents', category.id] })}
      />

      <DocumentControlExportPreviewModal
        isOpen={exportPreviewOpen}
        onClose={() => setExportPreviewOpen(false)}
        items={data?.data ?? []}
        totalCount={data?.meta?.total ?? 0}
        onDownload={executeExport}
        isTh={isTh}
      />
    </>
  );
}
