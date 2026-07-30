import { useT } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import type { DocControlStatus } from '@/types/documentControl';

interface DocumentStatusBadgeProps {
  status: DocControlStatus;
}

const STATUS_STYLES: Record<DocControlStatus, string> = {
  DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  OBSOLETE: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const t = useT();

  return (
    <Badge
      variant="outline"
      className={`${STATUS_STYLES[status]} rounded-full font-medium`}
    >
      {t(`documentControl.status.${status}` as never)}
    </Badge>
  );
}
