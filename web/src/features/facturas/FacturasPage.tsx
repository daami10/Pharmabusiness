import { useMemo, useState, useEffect } from 'react'
import { ChevronDown, Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { FacturaModal } from './FacturaModal'
import { AbonoModal } from '../abonos/AbonoModal'
import { Calendar } from './Calendar'
import { CsvExportModal } from './CsvExportModal'
import { DatePicker } from '@/components/ui/DatePicker'
import { downloadFacturasCSV } from './lib/csv'
import { downloadFacturasExcel } from './lib/excel'
import { useFacturas, useDeleteFactura } from '@/lib/queries/facturas'
import { useYearStore } from '@/stores/yearStore'
import { isWholesaler } from '@/lib/config/wholesalers'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { formatMoney } from '@/lib/utils/money'
import { formatDate } from '@/lib/utils/dates'
import type { VencStatus } from '@/lib/utils/dates'
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
  const { t } = useTranslation()
  const { activeOrgName } = useAuth()
  const translatedMeses = useMemo(() => [
    { value: '', label: t('facturas.filter.all_months', 'Todos los meses') },
    { value: '01', label: t('months.january', 'Enero') },
    { value: '02', label: t('months.february', 'Febrero') },
    { value: '03', label: t('months.march', 'Marzo') },
    { value: '04', label: t('months.april', 'Abril') },
    { value: '05', label: t('months.may', 'Mayo') },
    { value: '06', label: t('months.june', 'Junio') },
    { value: '07', label: t('months.july', 'Julio') },
    { value: '08', label: t('months.august', 'Agosto') },
    { value: '09', label: t('months.september', 'Septiembre') },
    { value: '10', label: t('months.october', 'Octubre') },
    { value: '11', label: t('months.november', 'Noviembre') },
    { value: '12', label: t('months.december', 'Diciembre') },
  ], [t])
  const { data, isLoading, isError, error, refetch } = useFacturas()
  const deleteFactura = useDeleteFactura()
  const year = useYearStore((s) => s.year)
  const location = useLocation()

  const wholesalers = useWholesalersStore((s) => s.wholesalers)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<FacturaCategory>('')
  const [month, setMonth] = useState('')
  const [minImporte, setMinImporte] = useState('')
  const [maxImporte, setMaxImporte] = useState('')
  const [vencStatus, setVencStatus] = useState<'' | VencStatus>('')
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [abonoModalOpen, setAbonoModalOpen] = useState(false)
  const [editing, setEditing] = useState<Factura | null>(null)
  const [initialFile, setInitialFile] = useState<File | null>(null)

  const currentMonthKey = useMemo(() => {
    const now = new Date()
    return `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [year])

  useEffect(() => {
    if (location.state?.openCreate) {
      setTimeout(() => {
        setEditing(null)
        setInitialFile(location.state.scanFile || null)
        setModalOpen(true)
      }, 0)
      // Limpiar el estado de navegación para evitar reapertura
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const facturas = useMemo(() => data ?? [], [data])

  // Lista filtrada por año + búsqueda (sin categoría) → base para los contadores.
  const baseList = useMemo(
    () =>
      filterFacturas(
        facturas,
        {
          year: String(year),
          search,
          category: '',
          vencStatus: '',
          month,
          minImporte,
          maxImporte,
          startDate,
          endDate,
        },
        wholesalers,
      ),
    [facturas, year, search, wholesalers, month, minImporte, maxImporte, startDate, endDate],
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
        {
          year: String(year),
          search,
          category,
          vencStatus,
          month,
          minImporte,
          maxImporte,
          startDate,
          endDate,
        },
        wholesalers,
      ),
    [
      facturas,
      year,
      search,
      category,
      vencStatus,
      wholesalers,
      month,
      minImporte,
      maxImporte,
      startDate,
      endDate,
    ],
  )

  const groups = useMemo(() => groupByMonth(visible), [visible])

  const showCurrentMonth = location.state?.fromHome

  const isOpen = (key: string) => {
    if (key in overrides) return overrides[key]
    if (showCurrentMonth) return key === currentMonthKey
    return false
  }

  function toggle(key: string) {
    setOverrides((prev) => ({ ...prev, [key]: !isOpen(key) }))
  }

  function onDelete(f: Factura) {
    if (!confirm(t('facturas.confirm_delete', '¿Eliminar la factura de {supplier}?').replace('{supplier}', f.laboratorio || '—'))) return
    deleteFactura.mutate(f.id)
  }

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(f: Factura) {
    setEditing(f)
    if (f.tipo === 'Abono') {
      setAbonoModalOpen(true)
    } else {
      setModalOpen(true)
    }
  }

  function handleExport(
    start: string,
    end: string,
    selectedCats: { labs: boolean; wholesalers: boolean; others: boolean; abonos: boolean },
    format: 'csv' | 'xlsx',
  ) {
    const baseExportList = filterFacturas(
      facturas,
      {
        year: String(year),
        search,
        category,
        vencStatus,
        month,
        minImporte,
        maxImporte,
        startDate: start,
        endDate: end,
      },
      wholesalers,
    )

    // Filtrar la lista final por las categorías seleccionadas en el modal
    const finalList = baseExportList.filter((f) => {
      if (selectedCats.labs && f.tipo === 'Laboratorio') return true
      if (selectedCats.wholesalers && isWholesaler(f.tipo, wholesalers)) return true
      if (selectedCats.abonos && f.tipo === 'Abono') return true
      if (
        selectedCats.others &&
        f.tipo !== 'Laboratorio' &&
        !isWholesaler(f.tipo, wholesalers) &&
        f.tipo !== 'Abono'
      )
        return true
      return false
    })

    if (format === 'xlsx') {
      downloadFacturasExcel(finalList, t, activeOrgName)
    } else {
      downloadFacturasCSV(finalList, t, activeOrgName)
    }
  }

  const total = netTotal(visible)
  const nFacturas = visible.filter((f) => f.tipo !== 'Abono').length
  const nAbonos = visible.filter((f) => f.tipo === 'Abono').length

  const mayoristaLabel = wholesalers.length > 1 ? t('settings.tab.wholesalers_plural', 'Mayoristas') : t('settings.tab.wholesalers_singular', 'Mayorista')
  const categories: { value: FacturaCategory; label: string }[] = [
    { value: '', label: `${t('facturas.tab.todas', 'Todos')} (${counts.all})` },
    { value: 'Laboratorio', label: `${t('facturas.tab.laboratorios', 'Laboratorios')} (${counts.Laboratorio})` },
    { value: 'Mayorista', label: `${mayoristaLabel} (${counts.Mayorista})` },
    { value: 'Otro', label: `${t('general.otros', 'Otros')} (${counts.Otro})` },
    { value: 'Abono', label: `${t('nav.abonos', 'Abonos')} (${counts.Abono})` },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {t('facturas.title', 'Facturas de Laboratorios')}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {t('facturas.subtitle', 'Registro centralizado por proveedor farmacéutico')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-accent-blue px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {t('facturas.button.nueva', 'Nueva factura')}
          </button>
        </div>
      </div>

      {/* Calendario (Posicionado ARRIBA de los filtros) */}
      <Calendar
        onEdit={openEdit}
        onDelete={onDelete}
        vencStatus={vencStatus}
        setVencStatus={setVencStatus}
      />

      {/* Barra de Filtro de Vencimiento Activo */}
      {vencStatus && (
        <div className="mt-6 flex items-center justify-between rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 text-sm">
          <span className="text-slate-300">
            Filtro activo de vencimiento:{' '}
            <strong className="text-white">
              {vencStatus === 'overdue'
                ? 'Vencidas'
                : vencStatus === 'neardue'
                  ? 'Próximas'
                  : vencStatus === 'pending'
                    ? 'Pendientes'
                    : 'Pagadas'}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setVencStatus('')}
            className="text-xs font-bold text-blue-400 hover:text-blue-300"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-900/40 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Buscar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('facturas.filter.placeholder', 'Buscar por laboratorio o nº de factura…')}
              className="w-full rounded-xl border border-white/5 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
          </div>

          {/* Mes */}
          <div className="relative min-w-[160px]">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/5 bg-slate-950/40 py-2.5 pl-4 pr-10 text-sm text-slate-200 focus:border-accent-blue/40 focus:outline-none"
            >
              {translatedMeses.map((m) => (
                <option
                  key={m.value}
                  value={m.value}
                  className="bg-slate-950 text-slate-200"
                >
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>

          {/* Exportar */}
          <button
            type="button"
            onClick={() => setCsvModalOpen(true)}
            disabled={!facturas.length}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/5 disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-400" />
            {t('facturas.button.export', 'Exportar')}
          </button>

          {/* Actualizar Manual */}
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/5"
          >
            {t('general.actualizar', 'Actualizar')}
          </button>
        </div>

        {/* Importe y Categoría */}
        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-white/5">
          {/* Rango de Importe */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('general.importe', 'Importe').toUpperCase()}:
            </span>
            <input
              type="text"
              value={minImporte}
              onChange={(e) => setMinImporte(e.target.value)}
              placeholder={t('facturas.filter.min_amount', 'Desde €')}
              className="w-24 rounded-xl border border-white/5 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
            <span className="text-slate-500">—</span>
            <input
              type="text"
              value={maxImporte}
              onChange={(e) => setMaxImporte(e.target.value)}
              placeholder={t('facturas.filter.max_amount', 'Hasta €')}
              className="w-24 rounded-xl border border-white/5 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
            {(minImporte || maxImporte) && (
              <button
                type="button"
                onClick={() => {
                  setMinImporte('')
                  setMaxImporte('')
                }}
                className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Rango de Fecha */}
          <div className="flex items-center gap-2 border-l border-white/5 pl-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('facturas.filter.issue_date', 'FECHA EMISIÓN')}:
            </span>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              className="rounded-xl border border-white/5 bg-slate-950/40 py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
            <span className="text-slate-500">—</span>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              className="rounded-xl border border-white/5 bg-slate-950/40 py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1"
                title={t('facturas.filter.clear_dates', 'Limpiar rango de fechas')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Categorías */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('facturas.filter.category', 'CATEGORÍA')}:
            </span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.value || 'all'}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
                    category === c.value
                      ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue shadow-[0_0_12px_rgba(0,242,254,0.25)]'
                      : 'border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Estados */}
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
          {t('facturas.filter.no_matches', 'No hay facturas que coincidan con los filtros.')}
        </p>
      )}

      {/* Tabla agrupada por mes */}
      {!isLoading && !isError && groups.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 glass-card">
          <table className="w-full text-left">
            <tbody className="divide-y divide-white/5">
              {groups.map((g) => (
                <FragmentGroup
                  key={g.key}
                  groupKey={g.key}
                  label={g.label}
                  count={g.items.length}
                  total={g.total}
                  open={isOpen(g.key)}
                  onToggle={() => toggle(g.key)}
                  items={g.items}
                  wholesalers={wholesalers}
                  onEdit={openEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total */}
      {!isLoading && !isError && groups.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/5 glass-card px-6 py-4">
          <span className="text-sm text-slate-400">
            {nFacturas} {nFacturas !== 1 ? t('nav.facturas', 'facturas').toLowerCase() : t('inicio.factura_singular', 'factura')}
            {nAbonos > 0 && ` · ${nAbonos} ${nAbonos !== 1 ? t('nav.abonos', 'abonos').toLowerCase() : t('inicio.abono_singular', 'abono')}`}
          </span>
          <span className="text-lg font-black text-white">{formatMoney(total)}</span>
        </div>
      )}

      <FacturaModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setInitialFile(null)
        }}
        factura={editing}
        initialFile={initialFile}
        activeYear={year}
      />

      {abonoModalOpen && (
        <AbonoModal
          open={abonoModalOpen}
          onClose={() => setAbonoModalOpen(false)}
          abono={editing}
          activeYear={year}
        />
      )}

      {csvModalOpen && (
        <CsvExportModal
          open={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          onExport={handleExport}
        />
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
  onEdit,
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
  onEdit: (f: Factura) => void
  onDelete: (f: Factura) => void
}) {
  const { t } = useTranslation()

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
                {count} {count !== 1 ? t('general.registros', 'registros') : t('general.registro', 'registro')}
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
                      {isWholesaler(f.tipo, wholesalers)
                        ? f.tipo
                        : f.tipo === 'Laboratorio'
                          ? t('general.laboratorio', 'Laboratorio')
                          : f.tipo === 'Abono'
                            ? t('general.abono_singular', 'Abono')
                            : f.tipo === 'Otro'
                              ? t('general.otro_singular', 'Otro')
                              : f.tipo}
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
                <span className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(f)}
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
        })}
    </>
  )
}

