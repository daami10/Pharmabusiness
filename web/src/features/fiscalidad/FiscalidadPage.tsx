import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useFiscalidad, useDeleteFiscal } from '@/lib/queries/fiscalidad'
import { useYearStore } from '@/stores/yearStore'
import { useLocation } from 'react-router-dom'
import { formatMoney } from '@/lib/utils/money'
import { formatDate } from '@/lib/utils/dates'
import { MonthGroupAccordion } from '@/components/MonthGroupAccordion'
import type { Fiscal } from '@/types/domain'
import { fiscalKpis, groupFiscalByMonth } from './lib/fiscalidad-view'
import { FiscalModal } from './FiscalModal'
import { useTranslation, translateConcept } from '@/lib/i18n'

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
  const { t } = useTranslation()
  const { data, isLoading, isError, error } = useFiscalidad()
  const deleteFiscal = useDeleteFiscal()
  const location = useLocation()
  const showCurrentMonth = location.state?.fromHome
  const year = useYearStore((s) => s.year)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Fiscal | null>(null)

  const items = useMemo(
    () => (data ?? []).filter((f) => (f.fecha ?? '').slice(0, 4) === String(year)),
    [data, year],
  )
  const kpis = useMemo(() => fiscalKpis(items), [items])
  const groups = useMemo(() => groupFiscalByMonth(items), [items])
  const currentMonthKey = useMemo(() => {
    const now = new Date()
    return `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [year])

  function onDelete(f: Fiscal) {
    if (!confirm(t('fiscalidad.confirm_delete', '¿Eliminar "{concept}"?').replace('{concept}', translateConcept(f.concepto, t)))) return
    deleteFiscal.mutate(f.id)
  }

  const renderRow = (f: Fiscal, isFuture: boolean) => (
    <tr key={f.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
      <td className="px-6 py-4 text-sm font-semibold text-slate-200">
        <span className="flex items-center gap-2">
          <span className="truncate">{translateConcept(f.concepto, t)}</span>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
              isFuture
                ? 'bg-orange-500/10 text-orange-400'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {isFuture ? t('fiscalidad.badge.future', 'Previsto') : t('fiscalidad.badge.paid', 'Pagado')}
          </span>
        </span>
        <span className="mt-0.5 block text-2xs text-slate-500">{formatDate(f.fecha)}</span>
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
            {t('fiscalidad.title', 'Estimación Fiscal')}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {t('fiscalidad.subtitle', 'Previsualización en tiempo real de impuestos y declaraciones trimestrales')}
          </p>
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
          {t('fiscalidad.button.nuevo', 'Nuevo impuesto')}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-5 glow-white">
          <p className="text-3xl font-black text-white">{formatMoney(kpis.total)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{t('fiscalidad.kpi.total', 'Total fiscal')} {year}</p>
        </div>
        {kpis.byConcept.map((item, idx) => {
          const colorClass = KPI_COLORS[idx % KPI_COLORS.length]
          const GLOW_CLASSES = [
            'glow-purple',
            'glow-emerald',
            'glow-blue',
            'glow-orange',
            'glow-red',
            'glow-orange',
            'glow-teal',
          ]
          const glowClass = GLOW_CLASSES[idx % GLOW_CLASSES.length]
          return (
            <div
              key={item.concepto}
              className={`glass-card rounded-2xl p-5 ${glowClass}`}
            >
              <p className={`text-2xl font-bold ${colorClass}`}>
                {formatMoney(item.total)}
              </p>
              <p
                className="mt-1 text-xs font-semibold text-slate-400 truncate"
                title={translateConcept(item.concepto, t)}
              >
                {translateConcept(item.concepto, t)}
              </p>
            </div>
          )
        })}
      </div>

      {isLoading && (
        <p className="py-12 text-center text-sm text-slate-400">{t('general.cargando', 'Cargando...')}</p>
      )}
      {isError && (
        <p className="py-12 text-center text-sm text-red-400">
          {t('general.load_error', 'Error al cargar')}: {error instanceof Error ? error.message : 'desconocido'}
        </p>
      )}
      {!isLoading && !isError && !groups.length && (
        <p className="py-12 text-center text-sm text-slate-400">
          {t('fiscalidad.no_records', 'No hay impuestos registrados en la organización.')}
        </p>
      )}

      {!isLoading && !isError && groups.length > 0 && (
        <div className="mt-6">
          <MonthGroupAccordion
            groups={groups}
            colSpan={4}
            renderRow={renderRow}
            defaultExpandedKey={showCurrentMonth ? currentMonthKey : undefined}
          />
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
