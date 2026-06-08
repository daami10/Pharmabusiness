import { useMemo, useState } from 'react'
import { ChevronDown, Search, Trash2 } from 'lucide-react'
import { useFacturas, useDeleteFactura } from '@/lib/queries/facturas'
import { useYearStore } from '@/stores/yearStore'
import { getWholesalers, isWholesaler } from '@/lib/config/wholesalers'
import { formatMoney } from '@/lib/utils/money'
import { formatDate } from '@/lib/utils/dates'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Factura } from '@/types/domain'
import {
  filterFacturas,
  getEffectiveVencStatus,
  groupByMonth,
  netTotal,
} from './lib/facturas-view'
import type { FacturaCategory } from './lib/facturas-view'

const TIPO_BADGE: Record<string, string> = {
  Laboratorio: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  Mayorista: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  Otro: 'bg-slate-500/10 border-slate-500/20 text-slate-300',
  Abono: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
}

function tipoBadgeClass(tipo: string, wholesalers: string[]): string {
  if (tipo === 'Abono') return TIPO_BADGE.Abono
  if (isWholesaler(tipo, wholesalers)) return TIPO_BADGE.Mayorista
  return TIPO_BADGE[tipo] ?? TIPO_BADGE.Otro
}

export function FacturasPage() {
  const { data, isLoading, isError, error } = useFacturas()
  const deleteFactura = useDeleteFactura()
  const year = useYearStore((s) => s.year)

  const wholesalers = useMemo(() => getWholesalers(), [])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<FacturaCategory>('')
  // Estado de expansión: solo guardamos las desviaciones del usuario respecto al
  // valor por defecto (primer grupo abierto, resto cerrados).
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const facturas = useMemo(() => data ?? [], [data])

  // Lista filtrada por año + búsqueda (sin categoría) → base para los contadores.
  const baseList = useMemo(
    () =>
      filterFacturas(
        facturas,
        { year: String(year), search, category: '', vencStatus: '' },
        wholesalers,
      ),
    [facturas, year, search, wholesalers],
  )

  const counts = useMemo(() => {
    const c = { all: baseList.length, Laboratorio: 0, Mayorista: 0, Otro: 0, Abono: 0 }
    for (const f of baseList) {
      if (f.tipo === 'Abono') c.Abono++
      else if (isWholesaler(f.tipo, wholesalers)) c.Mayorista++
      else if (f.tipo === 'Laboratorio') c.Laboratorio++
      else c.Otro++
    }
    return c
  }, [baseList, wholesalers])

  const visible = useMemo(
    () =>
      filterFacturas(
        facturas,
        { year: String(year), search, category, vencStatus: '' },
        wholesalers,
      ),
    [facturas, year, search, category, wholesalers],
  )

  const groups = useMemo(() => groupByMonth(visible), [visible])

  const isOpen = (key: string, idx: number) =>
    key in overrides ? overrides[key] : idx === 0

  function toggle(key: string, idx: number) {
    setOverrides((prev) => ({ ...prev, [key]: !isOpen(key, idx) }))
  }

  function onDelete(f: Factura) {
    if (!confirm(`¿Eliminar la factura de ${f.laboratorio}?`)) return
    deleteFactura.mutate(f.id)
  }

  const total = netTotal(visible)
  const nFacturas = visible.filter((f) => f.tipo !== 'Abono').length
  const nAbonos = visible.filter((f) => f.tipo === 'Abono').length

  const mayoristaLabel = wholesalers.length > 1 ? 'Mayoristas' : 'Mayorista'
  const categories: { value: FacturaCategory; label: string }[] = [
    { value: '', label: `Todos (${counts.all})` },
    { value: 'Laboratorio', label: `Laboratorios (${counts.Laboratorio})` },
    { value: 'Mayorista', label: `${mayoristaLabel} (${counts.Mayorista})` },
    { value: 'Otro', label: `Otros (${counts.Otro})` },
    { value: 'Abono', label: `Abonos (${counts.Abono})` },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">Facturas</h1>
      <p className="mt-1 text-sm text-slate-400">
        Gastos de proveedores y abonos de {year}.
      </p>

      {/* Filtros */}
      <div className="mt-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por laboratorio o nº de factura…"
            className="w-full rounded-xl border border-white/5 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.value || 'all'}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
                category === c.value
                  ? 'border-blue-400/20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                  : 'border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estados */}
      {isLoading && (
        <p className="py-12 text-center text-sm text-slate-400">Cargando facturas…</p>
      )}
      {isError && (
        <p className="py-12 text-center text-sm text-red-400">
          Error al cargar: {error instanceof Error ? error.message : 'desconocido'}
        </p>
      )}
      {!isLoading && !isError && !groups.length && (
        <p className="py-12 text-center text-sm text-slate-400">
          No hay facturas que coincidan con los filtros.
        </p>
      )}

      {/* Tabla agrupada por mes */}
      {!isLoading && !isError && groups.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
          <table className="w-full text-left">
            <tbody className="divide-y divide-white/5">
              {groups.map((g, idx) => (
                <FragmentGroup
                  key={g.key}
                  groupKey={g.key}
                  label={g.label}
                  count={g.items.length}
                  total={g.total}
                  open={isOpen(g.key, idx)}
                  onToggle={() => toggle(g.key, idx)}
                  items={g.items}
                  wholesalers={wholesalers}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total */}
      {!isLoading && !isError && groups.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-6 py-4">
          <span className="text-sm text-slate-400">
            {nFacturas} factura{nFacturas !== 1 ? 's' : ''}
            {nAbonos > 0 && ` · ${nAbonos} abono${nAbonos !== 1 ? 's' : ''}`}
          </span>
          <span className="text-lg font-black text-white">{formatMoney(total)}</span>
        </div>
      )}
    </div>
  )
}

function FragmentGroup({
  groupKey,
  label,
  count,
  total,
  open,
  onToggle,
  items,
  wholesalers,
  onDelete,
}: {
  groupKey: string
  label: string
  count: number
  total: number
  open: boolean
  onToggle: () => void
  items: Factura[]
  wholesalers: string[]
  onDelete: (f: Factura) => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer select-none bg-white/5 transition-colors hover:bg-white/10"
        onClick={onToggle}
      >
        <td colSpan={6} className="px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
              />
              <span className="text-sm font-bold capitalize text-slate-200">{label}</span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-xs font-bold text-slate-500">
                {count} registro{count !== 1 ? 's' : ''}
              </span>
            </div>
            <span
              className={`text-sm font-extrabold ${total < 0 ? 'text-emerald-400' : 'text-slate-100'}`}
            >
              {formatMoney(total)}
            </span>
          </div>
        </td>
      </tr>
      {open &&
        items.map((f) => {
          const isAbono = f.tipo === 'Abono'
          const vs = getEffectiveVencStatus(f)
          return (
            <tr
              key={`${groupKey}-${f.id}`}
              className={`transition-colors hover:bg-white/5 ${isAbono ? 'bg-emerald-500/5' : ''}`}
            >
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                {formatDate(f.fecha)}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-white">
                    {f.laboratorio || '—'}
                  </span>
                  {f.tipo && (
                    <span
                      className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold ${tipoBadgeClass(f.tipo, wholesalers)}`}
                    >
                      {f.tipo}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-sm text-slate-400">
                {isAbono ? '—' : (f.num_factura ?? '—')}
              </td>
              <td
                className={`px-6 py-4 text-right text-sm font-extrabold ${isAbono ? 'text-emerald-400' : 'text-white'}`}
              >
                {isAbono ? `+ ${formatMoney(f.importe)}` : formatMoney(f.importe)}
              </td>
              <td className="px-6 py-4">
                {isAbono ? (
                  <span className="text-xs text-slate-500">—</span>
                ) : vs === 'none' ? null : (
                  <StatusBadge
                    status={vs}
                    dateLabel={
                      f.fecha_vencimiento ? formatDate(f.fecha_vencimiento) : undefined
                    }
                  />
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(f)}
                  className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-red-400"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          )
        })}
    </>
  )
}
