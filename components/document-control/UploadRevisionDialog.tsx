'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { uploadRevisionSchema } from '@/schemas/documentControlSchema';
import { readApiErrorMessage, readApiJson } from '@/lib/client-api';
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
import type { z } from 'zod';
import type { DocControlStatus } from '@/types/documentControl';

interface DarOption {
  id: string;
  darNo: string | null;
  requestDate?: string;
  objective: string;
  status: string;
}

type UploadRevisionForm = z.input<typeof uploadRevisionSchema>;

interface UploadRevisionDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onSuccess?: () => void;
}

const STATUSES: DocControlStatus[] = ['ACTIVE'];
type DarSortKey = 'requestDate-desc' | 'requestDate-asc' | 'darNo-asc' | 'darNo-desc';

export function UploadRevisionDialog({
  open,
  onClose,
  documentId,
  onSuccess,
}: UploadRevisionDialogProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [darSearch, setDarSearch] = useState('');
  const [darSort, setDarSort] = useState<DarSortKey>('requestDate-desc');

  const { data: darsData } = useQuery<DarOption[]>({
    queryKey: ['completed-dars'],
    queryFn: async () => {
      const res = await fetch('/api/dar?all=true');
      if (!res.ok) throw new Error('Failed to fetch DARs');
      const json = await res.json();
      return (json.data || []) as DarOption[];
    },
    enabled: open,
  });

  const filteredDars = useMemo(() => {
    const q = darSearch.toLowerCase().trim();
    return [...(darsData || [])]
      .filter((dar) => dar.status === 'COMPLETED')
      .filter((dar) => {
        if (!q) return true;
        return (dar.darNo || '').toLowerCase().includes(q) || dar.objective.toLowerCase().includes(q);
      })
      .sort((left, right) => {
        if (darSort === 'darNo-asc') {
          return (left.darNo || '').localeCompare(right.darNo || '', 'en');
        }
        if (darSort === 'darNo-desc') {
          return (right.darNo || '').localeCompare(left.darNo || '', 'en');
        }

        const leftTime = left.requestDate ? new Date(left.requestDate).getTime() : 0;
        const rightTime = right.requestDate ? new Date(right.requestDate).getTime() : 0;
        return darSort === 'requestDate-asc' ? leftTime - rightTime : rightTime - leftTime;
      });
  }, [darSearch, darSort, darsData]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UploadRevisionForm>({
    resolver: zodResolver(uploadRevisionSchema),
    defaultValues: {
      revision: '',
      effectiveDate: '',
      status: 'ACTIVE',
      darMasterId: null,
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
        throw new Error(await readApiErrorMessage(res, 'Failed to upload revision'));
      }
      return readApiJson(res, 'Failed to upload revision');
    },
      onSuccess: () => {
      toast.success(t('documentControl.messages.uploadSuccess'));
      reset();
      setDarSearch('');
      setDarSort('requestDate-desc');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = async (data: UploadRevisionForm) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error(t('documentControl.messages.fileRequired'));
      return;
    }

    const formData = new FormData();
    const safeName = encodeURIComponent(file.name);
    formData.append('file', file, safeName);
    formData.append('filename', file.name);
    formData.append(
      'metadata',
      JSON.stringify({
        revision: data.revision,
        effectiveDate: data.effectiveDate || null,
        status: data.status,
        darMasterId: data.darMasterId || null,
      }),
    );

    await uploadMutation.mutateAsync(formData);
  };

  const isLoading = uploadMutation.isPending;

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
          setDarSearch('');
          setDarSort('requestDate-desc');
        }
      }}
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
            className="h-11 flex-1 rounded-xl bg-primary font-medium text-white hover:bg-primary/90"
          >
            {isLoading ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
      <form id="upload-revision-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="file-upload" className="text-sm font-semibold text-slate-800">
            {t('documentControl.button.upload')} <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-slate-50/50"
          />
          <p className="text-xs text-slate-400">{t('documentControl.fileHint')}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="revision-input" className="text-sm font-semibold text-slate-800">
            {t('documentControl.field.revision')} <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="revision-input"
            {...register('revision')}
            placeholder="e.g. 01, A, Rev.B"
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-slate-50/50 focus-visible:ring-primary"
          />
          {errors.revision && <p className="text-xs text-rose-500">{String(errors.revision.message)}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="effectiveDate-input" className="text-sm font-semibold text-slate-800">
            {t('documentControl.field.effectiveDate')} <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="effectiveDate-input"
            {...register('effectiveDate')}
            type="date"
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-slate-50/50 focus-visible:ring-primary"
          />
          {errors.effectiveDate && <p className="text-xs text-rose-500">{String(errors.effectiveDate.message)}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status-select" className="text-sm font-semibold text-slate-800">
            {t('documentControl.field.status')}
          </Label>
          <Select
            value={status}
            onValueChange={(value) => setValue('status', value as DocControlStatus, { shouldValidate: true })}
            disabled={isLoading}
          >
            <SelectTrigger id="status-select" className="rounded-xl border border-slate-200 bg-slate-50/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`documentControl.status.${item}` as never) || item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dar-select" className="text-sm font-semibold text-slate-800">
            Link DAR (optional)
          </Label>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Search DAR number or objective..."
              value={darSearch}
              onChange={(e) => setDarSearch(e.target.value)}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-slate-50/50"
            />
            <Select value={darSort} onValueChange={(value) => setDarSort(value as DarSortKey)} disabled={isLoading}>
              <SelectTrigger className="rounded-xl border border-slate-200 bg-slate-50/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requestDate-desc">Latest request date</SelectItem>
                <SelectItem value="requestDate-asc">Oldest request date</SelectItem>
                <SelectItem value="darNo-asc">DAR No. A-Z</SelectItem>
                <SelectItem value="darNo-desc">DAR No. Z-A</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={watch('darMasterId') || 'NONE'}
              onValueChange={(value) => setValue('darMasterId', value === 'NONE' ? null : value, { shouldValidate: true })}
              disabled={isLoading}
            >
              <SelectTrigger id="dar-select" className="rounded-xl border border-slate-200 bg-slate-50/50">
                <SelectValue placeholder="No linked DAR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No linked DAR</SelectItem>
                {filteredDars.map((dar) => (
                  <SelectItem key={dar.id} value={dar.id}>
                    {(dar.darNo || 'DAR') + ' - ' + dar.objective}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </form>
    </ResponsiveFormOverlay>
  );
}
