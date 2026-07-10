'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useT } from '@/lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createDocumentCategorySchema, updateDocumentCategorySchema } from '@/schemas/documentCategorySchema';
import ResponsiveFormOverlay from '@/components/common/ResponsiveFormOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DocumentCategorySummary } from '@/types/documentControl';

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  category?: DocumentCategorySummary | null;
  onSuccess?: () => void;
}

export function CategoryModal({ open, onClose, departmentId, category, onSuccess }: CategoryModalProps) {
  const t = useT();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(category ? updateDocumentCategorySchema : createDocumentCategorySchema),
    defaultValues: { name: '', description: '', order: 0, departmentId },
  });

  useEffect(() => {
    if (open) {
      reset(
        category
          ? { name: category.name, description: category.description ?? '', order: category.order }
          : { name: '', description: '', order: 0, departmentId }
      );
    }
  }, [open, category, reset, departmentId]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/document-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, departmentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to create category');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentCategory.messages.createSuccess'));
      reset();
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/document-categories/${category?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update category');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentCategory.messages.updateSuccess'));
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onSubmit = async (data: any) => {
    if (category) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={category ? t('documentCategory.editTitle') : t('documentCategory.new')}
      description={category ? category.name : t('documentCategory.emptyDesc')}
      desktopContentClassName="w-[min(96vw,48rem)] max-w-xl"
      bodyClassName="px-4 py-5 md:px-6 md:py-4"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="h-11">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="category-form" disabled={isLoading} className="h-11 flex-1 bg-primary hover:bg-primary/90">
            {isLoading ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
          <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-slate-800 text-sm font-semibold">
                {t('documentCategory.field.name')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="cat-name"
                {...register('name')}
                disabled={isLoading}
                placeholder={t('documentCategory.placeholder.name')}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
              />
              {errors.name && <p className="text-rose-500 text-xs">{String(errors.name.message)}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc" className="text-slate-800 text-sm font-semibold">
                {t('documentCategory.field.description')}
              </Label>
              <Input
                id="cat-desc"
                {...register('description')}
                disabled={isLoading}
                placeholder={t('documentCategory.placeholder.description')}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-order" className="text-slate-800 text-sm font-semibold">
                {t('documentCategory.field.order')}
              </Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                {...register('order', { valueAsNumber: true })}
                disabled={isLoading}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary w-24"
              />
            </div>
          </form>
    </ResponsiveFormOverlay>
  );
}
