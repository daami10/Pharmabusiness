import { useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { Download, Landmark, RefreshCw } from 'lucide-react'
import { palette } from '@/lib/chartSetup'
import { useFacturas } from '@/lib/queries/facturas'
import { useFiscalidad } from '@/lib/queries/fiscalidad'
import { useNominas, useSeguros } from '@/lib/queries/trabajadores'
import { useYearStore } from '@/stores/yearStore'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { useAuth } from '@/features/auth/AuthProvider'
import { DatePicker } from '@/components/ui/DatePicker'
import { formatMoney } from '@/lib/utils/money'
import { monthLabel, monthsAgoISO } from '@/lib/utils/dates'
import { isWholesaler } from '@/lib/config/wholesalers'
import { RankingModal } from './RankingModal'
import { ExportPdfModal } from './ExportPdfModal'
import { stackedByWholesaler } from './lib/analisis-view'
import { useTranslation, translateConcept } from '@/lib/i18n'

const eur = (v: string | number) => `${Number(v).toLocaleString('es-ES')} €`

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { ticks: { callback: eur } } },
}

const barOptionsStacked: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: { boxWidth: 12, font: { size: 10 } },
    },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true, ticks: { callback: eur } },
  },
}

const donutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  cutout: '65%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
  },
}

export type AnalisisCategory =
  | ''
  | 'Laboratorio'
  | 'Mayorista'
  | 'Otro'
  | 'Fiscalidad'
  | 'Trabajadores'

function formatMonthLabel(key: string, lang: string): string {
  if (!key || key === '0000-00') return lang === 'ca' ? 'Sense data' : 'Sin fecha'
  const [y, m] = key.split('-')
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
  const locale = lang === 'ca' ? 'ca-ES' : 'es-ES'
  return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
}

export function AnalisisPage() {
  const { t, language } = useTranslation()
  const year = useYearStore((s) => s.year)
  const yearStr = String(year)
  const facturas = useFacturas()
  const fiscal = useFiscalidad()
  const nominas = useNominas()
  const seguros = useSeguros()

  const wholesalers = useWholesalersStore((s) => s.wholesalers)
  // Un empleado solo ve las secciones para las que tiene permiso (fiscalidad/trabajadores);
  // así no se le muestran esos datos a 0 ni en el selector ni en el resumen consolidado.
  const { permissions, userRole } = useAuth()
  const can = (p: string) => userRole === 'titular' || permissions?.[p] === true
  const [category, setCategory] = useState<AnalisisCategory>('')
  // Por defecto, el rango arranca desde hace un mes.
  const [desde, setDesde] = useState(() => monthsAgoISO(1))
  const [hasta, setHasta] = useState('')
  const [rankingOpen, setRankingOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  const hasRange = !!(desde || hasta)

  const inRange = useCallback(
    (fecha: string | null | undefined) => {
      if (!fecha) return false
      const f = fecha.slice(0, 10)
      if (hasRange) {
        if (desde && f < desde) return false
        if (hasta && f > hasta) return false
        return true
      }
      return f.slice(0, 4) === yearStr
    },
    [desde, hasta, yearStr, hasRange],
  )

  const rangedFacturas = useMemo(() => {
    const all = facturas.data ?? []
    return all.filter((f) => inRange(f.fecha ?? f.fecha_vencimiento))
  }, [facturas.data, inRange])

  const facturasOnly = useMemo(() => {
    return rangedFacturas.filter((f) => f.tipo !== 'Abono')
  }, [rangedFacturas])

  const abonosOnly = useMemo(() => {
    return rangedFacturas.filter((f) => f.tipo === 'Abono')
  }, [rangedFacturas])

  // Middle breakdown cards stats
  const labStats = useMemo(() => {
    const items = facturasOnly.filter((f) => f.tipo === 'Laboratorio')
    return {
      total: items.reduce((sum, f) => sum + f.importe, 0),
      count: items.length,
    }
  }, [facturasOnly])

  const mayorStats = useMemo(() => {
    const items = facturasOnly.filter((f) => isWholesaler(f.tipo, wholesalers))
    return {
      total: items.reduce((sum, f) => sum + f.importe, 0),
      count: items.length,
    }
  }, [facturasOnly, wholesalers])

  const otroStats = useMemo(() => {
    const items = facturasOnly.filter(
      (f) => f.tipo !== 'Laboratorio' && !isWholesaler(f.tipo, wholesalers),
    )
    return {
      total: items.reduce((sum, f) => sum + f.importe, 0),
      count: items.length,
    }
  }, [facturasOnly, wholesalers])

  const fiscalStats = useMemo(() => {
    const items = (fiscal.data ?? []).filter((f) => inRange(f.fecha))
    return {
      total: items.reduce((sum, f) => sum + f.importe, 0),
      count: items.length,
      items,
    }
  }, [fiscal.data, inRange])

  const trabStats = useMemo(() => {
    const seg = (seguros.data ?? []).filter((s) => inRange(s.fecha))
    const nom = (nominas.data ?? []).filter((n) => inRange(n.fecha))
    return {
      total:
        seg.reduce((sum, s) => sum + s.importe, 0) +
        nom.reduce((sum, n) => sum + n.importe, 0),
      count: seg.length + nom.length,
      seg,
      nom,
    }
  }, [seguros.data, nominas.data, inRange])

  // Consolidated resumen calculations
  const totalFacturasCons = useMemo(() => {
    const factTotal = facturasOnly.reduce((sum, f) => sum + f.importe, 0)
    const abTotal = abonosOnly.reduce((sum, f) => sum + f.importe, 0)
    return factTotal - abTotal
  }, [facturasOnly, abonosOnly])

  const totalFiscalCons = fiscalStats.total
  const totalTrabajadoresCons = trabStats.total
  const totalGastosConsolidado =
    totalFacturasCons + totalFiscalCons + totalTrabajadoresCons

  // Top 4 KPIs (Total Invertido, Nº Facturas, Top Proveedor, Promedio / Factura)
  const topKpis = useMemo(() => {
    if (category === 'Fiscalidad') {
      const conceptTotals: Record<string, number> = {}
      for (const f of fiscalStats.items) {
        conceptTotals[f.concepto] = (conceptTotals[f.concepto] ?? 0) + f.importe
      }
      const topConcept =
        Object.entries(conceptTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
      const avg = fiscalStats.count ? fiscalStats.total / fiscalStats.count : 0
      return {
        total: fiscalStats.total,
        count: fiscalStats.count,
        top: topConcept === '—' ? '—' : translateConcept(topConcept, t),
        avg,
      }
    }

    if (category === 'Trabajadores') {
      const segTotal = trabStats.seg.reduce((sum, s) => sum + s.importe, 0)
      const nomTotal = trabStats.nom.reduce((sum, n) => sum + n.importe, 0)
      const top = segTotal >= nomTotal ? t('trabajadores.seguros_sociales', 'Seguros Sociales') : t('fiscalidad.concept.nominas', 'Nóminas')
      const avg = trabStats.count ? trabStats.total / trabStats.count : 0
      return {
        total: trabStats.total,
        count: trabStats.count,
        top,
        avg,
      }
    }

    // Normal category or total ('')
    const filteredInvoices = facturasOnly.filter((f) => {
      if (!category) return true
      if (category === 'Mayorista') return isWholesaler(f.tipo, wholesalers)
      return f.tipo === category
    })

    const invoicesTotal = filteredInvoices.reduce((sum, f) => sum + f.importe, 0)
    const count = filteredInvoices.length
    const avg = count ? invoicesTotal / count : 0

    const labMap = new Map<string, number>()
    for (const f of filteredInvoices) {
      const l = f.laboratorio || 'Sin nombre'
      labMap.set(l, (labMap.get(l) ?? 0) + f.importe)
    }
    const sortedLabs = [...labMap.entries()].sort((a, b) => b[1] - a[1])
    const top = sortedLabs[0]?.[0] ?? '—'

    // If category is total (''), the total investment is consolidated
    const total =
      category === ''
        ? invoicesTotal + fiscalStats.total + trabStats.total
        : invoicesTotal

    return {
      total,
      count: category === '' ? facturasOnly.length : count,
      top,
      avg:
        category === ''
          ? facturasOnly.length
            ? invoicesTotal / facturasOnly.length
            : 0
          : avg,
    }
  }, [category, facturasOnly, fiscalStats, trabStats, wholesalers, t])

  // Chart calculation data
  const chartsData = useMemo(() => {
    if (category === 'Fiscalidad') {
      const conceptMap = new Map<string, number>()
      for (const f of fiscalStats.items) {
        conceptMap.set(f.concepto, (conceptMap.get(f.concepto) ?? 0) + f.importe)
      }
      const bEntries = [...conceptMap.entries()]
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])

      const monthlyMap = new Map<string, number>()
      for (const f of fiscalStats.items) {
        if (!f.fecha) continue
        const k = f.fecha.slice(0, 7)
        monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + f.importe)
      }
      const mEntries = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

      const monthlyDatasets = [
        {
          label: '€',
          data: mEntries.map(([, v]) => v),
          backgroundColor: 'rgba(16,185,129,0.7)',
          borderRadius: 4,
        },
      ]

      return {
        labsLabels: bEntries.map(([l]) => translateConcept(l, t)),
        labsData: bEntries.map(([, v]) => v),
        labsColor: 'rgba(16,185,129,0.8)' as string | string[],
        donutColors: palette(bEntries.length),
        monthlyLabels: mEntries.map(([k]) => formatMonthLabel(k, language)),
        monthlyDatasets,
        byLab: bEntries.map(([lab, amount]) => ({ lab: translateConcept(lab, t), amount })),
      }
    }

    if (category === 'Trabajadores') {
      const breakdownMap = new Map<string, number>()
      breakdownMap.set(
        'Seg. Sociales',
        trabStats.seg.reduce((sum, s) => sum + s.importe, 0),
      )
      for (const n of trabStats.nom) {
        const name = n.trabajador_nombre || 'Sin nombre'
        breakdownMap.set(name, (breakdownMap.get(name) ?? 0) + n.importe)
      }
      const bEntries = [...breakdownMap.entries()]
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])

      const monthlyMap = new Map<string, number>()
      const allEntries = [
        ...trabStats.seg.map((s) => ({ fecha: s.fecha, importe: s.importe })),
        ...trabStats.nom.map((n) => ({ fecha: n.fecha, importe: n.importe })),
      ]
      for (const r of allEntries) {
        if (!r.fecha) continue
        const k = r.fecha.slice(0, 7)
        monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + r.importe)
      }
      const mEntries = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

      const monthlyDatasets = [
        {
          label: '€',
          data: mEntries.map(([, v]) => v),
          backgroundColor: 'rgba(249,115,22,0.7)',
          borderRadius: 4,
        },
      ]

      return {
        labsLabels: bEntries.map(([l]) => l === 'Seg. Sociales' ? t('trabajadores.seguros_sociales', 'Seguros Sociales') : l),
        labsData: bEntries.map(([, v]) => v),
        labsColor: 'rgba(249,115,22,0.8)' as string | string[],
        donutColors: palette(bEntries.length),
        monthlyLabels: mEntries.map(([k]) => formatMonthLabel(k, language)),
        monthlyDatasets,
        byLab: bEntries.map(([lab, amount]) => ({ lab: lab === 'Seg. Sociales' ? t('trabajadores.seguros_sociales', 'Seguros Sociales') : lab, amount })),
      }
    }

    if (category === 'Mayorista') {
      const filteredInvoices = facturasOnly.filter((f) =>
        isWholesaler(f.tipo, wholesalers),
      )

      const labMap = new Map<string, number>()
      for (const f of filteredInvoices) {
        const lab = f.laboratorio || 'Sin nombre'
        labMap.set(lab, (labMap.get(lab) ?? 0) + f.importe)
      }
      const bEntries = [...labMap.entries()].sort((a, b) => b[1] - a[1])

      const uniqueMonthsSet = new Set<string>()
      for (const f of filteredInvoices) {
        if (f.fecha) {
          uniqueMonthsSet.add(f.fecha.slice(0, 7))
        }
      }
      const sortedMonths = [...uniqueMonthsSet].sort((a, b) => a.localeCompare(b))

      const values: Record<string, Record<string, number>> = {}
      for (const m of sortedMonths) {
        values[m] = {}
        for (const w of wholesalers) {
          values[m][w] = 0
        }
      }

      for (const f of filteredInvoices) {
        if (f.fecha) {
          const k = f.fecha.slice(0, 7)
          const t = f.tipo || 'Otro'
          if (wholesalers.includes(t)) {
            values[k][t] = (values[k][t] ?? 0) + f.importe
          }
        }
      }

      const baseColors = [
        'rgba(37, 99, 235, 0.8)', // blue
        'rgba(5, 150, 105, 0.8)', // green/emerald
        'rgba(124, 58, 237, 0.8)', // purple
        'rgba(234, 88, 12, 0.8)', // orange
        'rgba(8, 145, 178, 0.8)', // cyan
      ]
      const donutBaseColors = ['#2563EB', '#059669', '#7C3AED', '#EA580C', '#0891B2']

      const labsColors = bEntries.slice(0, 15).map(([l]) => {
        const wIdx = wholesalers.indexOf(l)
        return wIdx !== -1
          ? baseColors[wIdx % baseColors.length]
          : 'rgba(124, 58, 237, 0.8)'
      })

      const donutColors = bEntries.slice(0, 10).map(([l]) => {
        const wIdx = wholesalers.indexOf(l)
        return wIdx !== -1 ? donutBaseColors[wIdx % donutBaseColors.length] : '#7C3AED'
      })

      const datasetsColors = [
        'rgba(37, 99, 235, 0.7)', // blue
        'rgba(5, 150, 105, 0.7)', // green/emerald
        'rgba(124, 58, 237, 0.7)', // purple
        'rgba(234, 88, 12, 0.7)', // orange
        'rgba(8, 145, 178, 0.7)', // cyan
      ]

      const monthlyDatasets = wholesalers.map((w, idx) => ({
        label: w,
        data: sortedMonths.map((m) => values[m][w] ?? 0),
        backgroundColor: datasetsColors[idx % datasetsColors.length],
        borderRadius: 4,
      }))

      return {
        labsLabels: bEntries.slice(0, 15).map(([l]) => l),
        labsData: bEntries.slice(0, 15).map(([, v]) => v),
        labsColor: labsColors,
        donutColors,
        monthlyLabels: sortedMonths.map((k) => formatMonthLabel(k, language)),
        monthlyDatasets,
        byLab: bEntries.map(([lab, amount]) => ({ lab, amount })),
      }
    }

    // Normal category or total ('')
    const filteredInvoices = facturasOnly.filter((f) => {
      if (!category) return true
      return f.tipo === category
    })

    const labMap = new Map<string, number>()
    for (const f of filteredInvoices) {
      const lab = f.laboratorio || 'Sin nombre'
      labMap.set(lab, (labMap.get(lab) ?? 0) + f.importe)
    }
    const bEntries = [...labMap.entries()].sort((a, b) => b[1] - a[1])

    const monthlyMap = new Map<string, number>()
    for (const f of filteredInvoices) {
      if (!f.fecha) continue
      const k = f.fecha.slice(0, 7)
      monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + f.importe)
    }
    const mEntries = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    const labsColor =
      category === 'Otro' ? 'rgba(107,114,128,0.8)' : 'rgba(37,99,235,0.8)'

    const monthlyDatasets = [
      {
        label: '€',
        data: mEntries.map(([, v]) => v),
        backgroundColor: category === '' ? 'rgba(37,99,235,0.7)' : labsColor,
        borderRadius: 4,
      },
    ]

    return {
      labsLabels: bEntries.slice(0, 15).map(([l]) => l),
      labsData: bEntries.slice(0, 15).map(([, v]) => v),
      labsColor,
      donutColors: palette(Math.min(bEntries.length, 10)),
      monthlyLabels: mEntries.map(([k]) => formatMonthLabel(k, language)),
      monthlyDatasets,
      byLab: bEntries.map(([lab, amount]) => ({ lab, amount })),
    }
  }, [category, facturasOnly, fiscalStats, trabStats, wholesalers, t, language])

  // Evolución mensual apilada por mayorista (solo categoría "Mayorista").
  const stackedData = useMemo(
    () =>
      category === 'Mayorista' ? stackedByWholesaler(facturasOnly, wholesalers) : null,
    [category, facturasOnly, wholesalers],
  )

  // Abonos calculations
  const totalAbonos = useMemo(() => {
    return abonosOnly.reduce((sum, a) => sum + a.importe, 0)
  }, [abonosOnly])

  const countAbonos = abonosOnly.length
  const balanceNeto = facturasOnly.reduce((sum, f) => sum + f.importe, 0) - totalAbonos

  const byLabAbono = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of abonosOnly) {
      const l = a.laboratorio || 'Sin nombre'
      map.set(l, (map.get(l) ?? 0) + a.importe)
    }
    return [...map.entries()]
      .map(([lab, amount]) => ({ lab, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [abonosOnly])

  const byMonthAbono = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of abonosOnly) {
      if (!a.fecha) continue
      const k = a.fecha.slice(0, 7)
      map.set(k, (map.get(k) ?? 0) + a.importe)
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, amount]) => ({ key, label: monthLabel(key), amount }))
  }, [abonosOnly])

  const balances = useMemo(() => {
    const labs = new Set<string>()
    const facturasMap = new Map<string, number>()
    const abonosMap = new Map<string, number>()

    const baseLabMap = new Map<string, number>()
    for (const f of facturasOnly) {
      const lab = f.laboratorio || 'Sin nombre'
      baseLabMap.set(lab, (baseLabMap.get(lab) ?? 0) + f.importe)
    }

    for (const [lab, amount] of baseLabMap.entries()) {
      labs.add(lab)
      facturasMap.set(lab, amount)
    }
    for (const item of byLabAbono) {
      labs.add(item.lab)
      abonosMap.set(item.lab, item.amount)
    }

    return [...labs]
      .map((l) => {
        const fact = facturasMap.get(l) ?? 0
        const ab = abonosMap.get(l) ?? 0
        return { lab: l, balance: fact - ab }
      })
      .sort((a, b) => b.balance - a.balance)
  }, [facturasOnly, byLabAbono])

  const balanceColors = useMemo(() => {
    return balances.map(({ balance }) =>
      balance >= 0 ? 'rgba(37,99,235,0.7)' : 'rgba(16,185,129,0.7)',
    )
  }, [balances])

  const showAbonos =
    abonosOnly.length > 0 && category !== 'Fiscalidad' && category !== 'Trabajadores'

  const categoriesList: { value: AnalisisCategory; label: string }[] = [
    { value: '', label: t('general.total', 'Total') },
    { value: 'Laboratorio', label: t('facturas.tab.laboratorios', 'Laboratorios') },
    { value: 'Mayorista', label: wholesalers.length > 1 ? t('settings.tab.wholesalers_plural', 'Mayoristas') : t('settings.tab.wholesalers_singular', 'Mayorista') },
    { value: 'Otro', label: t('general.otros', 'Otros') },
    ...(can('fiscalidad_read')
      ? [{ value: 'Fiscalidad' as const, label: t('nav.fiscalidad', 'Fiscalidad') }]
      : []),
    ...(can('trabajadores_read')
      ? [{ value: 'Trabajadores' as const, label: t('nav.trabajadores', 'Trabajadores') }]
      : []),
  ]

  const refetchAll = () => {
    facturas.refetch()
    fiscal.refetch()
    nominas.refetch()
    seguros.refetch()
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 fade-in">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {t('analisis.title', 'Análisis de Inversiones')}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {t('analisis.subtitle', 'Gasto acumulado por laboratorio y evolución temporal')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[#00f2fe]/30 px-4 py-2.5 text-sm font-bold text-slate-200 transition-all hover:bg-white/5 shadow-lg glow-blue glow-blue-hover"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] shadow-[0_0_8px_#00f2fe] shrink-0 animate-pulse"></span>
            <Download className="h-4 w-4 text-[#00f2fe]" />
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={refetchAll}
            className="flex items-center gap-2 rounded-xl border border-purple-500/30 px-4 py-2.5 text-sm font-bold text-slate-200 transition-all hover:bg-white/5 shadow-lg glow-purple glow-purple-hover"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] shrink-0 animate-pulse"></span>
            <RefreshCw className="h-4 w-4 text-purple-400" />
            {t('general.actualizar', 'Actualizar')}
          </button>
        </div>
      </div>

      {/* Filtro Rango de Fechas */}
      <div className="mt-6 flex flex-wrap items-center gap-3 bg-slate-900/30 border border-white/5 rounded-2xl px-5 py-4 shadow-2xl">
        <Landmark className="w-4 h-4 text-[#00f2fe] shrink-0" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {t('general.rango', 'Rango')}:
        </span>
        <DatePicker
          value={desde}
          onChange={setDesde}
          className="px-3 py-1.5 rounded-lg border border-white/5 text-xs bg-slate-950/40 text-slate-200 focus:border-[#00f2fe]/40 focus:outline-none transition-all"
        />
        <span className="text-slate-600 text-sm">—</span>
        <DatePicker
          value={hasta}
          onChange={setHasta}
          className="px-3 py-1.5 rounded-lg border border-white/5 text-xs bg-slate-950/40 text-slate-200 focus:border-[#00f2fe]/40 focus:outline-none transition-all"
        />
        {hasRange && (
          <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={() => {
                setDesde('')
                setHasta('')
              }}
              className="text-xs text-[#00f2fe] hover:text-[#00f2fe]/80 font-bold transition-colors"
            >
              Limpiar
            </button>
            <span
              id="analisis-filter-info"
              className="text-xs text-slate-500 font-semibold bg-white/5 px-2.5 py-1 rounded-lg"
            >
              {facturasOnly.length} factura{facturasOnly.length !== 1 ? 's' : ''} y{' '}
              {abonosOnly.length} abono{abonosOnly.length !== 1 ? 's' : ''} en el rango
            </span>
          </div>
        )}
      </div>

      {/* Los 4 KPI cards superiores */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 shadow-2xl border border-white/5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {t('analisis.kpi.total', 'Total Invertido')}
          </p>
          <p className="text-2xl font-black text-white leading-none">
            {formatMoney(topKpis.total)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5 shadow-2xl border border-white/5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {category === 'Fiscalidad'
              ? t('analisis.kpi.num_pagos', 'Nº Pagos')
              : category === 'Trabajadores'
                ? t('analisis.kpi.num_entradas', 'Nº Entradas')
                : t('analisis.kpi.num_facturas', 'Nº Facturas')}
          </p>
          <p className="text-2xl font-black text-white leading-none">{topKpis.count}</p>
        </div>
        <div
          onClick={() => {
            if (
              category !== 'Fiscalidad' &&
              category !== 'Trabajadores' &&
              chartsData.byLab.length
            ) {
              setRankingOpen(true)
            }
          }}
          className={`glass-card rounded-2xl p-5 shadow-2xl border border-white/5 transition-all select-none ${
            category !== 'Fiscalidad' &&
            category !== 'Trabajadores' &&
            chartsData.byLab.length
              ? 'cursor-pointer hover:scale-[1.02] glass-card-hover'
              : ''
          }`}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {category === 'Fiscalidad'
              ? t('analisis.kpi.max_impuesto', 'Mayor Impuesto')
              : category === 'Trabajadores'
                ? t('analisis.kpi.max_gasto', 'Mayor Gasto')
                : t('analisis.kpi.top_proveedor', 'Top Proveedor')}
          </p>
          <p className="text-2xl font-black text-white leading-none truncate">
            {topKpis.top}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5 shadow-2xl border border-white/5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {category === 'Fiscalidad'
              ? t('analisis.kpi.avg_pago', 'Promedio / Pago')
              : category === 'Trabajadores'
                ? t('analisis.kpi.avg_entrada', 'Promedio / Entrada')
                : t('analisis.kpi.promedio', 'Promedio / Factura')}
          </p>
          <p className="text-2xl font-black text-white leading-none">
            {formatMoney(topKpis.avg)}
          </p>
        </div>
      </div>

      {/* Selector Ver gráficas de: */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {t('analisis.show_charts_for', 'Ver gráficas de:')}
        </span>
        {categoriesList.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              category === c.value
                ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue shadow-[0_0_12px_rgba(0,242,254,0.25)]'
                : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Los 5 KPI cards centrales de desglose */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Laboratorios */}
        <div
          onClick={() => setCategory('Laboratorio')}
          className={`cursor-pointer transition-all select-none glass-card glow-blue glow-blue-hover rounded-2xl p-5 ${
            category === 'Laboratorio'
              ? 'ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
              : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]"></span>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              {t('facturas.tab.laboratorios', 'Laboratorios')}
            </p>
          </div>
          <p className="text-2xl font-black text-blue-400 leading-none">
            {formatMoney(labStats.total)}
          </p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">
            {labStats.count} {labStats.count !== 1 ? t('nav.facturas', 'facturas').toLowerCase() : t('inicio.factura_singular', 'factura')}
          </p>
        </div>

        {/* Mayoristas */}
        <div
          onClick={() => setCategory('Mayorista')}
          className={`cursor-pointer transition-all select-none glass-card glow-purple glow-purple-hover rounded-2xl p-5 ${
            category === 'Mayorista'
              ? 'ring-2 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
              : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]"></span>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              {wholesalers.length > 1 ? t('settings.tab.wholesalers_plural', 'Mayoristas') : t('settings.tab.wholesalers_singular', 'Mayorista')}
            </p>
          </div>
          <p className="text-2xl font-black text-purple-400 leading-none">
            {formatMoney(mayorStats.total)}
          </p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">
            {mayorStats.count} {mayorStats.count !== 1 ? t('nav.facturas', 'facturas').toLowerCase() : t('inicio.factura_singular', 'factura')}
          </p>
        </div>

        {/* Otros */}
        <div
          onClick={() => setCategory('Otro')}
          className={`cursor-pointer transition-all select-none glass-card glow-white glow-white-hover rounded-2xl p-5 ${
            category === 'Otro'
              ? 'ring-2 ring-slate-400 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
              : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_6px_rgba(156,163,175,0.5)]"></span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('general.otros', 'Otros')}
            </p>
          </div>
          <p className="text-2xl font-black text-slate-200 leading-none">
            {formatMoney(otroStats.total)}
          </p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">
            {otroStats.count} {otroStats.count !== 1 ? t('nav.facturas', 'facturas').toLowerCase() : t('inicio.factura_singular', 'factura')}
          </p>
        </div>

        {/* Fiscalidad */}
        <div
          onClick={() => setCategory('Fiscalidad')}
          className={`cursor-pointer transition-all select-none glass-card glow-emerald glow-emerald-hover rounded-2xl p-5 ${
            category === 'Fiscalidad'
              ? 'ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {t('nav.fiscalidad', 'Fiscalidad')}
            </p>
          </div>
          <p className="text-2xl font-black text-emerald-400 leading-none">
            {formatMoney(fiscalStats.total)}
          </p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">
            {fiscalStats.count} {fiscalStats.count !== 1 ? t('analisis.kpi.num_pagos', 'pagos').split(' ')[1].toLowerCase() : t('analisis.kpi.pago_singular', 'pago')}
          </p>
        </div>

        {/* Trabajadores */}
        <div
          onClick={() => setCategory('Trabajadores')}
          className={`cursor-pointer transition-all select-none glass-card glow-orange glow-orange-hover rounded-2xl p-5 ${
            category === 'Trabajadores'
              ? 'ring-2 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
              : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]"></span>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              {t('nav.trabajadores', 'Trabajadores')}
            </p>
          </div>
          <p className="text-2xl font-black text-orange-400 leading-none">
            {formatMoney(trabStats.total)}
          </p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">
            {trabStats.count} {trabStats.count !== 1 ? t('analisis.kpi.num_entradas', 'entradas').split(' ')[1].toLowerCase() : t('analisis.kpi.entrada_singular', 'entrada')}
          </p>
        </div>
      </div>

      {/* Gráficas y Resumen Consolidado */}
      {facturasOnly.length === 0 && fiscalStats.count === 0 && trabStats.count === 0 ? (
        <div className="mt-6 glass-card rounded-2xl border border-white/5 py-16 text-center text-slate-400 text-sm shadow-2xl">
          Agrega facturas, abonos, nóminas o pagos fiscales para ver el análisis.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Resumen consolidado */}
          <div className="glass-card rounded-2xl p-6 glow-blue">
            <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#00f2fe]" />
              {t('analisis.consolidated_summary', 'Resumen de Gastos Consolidado del Rango')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded-xl glow-white">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                  {t('analisis.facturas_proveedores', 'Facturas Proveedores')}
                </p>
                <p className="text-lg font-black text-white">
                  {formatMoney(totalFacturasCons)}
                </p>
              </div>
              {can('fiscalidad_read') && (
                <div className="glass-card p-4 rounded-xl glow-emerald">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                    {t('analisis.impuestos_tasas', 'Impuestos y Tasas')}
                  </p>
                  <p className="text-lg font-black text-emerald-400">
                    {formatMoney(totalFiscalCons)}
                  </p>
                </div>
              )}
              {can('trabajadores_read') && (
                <div className="glass-card p-4 rounded-xl glow-orange">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                    {t('analisis.trabajadores_nominas', 'Trabajadores y Nóminas')}
                  </p>
                  <p className="text-lg font-black text-orange-400">
                    {formatMoney(totalTrabajadoresCons)}
                  </p>
                </div>
              )}
              <div className="glass-card p-4 rounded-xl glow-blue">
                <p className="text-xs text-blue-300 font-bold uppercase tracking-wider mb-1">
                  {t('analisis.gastos_totales_rango', 'Gastos Totales Rango')}
                </p>
                <p className="text-lg font-black text-[#00f2fe]">
                  {formatMoney(totalGastosConsolidado)}
                </p>
              </div>
            </div>
          </div>

          {/* Gráficas Principales */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ChartCard
                title={
                  category === 'Fiscalidad'
                    ? t('analisis.gasto_concepto', 'Gasto por Concepto')
                    : category === 'Trabajadores'
                      ? t('analisis.desglose_personal', 'Desglose de Personal')
                      : t('analisis.gasto_laboratorio', 'Gasto por Laboratorio')
                }
              >
                <Bar
                  key={`labs-${category}`}
                  data={{
                    labels: chartsData.labsLabels,
                    datasets: [
                      {
                        label: '€',
                        data: chartsData.labsData,
                        backgroundColor: chartsData.labsColor,
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={barOptions}
                />
              </ChartCard>
            </div>
            <div className="lg:col-span-2">
              <ChartCard title={t('analisis.charts.distribucion', 'Distribución de Gasto')}>
                <Doughnut
                  key={`donut-${category}`}
                  data={{
                    labels: chartsData.labsLabels.slice(0, 10),
                    datasets: [
                      {
                        data: chartsData.labsData.slice(0, 10),
                        backgroundColor: chartsData.donutColors,
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        hoverOffset: 6,
                      },
                    ],
                  }}
                  options={{
                    ...donutOptions,
                    cutout: '65%',
                  }}
                />
              </ChartCard>
            </div>
          </div>

          {/* Evolución Mensual (apilada por mayorista en la categoría "Mayorista") */}
          <ChartCard
            title={stackedData ? 'Evolución Mensual por Mayorista' : 'Evolución Mensual'}
            wide
          >
            <div className="h-[240px]">
              <Bar
                key={`monthly-${category}-${stackedData}`}
                data={{
                  labels: chartsData.monthlyLabels,
                  datasets: chartsData.monthlyDatasets,
                }}
                options={{
                  ...(stackedData ? barOptionsStacked : barOptions),
                  maintainAspectRatio: false,
                  plugins: {
                    ...barOptions.plugins,
                    legend: {
                      display: category === 'Mayorista',
                      position: 'top',
                      labels: {
                        font: { size: 10 },
                        color: '#94a3b8',
                      },
                    },
                  },
                  scales: {
                    ...barOptions.scales,
                    y: {
                      ...barOptions.scales?.y,
                      stacked: category === 'Mayorista',
                      ticks: { callback: eur },
                    },
                    x: {
                      ...barOptions.scales?.x,
                      stacked: category === 'Mayorista',
                    },
                  },
                }}
              />
            </div>
          </ChartCard>

          {/* Sección de Abonos */}
          {showAbonos && (
            <div className="mt-10 space-y-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-6 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                  Análisis de Abonos
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-950/5 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl glass-card">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    TOTAL ABONADO
                  </p>
                  <p className="text-2xl font-black text-emerald-500 leading-none">
                    {formatMoney(totalAbonos)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-950/5 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl glass-card">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    Nº ABONOS
                  </p>
                  <p className="text-2xl font-black text-emerald-500 leading-none">
                    {countAbonos}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-950/5 border border-blue-500/20 rounded-2xl p-5 shadow-2xl glass-card">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                    BALANCE NETO
                  </p>
                  <p
                    className={`text-2xl font-black leading-none ${balanceNeto >= 0 ? 'text-white' : 'text-emerald-400'}`}
                  >
                    {formatMoney(balanceNeto)}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="Total Abonado por Laboratorio">
                  <Bar
                    key="abonos-labs"
                    data={{
                      labels: byLabAbono.map((l) => l.lab),
                      datasets: [
                        {
                          label: '€',
                          data: byLabAbono.map((l) => l.amount),
                          backgroundColor: 'rgba(16,185,129,0.75)',
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={barOptions}
                  />
                </ChartCard>

                <ChartCard title="Evolución Mensual de Abonos">
                  <Bar
                    key="abonos-monthly"
                    data={{
                      labels: byMonthAbono.map((m) => m.label),
                      datasets: [
                        {
                          label: '€',
                          data: byMonthAbono.map((m) => m.amount),
                          backgroundColor: 'rgba(16,185,129,0.75)',
                          borderRadius: 4,
                        },
                      ],
                    }}
                    options={barOptions}
                  />
                </ChartCard>
              </div>

              <ChartCard title="Balance Neto por Laboratorio (Facturas − Abonos)" wide>
                <div className="h-[240px]">
                  <Bar
                    key="balance-labs"
                    data={{
                      labels: balances.map((b) => b.lab),
                      datasets: [
                        {
                          label: '€',
                          data: balances.map((b) => b.balance),
                          backgroundColor: balanceColors,
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      ...barOptions,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </ChartCard>
            </div>
          )}
        </div>
      )}

      <RankingModal
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        items={chartsData.byLab}
      />

      {exportModalOpen && (
        <ExportPdfModal
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          defaultDesde={desde}
          defaultHasta={hasta}
        />
      )}
    </div>
  )
}

function ChartCard({
  title,
  wide,
  children,
}: {
  title: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`glass-card rounded-2xl border border-white/5 p-5 shadow-2xl ${wide ? 'lg:col-span-2' : ''}`}
    >
      <h3 className="mb-4 text-sm font-bold text-slate-200">{title}</h3>
      {children}
    </div>
  )
}
