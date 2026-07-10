'use client';

import Link from 'next/link';
import { FolderOpen, FileText, Plus } from 'lucide-react';
import { ActionIconButton } from '@/components/common/ActionButtons';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import EmptyState from '@/components/common/EmptyState';

interface CategoryCard {
  id: string;
  name: string;
  description: string | null;
  _count: { documents: number };
}

interface CategoryFolderGridProps {
  departmentId: string;
  categories: CategoryCard[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (cat: CategoryCard) => void;
  onDelete: (cat: CategoryCard) => void;
}

export function CategoryFolderGrid({
  departmentId,
  categories,
  canManage,
  onAdd,
  onEdit,
  onDelete,
}: CategoryFolderGridProps) {
  const t = useT();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={onAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t('documentCategory.button.add')}
          </Button>
        </div>
      )}

      {!categories.length ? (
        <div className="card-premium p-16 flex justify-center items-center">
          <EmptyState
            title={t('documentCategory.empty')}
            description={canManage ? t('documentCategory.emptyDesc') : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="card-premium group relative flex flex-col gap-3 p-5 "
            >
              {/* Clickable overlay to navigate */}
              <Link
                href={`/qms/document-controls/dept/${departmentId}/cat/${cat.id}`}
                className="absolute inset-0 rounded-xl"
                aria-label={cat.name}
              />

              {/* Folder icon */}
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <FolderOpen className="w-5 h-5 text-amber-500" />
              </div>

              {/* Name */}
              <p className="font-semibold text-sm text-[#0F1059] leading-snug line-clamp-2">
                {cat.name}
              </p>

              {/* Doc count */}
              <div className="flex items-center gap-1 text-xs text-neutral mt-auto">
                <FileText className="w-3 h-3" />
                <span>{cat._count.documents} docs</span>
              </div>

              {/* Hover actions — raised above Link overlay */}
              {canManage && (
                <div className="absolute top-3 right-3 z-10 hidden group-hover:flex gap-1">
                  <ActionIconButton
                    tone="edit"
                    label="Edit"
                    onClick={(e) => { e.preventDefault(); onEdit(cat); }}
                    className="h-7 w-7 shadow-sm"
                  />
                  <ActionIconButton
                    tone="delete"
                    label="Delete"
                    onClick={(e) => { e.preventDefault(); onDelete(cat); }}
                    className="h-7 w-7 shadow-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
