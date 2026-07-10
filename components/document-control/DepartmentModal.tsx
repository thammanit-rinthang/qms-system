'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useT } from '@/lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import ResponsiveFormOverlay from '@/components/common/ResponsiveFormOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const departmentSchema = z.object({
  name: z.string().min(1, 'ชื่อแผนกต้องไม่ว่างเปล่า').max(100),
  emailGroup: z.string().max(100).nullable().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

interface DepartmentModalProps {
  open: boolean;
  onClose: () => void;
  department?: { id: string; name: string; emailGroup?: string | null; isActive?: boolean } | null;
  onSuccess?: () => void;
}

export function DepartmentModal({ open, onClose, department, onSuccess }: DepartmentModalProps) {
  const t = useT();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', emailGroup: '', isActive: true },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (open) {
      reset(
        department
          ? {
              name: department.name,
              emailGroup: department.emailGroup ?? '',
              isActive: department.isActive !== false,
            }
          : { name: '', emailGroup: '', isActive: true }
      );
    }
  }, [open, department, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.name,
        emailGroup: data.emailGroup || null,
        isActive: data.isActive,
      };
      const res = await fetch('/api/doc-control/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to create department');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentDepartment.messages.createSuccess'));
      reset();
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.name,
        emailGroup: data.emailGroup || null,
        isActive: data.isActive,
      };
      const res = await fetch(`/api/doc-control/departments/${department?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update department');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentDepartment.messages.updateSuccess'));
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onSubmit = async (data: any) => {
    if (department) {
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
      title={department ? t('documentDepartment.editTitle') : t('documentDepartment.new')}
      description={department ? department.name : t('documentDepartment.emptyDesc')}
      desktopContentClassName="w-[min(96vw,48rem)] max-w-xl"
      bodyClassName="px-4 py-5 md:px-6 md:py-4"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="h-11 rounded-xl">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="department-form" disabled={isLoading} className="h-11 flex-1 rounded-xl bg-primary text-white font-medium hover:bg-primary/90">
            {isLoading ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
          <form id="department-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name" className="text-slate-800 text-sm font-semibold">
                {t('documentDepartment.field.name')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="dept-name"
                {...register('name')}
                disabled={isLoading}
                placeholder={t('documentDepartment.placeholder.name')}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
              />
              {errors.name && <p className="text-rose-500 text-xs">{String(errors.name.message)}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-email" className="text-slate-800 text-sm font-semibold">
                {t('documentDepartment.field.emailGroup')}
              </Label>
              <Input
                id="dept-email"
                {...register('emailGroup')}
                disabled={isLoading}
                placeholder={t('documentDepartment.placeholder.emailGroup')}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
              />
              {errors.emailGroup && <p className="text-rose-500 text-xs">{String(errors.emailGroup.message)}</p>}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                id="dept-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setValue('isActive', e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-[#0F1059] bg-slate-50 border-slate-300 rounded focus:ring-[#0F1059]"
              />
              <Label htmlFor="dept-active" className="text-slate-800 text-sm font-semibold cursor-pointer select-none">
                {t('documentDepartment.field.isActive')}
              </Label>
            </div>
          </form>
    </ResponsiveFormOverlay>
  );
}
