import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from 'lucide-react'
import { useFacturas, useSetPagada } from '@/lib/queries/facturas'
import { useYearStore } from '@/stores/yearStore'
import { formatMoney } from '@/lib/utils/money'
import { formatDate, monthLabel } from '@/lib/utils/dates'
import type { VencStatus } from '@/lib/utils/dates'
import { getEffectiveVencStatus } from './lib/facturas-view'
import { buildCalendarGrid, getMonthVencimientos, vencStats } from './lib/calendar'
import { VencListModal } from './VencListModal'
import type { Factura } from '@/types/domain'

const STATUS_ORDER: VencStatus[] = ['overdue', 'neardue', 'pending', 'paid']
const DOT: Record<VencStatus, string> = {
  overdue: 'bg-red-500',
  neardue: 'bg-orange-500',
  pending: 'bg-accent-blue',
  paid: 'bg-emerald-500',
}
const STAT_CARDS: { status: VencStatus; label: string; color: string }[] = [
  { status: 'overdue', label: 'Vencidas', color: 'text-red-500' },
  { status: 'neardue', label: 'Próximas', color: 'text-orange-500' },
  { status: 'pending', label: 'Pendientes', color: 'text-accent-blue' },
  { status: 'paid', label: 'Pagadas', color: 'text-emerald-500' },
]

const CARD_CLASSES: Record<VencStatus, string> = {
  overdue: 'bg-gradient-to-br from-red-500/15 via-red-500/5 to-transparent border-red-500/20 hover:border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.08)]',
  neardue: 'bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent border-orange-500/20 hover:border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.08)]',
  pending: 'bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent border-blue-500/20 hover:border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.08)]',
  paid: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.08)]',
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
type ListFilter = 'total' | 'pending' | 'overdue' | 'paid'

/** Estados de vencimiento presentes en un día, ordenados por severidad. */
function presentStatuses(facturas: Factura[]): VencStatus[] {
  const present = new Set(facturas.map((f) => getEffectiveVencStatus(f)))
  return STATUS_ORDER.filter((s) => present.has(s))
}

export function Calendar({
  onEdit,
  onDelete,
  setVencStatus,
}: {
  onEdit?: (f: Factura) => void
  onDelete?: (f: Factura) => void
  vencStatus?: string
  setVencStatus?: (s: '' | VencStatus) => void
}) {
  const now = new Date()
  const { data } = useFacturas()
  const setPagada = useSetPagada()
  const globalYear = useYearStore((s) => s.year)
  const [year, setYear] = useState(globalYear)
  const [month0, setMonth0] = useState(now.getMonth())
  const [modalStatus, setModalStatus] = useState<VencStatus | null>(null)
  const [listFilter, setListFilter] = useState<ListFilter>('pending')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // El calendario sigue al selector de año global (paridad con setYearFilter del
  // legacy): al cambiar el año arriba, salta a ese año en el mismo mes. Patrón de
  // ajuste de estado al cambiar una prop durante el render (sin efecto).
  const [prevGlobalYear, setPrevGlobalYear] = useState(globalYear)
  if (globalYear !== prevGlobalYear) {
    setPrevGlobalYear(globalYear)
    setYear(globalYear)
    setSelectedDay(null)
  }

  const facturas = useMemo(() => data ?? [], [data])
  const stats = useMemo(() => vencStats(facturas), [facturas])
  const grid = useMemo(() => buildCalendarGrid(year, month0), [year, month0])
  const monthVenc = useMemo(
    () => getMonthVencimientos(facturas, year, month0),
    [facturas, year, month0],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, Factura[]>()
    for (const f of monthVenc) {
      const d = f.fecha_vencimiento!
      const bucket = map.get(d)
      if (bucket) bucket.push(f)
      else map.set(d, [f])
    }
    return map
  }, [monthVenc])

  // Si hay un día seleccionado, la lista muestra solo los vencimientos de ese
  // día; si no, aplica el filtro de estado activo.
  const listItems = (
    selectedDay
      ? (byDay.get(selectedDay) ?? [])
      : monthVenc.filter((f) => {
          if (listFilter === 'total') return true
          const s = getEffectiveVencStatus(f)
          return listFilter === 'pending'
            ? s === 'pending' || s === 'neardue'
            : s === listFilter
        })
  )
    .slice()
    .sort((a, b) => (a.fecha_vencimiento ?? '').localeCompare(b.fecha_vencimiento ?? ''))

  const listTotal = listItems.reduce((sum, f) => sum + f.importe, 0)
  const todayStr = new Date().toISOString().slice(0, 10)

  function prevMonth() {
    setSelectedDay(null)
    if (month0 === 0) {
      setMonth0(11)
      setYear((y) => y - 1)
    } else {
      setMonth0((m) => m - 1)
    }
  }
  function nextMonth() {
    setSelectedDay(null)
    if (month0 === 11) {
      setMonth0(0)
      setYear((y) => y + 1)
    } else {
      setMonth0((m) => m + 1)
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold tracking-tight text-white">
        Calendario de Vencimientos
      </h2>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map((c) => (
          <button
            key={c.status}
            type="button"
            onClick={() => {
              setModalStatus(c.status)
              if (setVencStatus) setVencStatus(c.status)
            }}
            className={`rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 glass-card ${CARD_CLASSES[c.status]}`}
          >
            <p className={`text-3xl font-black leading-none ${c.color}`}>
              {stats[c.status]}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Rejilla */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 glass-card">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold capitalize text-slate-100">
              {monthLabel(`${year}-${String(month0 + 1).padStart(2, '0')}`)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-xs font-bold text-slate-500">
                {w}
              </div>
            ))}
            {grid.map((cell, i) => {
              if (cell.day === null) return <div key={`e${i}`} />
              const recs = byDay.get(cell.dateStr!) ?? []
              const isToday = cell.dateStr === todayStr
              const isSelected = cell.dateStr === selectedDay
              const clickable = recs.length > 0
              return (
                <div
                  key={cell.dateStr}
                  onClick={
                    clickable
                      ? () =>
                          setSelectedDay((cur) =>
                            cur === cell.dateStr ? null : cell.dateStr!,
                          )
                      : undefined
                  }
                  className={`flex aspect-square select-none flex-col items-center justify-start rounded-lg pt-1 transition-colors ${
                    clickable ? 'cursor-pointer hover:bg-white/10' : ''
                  } ${
                    isSelected
                      ? 'ring-2 ring-accent-blue bg-accent-blue/10'
                      : isToday
                        ? 'ring-2 ring-accent-blue'
                        : ''
                  }`}
                >
                  <span
                    className={`text-xs ${isToday ? 'font-black text-accent-blue' : 'text-slate-300'}`}
                  >
                    {cell.day}
                  </span>
                  {recs.length > 0 && (
                    <>
                      <div className="mt-0.5 flex justify-center gap-0.5">
                        {presentStatuses(recs)
                          .slice(0, 3)
                          .map((s) => (
                            <span key={s} className={`h-1.5 w-1.5 rounded-full ${DOT[s]}`} />
                          ))}
                      </div>
                      {recs.length > 1 && (
                        <span className="text-[9px] leading-none text-slate-500">
                          {recs.length}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Lista lateral */}
        <div className="flex flex-col rounded-2xl border border-white/5 bg-slate-900/40 p-4 glass-card">
          {selectedDay ? (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-accent-blue/30 bg-accent-blue/10 px-3 py-1.5">
              <span className="text-xs font-bold text-accent-blue">
                Vencimientos del {formatDate(selectedDay)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-md p-0.5 text-accent-blue hover:bg-white/10"
                aria-label="Quitar filtro de día"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(['total', 'pending', 'overdue', 'paid'] as ListFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setListFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    listFilter === f
                      ? 'bg-slate-200 text-slate-900 shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'total'
                    ? 'Todas'
                    : f === 'pending'
                      ? 'Pendientes'
                      : f === 'overdue'
                        ? 'Vencidas'
                        : 'Pagadas'}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-[360px] flex-1 space-y-2 overflow-y-auto pr-1">
            {!listItems.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                {selectedDay ? 'Sin vencimientos ese día.' : 'Sin vencimientos este mes.'}
              </p>
            )}
            {listItems.map((f) => {
              const isPaid = getEffectiveVencStatus(f) === 'paid'
              const vs = getEffectiveVencStatus(f) as VencStatus
              return (
                <div
                  key={f.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950/30 p-3 border-l-4 ${
                    vs === 'overdue'
                      ? 'border-l-red-500'
                      : vs === 'neardue'
                        ? 'border-l-orange-500'
                        : vs === 'pending'
                          ? 'border-l-accent-blue'
                          : 'border-l-emerald-500'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${DOT[vs]} mr-1.5`} />
                      <p className="truncate text-sm font-bold text-white">
                        {f.laboratorio || '—'}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Venc: {formatDate(f.fecha_vencimiento)}
                    </p>
                    <p className="text-sm font-black text-white mt-0.5">
                      {formatMoney(f.importe)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit?.(f)}
                      className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(f)}
                      className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-red-400"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPagada.mutate({ id: f.id, pagada: !isPaid })}
                      className={`whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-bold transition-all ${
                        isPaid
                          ? 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {isPaid ? '↺' : '✓'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {listItems.length > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total
              </span>
              <span className="text-base font-black text-accent-blue">
                {formatMoney(listTotal)}
              </span>
            </div>
          )}
        </div>
      </div>

      <VencListModal
        status={modalStatus}
        onClose={() => setModalStatus(null)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </section>
  )
}
