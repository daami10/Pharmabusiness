import { useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useFacturas, useSetPagada } from '@/lib/queries/facturas'
import { formatMoney } from '@/lib/utils/money'
import { formatDate } from '@/lib/utils/dates'
import type { VencStatus } from '@/lib/utils/dates'
import { getEffectiveVencStatus } from './lib/facturas-view'

const TITLES: Record<VencStatus, string> = {
  overdue: 'Facturas vencidas (impagadas)',
  neardue: 'Facturas próximas a vencer (7 días)',
  pending: 'Facturas pendientes de pago',
  paid: 'Facturas pagadas',
}

export function VencListModal({
  status,
  onClose,
}: {
  status: VencStatus | null
  onClose: () => void
}) {
  const { data } = useFacturas()
  const setPagada = useSetPagada()
  const [search, setSearch] = useState('')

  const q = search.toLowerCase().trim()
  const rows = (data ?? [])
    .filter((f) => f.tipo !== 'Abono')
    .filter((f) => {
      if (!status) return false
      const s = getEffectiveVencStatus(f)
      return status === 'pending' ? s === 'pending' || s === 'neardue' : s === status
    })
    .filter(
      (f) =>
        !q ||
        f.laboratorio.toLowerCase().includes(q) ||
        (f.num_factura ?? '').toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const da = a.fecha_vencimiento ?? a.fecha ?? ''
      const db = b.fecha_vencimiento ?? b.fecha ?? ''
      return status === 'paid' ? db.localeCompare(da) : da.localeCompare(db)
    })

  const total = rows.reduce((sum, f) => sum + f.importe, 0)

  return (
    <Dialog
      open={status !== null}
      onClose={onClose}
      title={status ? `${TITLES[status]} (${rows.length})` : ''}
    >
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por laboratorio o nº…"
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
        />
      </div>

      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {!rows.length && (
          <p className="py-8 text-center text-sm text-slate-500">
            No hay facturas en este estado.
          </p>
        )}
        {rows.map((f) => {
          const isPaid = getEffectiveVencStatus(f) === 'paid'
          return (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {f.laboratorio || '—'}
                </p>
                <p className="text-xs text-slate-400">
                  {f.num_factura ? `${f.num_factura} · ` : ''}
                  {formatDate(f.fecha_vencimiento ?? f.fecha)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-extrabold text-white">
                  {formatMoney(f.importe)}
                </span>
                <button
                  type="button"
                  onClick={() => setPagada.mutate({ id: f.id, pagada: !isPaid })}
                  className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                    isPaid
                      ? 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {isPaid ? '↺ Desmarcar' : '✓ Pagada'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Total
        </span>
        <span className="text-lg font-black text-accent-blue">{formatMoney(total)}</span>
      </div>
    </Dialog>
  )
}
