'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useT } from '@/lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createDocumentControlSchema, updateDocumentControlSchema } from '@/schemas/documentControlSchema';
import ResponsiveFormOverlay from '@/components/common/ResponsiveFormOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { DocumentControlDetail, DocControlStatus } from '@/types/documentControl';

interface DocumentControlModalProps {
  open: boolean;
  onClose: () => void;
  /** Passed from URL context when creating a new document */
  categoryId?: string;
  departmentId?: string;
  document?: DocumentControlDetail;
  onSuccess?: () => void;
}

const STATUSES = ['DRAFT', 'ACTIVE', 'OBSOLETE'];

export function DocumentControlModal({
  open,
  onClose,
  categoryId,
  departmentId,
  document,
  onSuccess,
}: DocumentControlModalProps) {
  const t = useT();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(document ? updateDocumentControlSchema : createDocumentControlSchema),
    defaultValues: {
      categoryId: categoryId || '',
      departmentId: departmentId || '',
      docNumber: '',
      docName: '',
      description: '',
      status: 'DRAFT' as DocControlStatus,
    },
  });

  const status = watch('status') || 'DRAFT';

  useEffect(() => {
    if (open) {
      if (document) {
        reset({
          categoryId: document.categoryId || '',
          departmentId: document.departmentId || '',
          docNumber: document.docNumber,
          docName: document.docName,
          description: (document as any).description ?? '',
          status: document.status,
        });
      } else {
        reset({
          categoryId: categoryId || '',
          departmentId: departmentId || '',
          docNumber: '',
          docName: '',
          description: '',
          status: 'DRAFT' as DocControlStatus,
        });
      }
    }
  }, [open, document, categoryId, departmentId, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/document-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to create document');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentControl.messages.createSuccess'));
      reset();
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/document-controls/${document?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update document');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentControl.messages.updateSuccess'));
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onSubmit = async (data: any) => {
    if (document) {
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
      title={document ? t('documentControl.editTitle') : t('documentControl.new')}
      description={document ? document.docNumber : t('documentControl.emptyDesc')}
      desktopContentClassName="w-[min(96vw,56rem)] max-w-2xl"
      bodyClassName="px-4 py-5 md:px-6 md:py-4"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="h-11">
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="doc-control-form"
            disabled={isLoading}
            className="h-11 flex-1 bg-primary hover:bg-primary/90"
          >
            {isLoading ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
          <form id="doc-control-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Document Number */}
            <div className="space-y-1.5">
              <Label htmlFor="docNumber" className="text-slate-800 text-sm font-semibold">
                {t('documentControl.field.docNumber')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="docNumber"
                {...register('docNumber')}
                disabled={isLoading || !!document}
                placeholder={t('documentControl.placeholder.docNumber' as any)}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary font-mono"
              />
              {(errors as any).docNumber && (
                <p className="text-rose-500 text-xs">{String((errors as any).docNumber.message)}</p>
              )}
            </div>

            {/* Document Name */}
            <div className="space-y-1.5">
              <Label htmlFor="docName" className="text-slate-800 text-sm font-semibold">
                {t('documentControl.field.docName')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="docName"
                {...register('docName')}
                disabled={isLoading}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
              />
              {errors.docName && (
                <p className="text-rose-500 text-xs">{String(errors.docName.message)}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-800 text-sm font-semibold">
                {t('documentControl.field.description')}
              </Label>
              <Input
                id="description"
                {...register('description')}
                disabled={isLoading}
                placeholder={t('documentControl.placeholder.description')}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-slate-800 text-sm font-semibold">
                {t('documentControl.field.status')} <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(val) => setValue('status', val as DocControlStatus)}
                disabled={isLoading}
              >
                <SelectTrigger id="status" className="bg-slate-50/50 border border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {t(`documentControl.status.${st}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-rose-500 text-xs">{String(errors.status.message)}</p>
              )}
            </div>
          </form>
    </ResponsiveFormOverlay>
  );
}
