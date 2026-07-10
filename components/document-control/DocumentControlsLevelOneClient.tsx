'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { useT } from '@/lib/i18n';
import PageHeader from '@/components/common/PageHeader';
import FilterBar from '@/components/common/FilterBar';
import { Button } from '@/components/ui/button';
import { DepartmentFolderGrid } from './DepartmentFolderGrid';
import { DepartmentModal } from './DepartmentModal';
import ConfirmModal from '@/components/common/ConfirmModal';

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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentCard | null>(null);


  const sortOptions = [
    { value: 'name-asc', label: t('documentControl.sort.nameAsc') },
    { value: 'name-desc', label: t('documentControl.sort.nameDesc') },
    { value: 'cat-desc', label: t('documentControl.sort.categoriesDesc') },
    { value: 'doc-desc', label: t('documentControl.sort.documentsDesc') },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return departments.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (statusFilter === 'active' && d.isActive === false) return false;
      if (statusFilter === 'inactive' && d.isActive !== false) return false;
      return true;
    });
  }, [departments, search, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'th');
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'th');
      if (sortBy === 'cat-desc') return b.categoryCount - a.categoryCount;
      if (sortBy === 'doc-desc') return b.documentCount - a.documentCount;
      return 0;
    });
  }, [filtered, sortBy]);

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

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title={t('documentControl.title')}
            subtitle={t('documentControl.list')}
          />
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync from Auth Center
            </Button>
          )}
        </div>

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
          onFilterChange={(key, val) => {
            if (key === 'status') setStatusFilter(val);
            if (key === 'sort') setSortBy(val || 'name-asc');
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

      {/* Department Modal */}
      <DepartmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDepartment(null);
        }}
        department={editingDepartment}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirm Modal */}
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
    </>
  );
}
