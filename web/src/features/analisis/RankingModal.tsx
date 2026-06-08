import { useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { formatMoney } from '@/lib/utils/money'

export interface RankingItem {
  lab: string
  amount: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export function RankingModal({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: RankingItem[]
}) {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase().trim()
  const total = items.reduce((s, r) => s + r.amount, 0)
  const filtered = items.filter((r) => !q || r.lab.toLowerCase().includes(q))

  return (
    <Dialog open={open} onClose={onClose} title="Ranking de gasto por proveedor">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor…"
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
        />
      </div>

      <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
        {!filtered.length && (
          <p className="py-8 text-center text-sm text-slate-500">Sin resultados.</p>
        )}
        {filtered.map((r) => {
          const rank = items.indexOf(r)
          const pct = total > 0 ? (r.amount / total) * 100 : 0
          return (
            <div
              key={r.lab}
              className="rounded-xl px-2.5 py-3 transition-colors hover:bg-white/5"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="w-6 shrink-0 text-center text-xs font-black text-slate-400">
                    {MEDALS[rank] ?? `${rank + 1}º`}
                  </span>
                  <span className="truncate text-sm font-extrabold text-white">
                    {r.lab}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="text-sm font-black text-white">
                    {formatMoney(r.amount)}
                  </span>
                  <span className="ml-1.5 rounded bg-accent-blue/10 px-1.5 py-0.5 text-2xs font-bold text-accent-blue">
                    {pct.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-950/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-accent-blue"
                  style={{ width: `${pct}%` }}
                />
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
