import type { VencStatus } from '@/lib/utils/dates'

const CONFIG: Record<VencStatus, { label: string; cls: string; dot: string }> = {
  overdue: {
    label: 'Vencida',
    cls: 'bg-red-500/10 text-red-400 border-red-500/25',
    dot: 'bg-red-500',
  },
  neardue: {
    label: 'Próxima',
    cls: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    dot: 'bg-orange-500',
  },
  pending: {
    label: 'Pendiente',
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    dot: 'bg-blue-500',
  },
  paid: {
    label: 'Pagada',
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
  const cfg = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {dateLabel ? `${dateLabel} · ${cfg.label}` : cfg.label}
    </span>
  )
}
