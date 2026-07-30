'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Download, Files, FolderTree, RefreshCw } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useLocale } from '@/lib/locale-context';
import FilterBar from '@/components/common/FilterBar';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { DepartmentFolderGrid } from './DepartmentFolderGrid';
import { DepartmentModal } from './DepartmentModal';
import ConfirmModal from '@/components/common/ConfirmModal';
import DocumentControlExportPreviewModal from './DocumentControlExportPreviewModal';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentControlDetailModal } from './DocumentControlDetailModal';
import type { DocumentControlSummary } from '@/types/documentControl';

interface DepartmentCard {
  id: string;
  name: string;
  categoryCount: number;
  documentCount: number;
  emailGroup?: string | null;
  isActive?: boolean;
}

interface Props {
  departments: DepartmentCard[];
  canManage: boolean;
}

export function DocumentControlsLevelOneClient({ departments, canManage }: Props) {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'folders' | 'all-docs'>('folders');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentCard | null>(null);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const locale = useLocale();
  const isTh = locale === 'th';

  const [docPage, setDocPage] = useState(1);
  const [docSearch, setDocSearch] = useState('');
  const [docStatus, setDocStatus] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { data: previewData } = useQuery({
    queryKey: ['documents-preview-all'],
    queryFn: async () => {
      const res = await fetch('/api/document-controls?limit=5');
      if (!res.ok) throw new Error('Failed to fetch preview');
      return res.json();
    },
    enabled: exportPreviewOpen,
  });

  const { data: docListData, isLoading: docsLoading } = useQuery({
    queryKey: ['all-documents-list', docPage, docSearch, docStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(docPage));
      params.set('limit', '20');
      if (docSearch) params.set('search', docSearch);
      if (docStatus) params.set('status', docStatus);
      const res = await fetch(`/api/document-controls?${params}`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
    enabled: viewMode === 'all-docs',
  });

  const sortOptions = [
    { value: 'name-asc', label: t('documentControl.sort.nameAsc') },
    { value: 'name-desc', label: t('documentControl.sort.nameDesc') },
    { value: 'cat-desc', label: t('documentControl.sort.categoriesDesc') },
    { value: 'doc-desc', label: t('documentControl.sort.documentsDesc') },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return departments.filter((department) => {
      if (q && !department.name.toLowerCase().includes(q)) return false;
      if (statusFilter === 'active' && department.isActive === false) return false;
      if (statusFilter === 'inactive' && department.isActive !== false) return false;
      return true;
    });
  }, [departments, search, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((left, right) => {
      if (sortBy === 'name-asc') return left.name.localeCompare(right.name, 'th');
      if (sortBy === 'name-desc') return right.name.localeCompare(left.name, 'th');
      if (sortBy === 'cat-desc') return right.categoryCount - left.categoryCount;
      if (sortBy === 'doc-desc') return right.documentCount - left.documentCount;
      return 0;
    });
  }, [filtered, sortBy]);

  const totalCategories = useMemo(
    () => departments.reduce((sum, department) => sum + department.categoryCount, 0),
    [departments],
  );

  const totalDocuments = useMemo(
    () => departments.reduce((sum, department) => sum + department.documentCount, 0),
    [departments],
  );

  const activeDepartments = useMemo(
    () => departments.filter((department) => department.isActive !== false).length,
    [departments],
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/doc-control/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to delete department');
      }
    },
    onSuccess: () => {
      toast.success(t('documentDepartment.messages.deleteSuccess'));
      setDeleteTarget(null);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/doc-control/departments/sync', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Sync failed');
      }
      return res.json() as Promise<{ data: { created: number; skipped: number } }>;
    },
    onSuccess: (res) => {
      toast.success(`Synced: ${res.data.created} new department(s) added`);
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAdd = () => {
    setEditingDepartment(null);
    setModalOpen(true);
  };

  const handleEdit = (dept: DepartmentCard) => {
    setEditingDepartment(dept);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const executeExport = () => {
    window.open(`/api/document-controls/export?t=${Date.now()}`, '_blank');
    setExportPreviewOpen(false);
  };

  const openDetail = (id: string) => {
    setSelectedDocId(id);
    setDetailModalOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title={t('documentControl.title')}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportPreviewOpen(true)}
                className="h-9 gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export Master List
              </Button>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="h-9 gap-1.5"
                >
                  <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync from Auth Center
                </Button>
              )}
            </>
          }
        />

        <section className="card-premium rounded-xl border border-slate-100 px-5 py-3.5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{isTh ? `แผนก ${activeDepartments}/${departments.length}` : `Departments ${activeDepartments}/${departments.length}`}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                <FolderTree className="h-3.5 w-3.5 text-primary" />
                <span>{isTh ? `หมวดหมู่ ${totalCategories}` : `Categories ${totalCategories}`}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                <Files className="h-3.5 w-3.5 text-primary" />
                <span>{isTh ? `เอกสาร ${totalDocuments}` : `Documents ${totalDocuments}`}</span>
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode('folders')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === 'folders'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isTh ? 'โฟลเดอร์แผนก' : 'Department Folders'}
              </button>
              <button
                onClick={() => setViewMode('all-docs')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === 'all-docs'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isTh ? 'เอกสารทั้งหมด' : 'All Documents'}
              </button>
            </div>
          </div>
        </section>

        {viewMode === 'all-docs' ? (
          <div className="space-y-6">
            <FilterBar
              searchValue={docSearch}
              onSearchChange={(value) => {
                setDocSearch(value);
                setDocPage(1);
              }}
              searchPlaceholder={isTh ? 'ค้นหาหมายเลขหรือชื่อเอกสาร...' : 'Search document number or name...'}
              searchLabel={t('common.search')}
              filters={[
                {
                  key: 'status',
                  label: t('documentControl.field.status'),
                  options: [
                    { value: 'DRAFT', label: isTh ? 'ฉบับร่าง' : 'Draft' },
                    { value: 'ACTIVE', label: isTh ? 'ใช้งาน' : 'Active' },
                    { value: 'CANCELLED', label: isTh ? 'ยกเลิก' : 'Cancelled' },
                    { value: 'OBSOLETE', label: isTh ? 'ยกเลิกการใช้งาน' : 'Obsolete' },
                  ],
                  allLabel: t('documentControl.filterBar.allStatuses'),
                  minWidth: '10rem',
                },
              ]}
              filterValues={{ status: docStatus }}
              onFilterChange={(key, value) => {
                if (key === 'status') {
                  setDocStatus(value);
                  setDocPage(1);
                }
              }}
              hasActiveFilters={!!docSearch || !!docStatus}
              onClearAll={() => {
                setDocSearch('');
                setDocStatus('');
                setDocPage(1);
              }}
              resultCount={docListData?.data?.length ?? 0}
              totalCount={docListData?.meta?.total ?? 0}
              countLabel={t('documentControl.pagination.items')}
            />

            {docsLoading ? (
              <div className="card-premium p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full rounded-xl" />
                ))}
              </div>
            ) : !docListData?.data?.length ? (
              <div className="card-premium flex items-center justify-center p-16">
                <EmptyState title={t('documentControl.empty')} description={t('documentControl.emptyDesc')} />
              </div>
            ) : (
              <>
                <div className="hidden lg:block card-premium overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral">
                          {isTh ? 'หมายเลขเอกสาร' : 'Document No.'}
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral">
                          {isTh ? 'ชื่อเอกสาร' : 'Document Name'}
                        </th>
                        <th className="w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral">
                          {isTh ? 'แผนก' : 'Department'}
                        </th>
                        <th className="w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral">
                          {isTh ? 'หมวดหมู่' : 'Category'}
                        </th>
                        <th className="w-24 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral">
                          {isTh ? 'ครั้งที่แก้ไข' : 'Revision No.'}
                        </th>
                        <th className="w-36 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral">
                          {isTh ? 'จำนวนครั้งที่แก้ไข' : 'Revision Count'}
                        </th>
                        <th className="w-28 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral">
                          {isTh ? 'สถานะ' : 'Status'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {docListData.data.map((doc: DocumentControlSummary) => {
                        const revCount = doc.revisions?.length ?? 1;
                        const timesRevised = Math.max(0, revCount - 1);

                        return (
                          <tr
                            key={doc.id}
                            onClick={() => openDetail(doc.id)}
                            className="group cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/50 last:border-0"
                          >
                            <td className="px-4 py-3 font-mono text-sm font-semibold text-[#0F1059]">
                              {doc.docNumber}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800 transition-colors group-hover:text-primary">
                              {doc.docName}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral">
                              {doc.department?.name || doc.category?.departmentId || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral">
                              {doc.category?.name || '-'}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-sm text-neutral">
                              {doc.revision ?? '00'}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                {timesRevised === 0
                                  ? (isTh ? 'ยังไม่เคยแก้ไข' : 'Initial')
                                  : (isTh ? `แก้ไข ${timesRevised} ครั้ง` : `${timesRevised} revisions`)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <DocumentStatusBadge status={doc.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={docPage}
                  totalPages={Math.ceil((docListData?.meta?.total ?? 0) / 20)}
                  total={docListData?.meta?.total ?? 0}
                  countLabel={t('documentControl.pagination.items')}
                  onPageChange={(page) => setDocPage(page)}
                />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('documentDepartment.placeholder.search')}
              searchLabel={t('common.search')}
              filters={[
                {
                  key: 'status',
                  label: t('documentControl.field.status'),
                  options: [
                    { value: 'active', label: t('it.departments.active') },
                    { value: 'inactive', label: t('it.departments.inactive') },
                  ],
                  allLabel: t('documentControl.filterBar.allStatuses'),
                  minWidth: '10rem',
                },
                {
                  key: 'sort',
                  label: t('documentControl.sort.label'),
                  options: sortOptions,
                  allLabel: t('documentControl.sort.nameAsc'),
                  minWidth: '14rem',
                },
              ]}
              filterValues={{ status: statusFilter, sort: sortBy }}
              onFilterChange={(key, value) => {
                if (key === 'status') setStatusFilter(value);
                if (key === 'sort') setSortBy(value || 'name-asc');
              }}
              hasActiveFilters={!!search || !!statusFilter || sortBy !== 'name-asc'}
              onClearAll={() => {
                setSearch('');
                setStatusFilter('');
                setSortBy('name-asc');
              }}
              resultCount={sorted.length}
              totalCount={departments.length}
              countLabel={t('documentDepartment.countLabel')}
            />

            <DepartmentFolderGrid
              departments={sorted}
              canManage={canManage}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={(dept) => setDeleteTarget(dept)}
            />
          </div>
        )}
      </div>

      <DepartmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDepartment(null);
        }}
        department={editingDepartment}
        onSuccess={handleSuccess}
      />

      {deleteTarget && (
        <ConfirmModal
          title={t('documentDepartment.deleteConfirm')}
          message={t('documentDepartment.deleteMsg')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          danger
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <DocumentControlExportPreviewModal
        isOpen={exportPreviewOpen}
        onClose={() => setExportPreviewOpen(false)}
        items={previewData?.data ?? []}
        totalCount={previewData?.meta?.total ?? 0}
        onDownload={executeExport}
        isTh={isTh}
      />

      <DocumentControlDetailModal
        documentId={selectedDocId}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        canEdit={canManage}
        canDelete={canManage}
        canViewAuditLog={canManage}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['all-documents-list'] });
          router.refresh();
        }}
      />
    </>
  );
}
