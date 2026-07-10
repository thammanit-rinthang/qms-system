/* eslint-disable @typescript-eslint/no-explicit-any */
import { useT } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import type { DocControlStatus } from '@/types/documentControl';

interface DocumentStatusBadgeProps {
  status: DocControlStatus;
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const t = useT();

  const styles: Record<DocControlStatus, { bg: string; text: string; border: string; symbol: string }> = {
    DRAFT: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      symbol: '',
    },
    ACTIVE: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      symbol: ' ✓',
    },
    OBSOLETE: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      symbol: ' ✕',
    },
  };

  const style = styles[status];

  const label = `documentControl.status.${status}`;

  return (
    <Badge
      variant="outline"
      className={`${style.bg} ${style.text} ${style.border} font-medium rounded-full`}
    >
      {t(label as any)}{style.symbol}
    </Badge>
  );
}
