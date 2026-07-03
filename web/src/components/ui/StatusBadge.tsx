import type { VencStatus } from '@/lib/utils/dates'
import { useTranslation } from '@/lib/i18n'

const CONFIG: Record<
  VencStatus,
  { labelKey: string; defaultLabel: string; cls: string; dot: string }
> = {
  overdue: {
    labelKey: 'facturas.status.overdue',
    defaultLabel: 'Vencida',
    cls: 'bg-red-500/10 text-red-400 border-red-500/25',
    dot: 'bg-red-500',
  },
  neardue: {
    labelKey: 'facturas.status.neardue',
    defaultLabel: 'Próxima',
    cls: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    dot: 'bg-orange-500',
  },
  pending: {
    labelKey: 'facturas.status.pending',
    defaultLabel: 'Pendiente',
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    dot: 'bg-blue-500',
  },
  paid: {
    labelKey: 'facturas.status.paid',
    defaultLabel: 'Pagada',
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
}

export function StatusBadge({
  status,
  dateLabel,
}: {
  status: VencStatus
  dateLabel?: string
}) {
  const { t } = useTranslation()
  const cfg = CONFIG[status]
  const label = t(cfg.labelKey, cfg.defaultLabel)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {dateLabel ? `${dateLabel} · ${label}` : label}
    </span>
  )
}
