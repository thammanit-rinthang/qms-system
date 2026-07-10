'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useT } from '@/lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadRevisionSchema } from '@/schemas/documentControlSchema';
import ResponsiveFormOverlay from '@/components/common/ResponsiveFormOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
interface UploadRevisionDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onSuccess?: () => void;
}

const STATUSES = ['DRAFT', 'ACTIVE', 'OBSOLETE'];

export function UploadRevisionDialog({
  open,
  onClose,
  documentId,
  onSuccess,
}: UploadRevisionDialogProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(uploadRevisionSchema),
    defaultValues: {
      revision: '',
      effectiveDate: '',
      status: 'ACTIVE' as any,
    },
  });

  const status = watch('status') || 'ACTIVE';

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/document-controls/${documentId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to upload revision');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('documentControl.messages.uploadSuccess'));
      reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const onSubmit = async (data: any) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error(t('documentControl.messages.fileRequired'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'metadata',
      JSON.stringify({
        revision: data.revision,
        effectiveDate: data.effectiveDate || null,
        status: data.status,
      })
    );

    await uploadMutation.mutateAsync(formData);
  };

  const isLoading = uploadMutation.isPending;

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={t('documentControl.button.uploadRevision')}
      description={t('documentControl.uploadRevisionDesc')}
      desktopContentClassName="w-[min(96vw,48rem)] max-w-xl rounded-2xl"
      bodyClassName="px-4 py-5 md:px-6 md:py-4"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-11 rounded-xl"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="upload-revision-form"
            disabled={isLoading}
            className="h-11 flex-1 rounded-xl bg-primary text-white font-medium hover:bg-primary/90"
          >
            {isLoading ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
        <form id="upload-revision-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* File Input */}
          <div className="space-y-1.5">
            <Label htmlFor="file-upload" className="text-slate-800 text-sm font-semibold">
              {t('documentControl.button.upload')}{' '}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              disabled={isLoading}
              className="bg-slate-50/50 border border-slate-200 rounded-xl"
            />
            <p className="text-xs text-slate-400">{t('documentControl.fileHint')}</p>
          </div>

          {/* Revision Code (REV) */}
          <div className="space-y-1.5">
            <Label htmlFor="revision-input" className="text-slate-800 text-sm font-semibold">
              {t('documentControl.field.revision')}{' '}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="revision-input"
              {...register('revision')}
              placeholder="e.g. 01, A, Rev.B"
              disabled={isLoading}
              className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
            />
            {errors.revision && (
              <p className="text-rose-500 text-xs">{String(errors.revision.message)}</p>
            )}
          </div>

          {/* Effective Date */}
          <div className="space-y-1.5">
            <Label htmlFor="effectiveDate-input" className="text-slate-800 text-sm font-semibold">
              {t('documentControl.field.effectiveDate')}{' '}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="effectiveDate-input"
              {...register('effectiveDate')}
              type="date"
              disabled={isLoading}
              className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
            />
            {errors.effectiveDate && (
              <p className="text-rose-500 text-xs">{String(errors.effectiveDate.message)}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="status-select" className="text-slate-800 text-sm font-semibold">
              {t('documentControl.field.status')}
            </Label>
            <Select
              value={status}
              onValueChange={(val) => setValue('status', val as any)}
              disabled={isLoading}
            >
              <SelectTrigger
                id="status-select"
                className="bg-slate-50/50 border border-slate-200 rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {t(`documentControl.status.${st}` as any) || st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </form>
    </ResponsiveFormOverlay>
  );
}
