'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
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
import type {
  CreateDocumentControlInput,
  DocumentControlDetail,
  DocumentDistribution,
  DocControlStatus,
  UpdateDocumentControlInput,
} from '@/types/documentControl';

const DEPT_COLUMN_CODES = [
  "MD", "QMS", "SM", "PU", "HR", "SHE", "PD", "QA", "QC", "QC Lab", "WH", "MO", "EN", "IT", "MN", "GA", "PN"
];

interface DocumentControlModalProps {
  open: boolean;
  onClose: () => void;
  /** Passed from URL context when creating a new document */
  categoryId?: string;
  departmentId?: string;
  document?: DocumentControlDetail;
  onSuccess?: () => void;
}

const STATUSES: DocControlStatus[] = ['ACTIVE', 'CANCELLED'];

export function DocumentControlModal({
  open,
  onClose,
  categoryId,
  departmentId,
  document,
  onSuccess,
}: DocumentControlModalProps) {
  const t = useT();

  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateDocumentControlInput | UpdateDocumentControlInput>({
      resolver: zodResolver(document ? updateDocumentControlSchema : createDocumentControlSchema) as unknown as Resolver<CreateDocumentControlInput | UpdateDocumentControlInput>,
      defaultValues: {
        categoryId: categoryId || '',
        departmentId: departmentId || '',
        docNumber: '',
        docName: '',
        description: '',
        status: 'ACTIVE' as DocControlStatus,
      },
  });

  const status = watch('status') || 'DRAFT';

  function toggleDept(code: string) {
    setSelectedDepts((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  useEffect(() => {
    if (open) {
      if (document) {
        setSelectedDepts((document.distributions ?? []).map((d) => d.departmentName));
        reset({
          categoryId: document.categoryId || '',
          departmentId: document.departmentId || '',
          docNumber: document.docNumber,
          docName: document.docName,
          description: document.description ?? '',
          status: document.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
        });
      } else {
        setSelectedDepts([]);
        reset({
          categoryId: categoryId || '',
          departmentId: departmentId || '',
          docNumber: '',
          docName: '',
          description: '',
          status: 'ACTIVE' as DocControlStatus,
        });

        if (categoryId && departmentId) {
          fetch(`/api/document-controls/next-number?categoryId=${categoryId}&departmentId=${departmentId}`)
            .then((res) => res.json())
            .then((json) => {
              if (json?.data?.nextNumber) {
                setValue('docNumber', json.data.nextNumber, { shouldValidate: true });
              }
            })
            .catch((err) => console.error('Failed to fetch next document number', err));
        }
      }
    }
  }, [open, document, categoryId, departmentId, reset, setValue]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateDocumentControlInput) => {
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
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateDocumentControlInput) => {
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
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = async (data: CreateDocumentControlInput | UpdateDocumentControlInput) => {
    const distributions: DocumentDistribution[] = selectedDepts.map((code) => ({
      departmentName: code,
      authDepartmentId: null,
    }));
    const payload = { ...data, distributions };
    if (document) {
      await updateMutation.mutateAsync(payload as UpdateDocumentControlInput);
    } else {
      await createMutation.mutateAsync(payload as CreateDocumentControlInput);
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
                placeholder={t('documentControl.placeholder.docNumber' as never)}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary font-mono"
              />
              {'docNumber' in errors && errors.docNumber && (
                <p className="text-rose-500 text-xs">{String(errors.docNumber.message)}</p>
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
                {t('documentControl.field.description')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="description"
                {...register('description')}
                disabled={isLoading}
                placeholder={t('documentControl.placeholder.description')}
                className="bg-slate-50/50 border border-slate-200 rounded-xl focus-visible:ring-primary"
              />
              {errors.description && (
                <p className="text-rose-500 text-xs">{String(errors.description.message)}</p>
              )}
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
                      {t(`documentControl.status.${st}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-rose-500 text-xs">{String(errors.status.message)}</p>
              )}
            </div>

            {/* Distribution Departments */}
            <div className="space-y-2">
              <Label className="text-slate-800 text-sm font-semibold">
                {t('documentControl.field.distribution') || 'Distribution'}
              </Label>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50/30">
                {DEPT_COLUMN_CODES.map((code) => (
                  <label key={code} className="flex items-center gap-1.5 cursor-pointer text-xs md:text-sm">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 text-primary bg-white border-slate-300 rounded focus:ring-primary"
                      checked={selectedDepts.includes(code)}
                      onChange={() => toggleDept(code)}
                      disabled={isLoading}
                    />
                    <span className="text-slate-700">{code}</span>
                  </label>
                ))}
              </div>
            </div>
          </form>
    </ResponsiveFormOverlay>
  );
}
