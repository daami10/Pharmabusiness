import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useFiscalidad, useDeleteFiscal } from '@/lib/queries/fiscalidad'
import { useYearStore } from '@/stores/yearStore'
import { formatMoney } from '@/lib/utils/money'
import { MonthGroupAccordion } from '@/components/MonthGroupAccordion'
import type { Fiscal } from '@/types/domain'
import { fiscalKpis, groupFiscalByMonth } from './lib/fiscalidad-view'
import { FiscalModal } from './FiscalModal'

const KPI_COLORS = [
  'text-purple-400',
  'text-emerald-400',
  'text-sky-400',
  'text-orange-400',
  'text-rose-400',
  'text-amber-400',
  'text-teal-400',
]

export function FiscalidadPage() {
  const { data, isLoading, isError, error } = useFiscalidad()
  const deleteFiscal = useDeleteFiscal()
  const year = useYearStore((s) => s.year)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Fiscal | null>(null)

  const items = useMemo(
    () => (data ?? []).filter((f) => (f.fecha ?? '').slice(0, 4) === String(year)),
    [data, year],
  )
  const kpis = useMemo(() => fiscalKpis(items), [items])
  const groups = useMemo(() => groupFiscalByMonth(items), [items])

  function onDelete(f: Fiscal) {
    if (!confirm(`¿Eliminar "${f.concepto}"?`)) return
    deleteFiscal.mutate(f.id)
  }

  const renderRow = (f: Fiscal, isFuture: boolean) => (
    <tr key={f.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
      <td className="px-6 py-4 text-sm font-semibold text-slate-200">
        <span className="flex items-center gap-2">
          <span className="truncate">{f.concepto}</span>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
              isFuture
                ? 'bg-orange-500/10 text-orange-400'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {isFuture ? 'Previsto' : 'Pagado'}
          </span>
        </span>
      </td>
      <td className="px-6 py-4 text-right text-sm font-extrabold text-white">
        {formatMoney(f.importe)}
      </td>
      <td className="px-6 py-4 text-sm text-slate-400">{f.notas ?? ''}</td>
      <td className="px-6 py-4 text-right">
        <span className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditing(f)
              setModalOpen(true)
            }}
            className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(f)}
            className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-red-400"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </td>
    </tr>
  )

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Fiscalidad
          </h1>
          <p className="mt-1 text-sm text-slate-400">Impuestos y tasas de {year}.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-accent-blue px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition-all hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Añadir impuesto
        </button>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
          <p className="text-3xl font-black text-white">{formatMoney(kpis.total)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Total fiscal {year}</p>
        </div>
        {kpis.byConcept.map((item, idx) => {
          const colorClass = KPI_COLORS[idx % KPI_COLORS.length]
          return (
            <div
              key={item.concepto}
              className="rounded-2xl border border-white/5 bg-white/5 p-5"
            >
              <p className={`text-2xl font-bold ${colorClass}`}>
                {formatMoney(item.total)}
              </p>
              <p
                className="mt-1 text-xs font-semibold text-slate-400 truncate"
                title={item.concepto}
              >
                {item.concepto}
              </p>
            </div>
          )
        })}
      </div>

      {isLoading && (
        <p className="py-12 text-center text-sm text-slate-400">Cargando fiscalidad…</p>
      )}
      {isError && (
        <p className="py-12 text-center text-sm text-red-400">
          Error al cargar: {error instanceof Error ? error.message : 'desconocido'}
        </p>
      )}
      {!isLoading && !isError && !groups.length && (
        <p className="py-12 text-center text-sm text-slate-400">
          Sin impuestos registrados en {year}.
        </p>
      )}

      {!isLoading && !isError && groups.length > 0 && (
        <div className="mt-6">
          <MonthGroupAccordion groups={groups} colSpan={4} renderRow={renderRow} />
        </div>
      )}

      <FiscalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fiscal={editing}
      />
    </div>
  )
}
