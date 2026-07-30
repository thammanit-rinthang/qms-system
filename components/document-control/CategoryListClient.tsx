'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, Download, Home } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryFolderGrid } from './CategoryFolderGrid';
import { CategoryModal } from './CategoryModal';
import ConfirmModal from '@/components/common/ConfirmModal';
import PageHeader from '@/components/common/PageHeader';
import FilterBar from '@/components/common/FilterBar';
import type { DocumentCategorySummary } from '@/types/documentControl';
import { useLocale } from '@/lib/locale-context';
import DocumentControlExportPreviewModal from './DocumentControlExportPreviewModal';

interface CategoryListClientProps {
  department: { id: string; name: string };
  canManage: boolean;
}

export function CategoryListClient({ department, canManage }: CategoryListClientProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('order-asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategorySummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentCategorySummary | null>(null);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const locale = useLocale();
  const isTh = locale === 'th';

  const { data: previewData } = useQuery({
    queryKey: ['documents-preview-dept', department.id],
    queryFn: async () => {
      const res = await fetch(`/api/document-controls?departmentId=${department.id}&limit=5`);
      if (!res.ok) throw new Error('Failed to fetch preview');
      return res.json();
    },
    enabled: exportPreviewOpen,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['document-categories', department.id],
    queryFn: async () => {
      const res = await fetch(`/api/document-categories?departmentId=${department.id}`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/document-categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to delete category');
      }
    },
    onSuccess: () => {
      toast.success(t('documentCategory.messages.deleteSuccess'));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['document-categories', department.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  const handleAdd = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleEdit = (cat: DocumentCategorySummary) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const executeExport = () => {
    window.open(`/api/document-controls/export?departmentId=${department.id}&t=${Date.now()}`, '_blank');
    setExportPreviewOpen(false);
  };

  const categories: DocumentCategorySummary[] = useMemo(() => data?.data ?? [], [data?.data]);


  const sortOptions = [
    { value: 'order-asc', label: t('documentControl.sort.displayOrder') },
    { value: 'name-asc', label: t('documentControl.sort.nameAsc') },
    { value: 'name-desc', label: t('documentControl.sort.nameDesc') },
    { value: 'doc-desc', label: t('documentControl.sort.documentsDesc') },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return categories.filter((cat) => {
      if (q && !cat.name.toLowerCase().includes(q) && !(cat.description || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [categories, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'order-asc') return a.order - b.order;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'th');
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'th');
      if (sortBy === 'doc-desc') {
        const countA = a._count?.documents ?? 0;
        const countB = b._count?.documents ?? 0;
        return countB - countA;
      }
      return 0;
    });
  }, [filtered, sortBy]);

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-neutral flex-wrap">
          <Link href="/qms/document-controls" className="hover:text-[#0F1059] transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Document Controls</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="text-[#0F1059] font-medium">{department.name}</span>
        </nav>

        <PageHeader
          title={department.name}
          subtitle={t('documentCategory.list')}
          actions={canManage ? (
            <Button
              variant="outline"
              onClick={() => setExportPreviewOpen(true)}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              Export Master List
            </Button>
          ) : undefined}
        />

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('documentCategory.placeholder.search')}
          searchLabel={t('common.search')}
          filters={[
            {
              key: 'sort',
              label: t('documentControl.sort.label'),
              options: sortOptions,
              allLabel: t('documentControl.sort.displayOrder'),
              minWidth: '14rem',
            },
          ]}
          filterValues={{ sort: sortBy }}
          onFilterChange={(key, val) => {
            if (key === 'sort') setSortBy(val || 'order-asc');
          }}
          hasActiveFilters={!!search || sortBy !== 'order-asc'}
          onClearAll={() => {
            setSearch('');
            setSortBy('order-asc');
          }}
          resultCount={sorted.length}
          totalCount={categories.length}
          countLabel={t('documentCategory.countLabel')}
        />

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <CategoryFolderGrid
            departmentId={department.id}
            categories={sorted}
            canManage={canManage}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={(cat) => setDeleteTarget(cat)}
          />
        )}
      </div>

      {/* Category Modal */}
      <CategoryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCategory(null); }}
        departmentId={department.id}
        category={editingCategory}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['document-categories', department.id] })}
      />

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ConfirmModal
          title={t('documentCategory.deleteConfirm')}
          message={t('documentCategory.deleteMsg')}
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
    </>
  );
}
