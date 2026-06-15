import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatMoney } from '@/lib/utils/money'

export interface MonthSection<T> {
  key: string
  label: string
  items: T[]
  total: number
  /** Texto del contador, p.ej. "3 nóminas" o "2 previstos". */
  countLabel: string
  /** Si el periodo es futuro (estilo naranja "previsto"). */
  isFuture?: boolean
}

/**
 * Tabla agrupada por mes, colapsable. Patrón compartido entre Fiscalidad,
 * Nóminas y Seguros (y, a futuro, Facturas). El primer grupo se abre por defecto.
 */
export function MonthGroupAccordion<T>({
  groups,
  colSpan,
  renderRow,
  defaultExpandedKey,
}: {
  groups: MonthSection<T>[]
  colSpan: number
  renderRow: (item: T, isFuture: boolean) => ReactNode
  defaultExpandedKey?: string
}) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const hasDefaultKey = defaultExpandedKey && groups.some((g) => g.key === defaultExpandedKey)

  const isOpen = (key: string, idx: number) => {
    if (key in overrides) return overrides[key]
    if (hasDefaultKey) return key === defaultExpandedKey
    return idx === 0
  }
  const toggle = (key: string, idx: number) =>
    setOverrides((prev) => ({ ...prev, [key]: !isOpen(key, idx) }))

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5">
      <table className="w-full text-left">
        {groups.map((g, idx) => {
          const open = isOpen(g.key, idx)
          return (
            <tbody key={g.key} className="divide-y divide-white/5">
              <tr
                className="cursor-pointer select-none bg-white/5 transition-colors hover:bg-white/10"
                onClick={() => toggle(g.key, idx)}
              >
                <td colSpan={colSpan} className="px-6 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
                      />
                      <span className="text-sm font-bold capitalize text-slate-200">
                        {g.label}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-bold ${
                          g.isFuture
                            ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                            : 'border-white/5 bg-white/5 text-slate-500'
                        }`}
                      >
                        {g.countLabel}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-extrabold ${g.isFuture ? 'text-orange-400' : 'text-accent-blue'}`}
                    >
                      {formatMoney(g.total)}
                    </span>
                  </div>
                </td>
              </tr>
              {open && g.items.map((item) => renderRow(item, g.isFuture ?? false))}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
