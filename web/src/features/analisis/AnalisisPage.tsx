import { useMemo, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { Download, Landmark, RefreshCw } from 'lucide-react'
import { palette } from '@/lib/chartSetup'
import { AnalisisReport } from './AnalisisReport'
import { useFacturas } from '@/lib/queries/facturas'
import { useFiscalidad } from '@/lib/queries/fiscalidad'
import { useNominas, useSeguros } from '@/lib/queries/trabajadores'
import { useYearStore } from '@/stores/yearStore'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { formatMoney } from '@/lib/utils/money'
import { monthLabel } from '@/lib/utils/dates'
import { isWholesaler } from '@/lib/config/wholesalers'
import { RankingModal } from './RankingModal'
import { stackedByWholesaler } from './lib/analisis-view'

const eur = (v: string | number) => `${Number(v).toLocaleString('es-ES')} €`

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { ticks: { callback: eur } } },
}

const barOptionsStacked: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true, ticks: { callback: eur } },
  },
}

const donutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  cutout: '62%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
  },
}

export type AnalisisCategory = '' | 'Laboratorio' | 'Mayorista' | 'Otro' | 'Fiscalidad' | 'Trabajadores'

function formatMonthLabel(key: string): string {
  if (!key || key === '0000-00') return 'Sin fecha'
  const [y, m] = key.split('-')
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
  return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
}

export function AnalisisPage() {
  const year = useYearStore((s) => s.year)
  const yearStr = String(year)
  const facturas = useFacturas()
  const fiscal = useFiscalidad()
  const nominas = useNominas()
  const seguros = useSeguros()

  const wholesalers = useWholesalersStore((s) => s.wholesalers)
  const [category, setCategory] = useState<AnalisisCategory>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [rankingOpen, setRankingOpen] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const hasRange = !!(desde || hasta)

  const inRange = useCallback((fecha: string | null | undefined) => {
    if (!fecha) return false
    const f = fecha.slice(0, 10)
    if (hasRange) {
      if (desde && f < desde) return false
      if (hasta && f > hasta) return false
      return true
    }
    return f.slice(0, 4) === yearStr
  }, [desde, hasta, yearStr, hasRange])

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
      count: items.length
    }
  }, [facturasOnly])

  const mayorStats = useMemo(() => {
    const items = facturasOnly.filter((f) => isWholesaler(f.tipo, wholesalers))
    return {
      total: items.reduce((sum, f) => sum + f.importe, 0),
      count: items.length
    }
  }, [facturasOnly, wholesalers])

  const otroStats = useMemo(() => {
    const items = facturasOnly.filter((f) => f.tipo !== 'Laboratorio' && !isWholesaler(f.tipo, wholesalers))
    return {
      total: items.reduce((sum, f) => sum + f.importe, 0),
      count: items.length
    }
  }, [facturasOnly, wholesalers])

  const fiscalStats = useMemo(() => {
    const items = (fiscal.data ?? []).filter((f) => inRange(f.fecha))
    return {
      total: items.reduce((sum, f) => sum + f.importe, 0),
      count: items.length,
      items
    }
  }, [fiscal.data, inRange])

  const trabStats = useMemo(() => {
    const seg = (seguros.data ?? []).filter((s) => inRange(s.fecha))
    const nom = (nominas.data ?? []).filter((n) => inRange(n.fecha))
    return {
      total: seg.reduce((sum, s) => sum + s.importe, 0) + nom.reduce((sum, n) => sum + n.importe, 0),
      count: seg.length + nom.length,
      seg,
      nom
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
  const totalGastosConsolidado = totalFacturasCons + totalFiscalCons + totalTrabajadoresCons

  // Top 4 KPIs (Total Invertido, Nº Facturas, Top Proveedor, Promedio / Factura)
  const topKpis = useMemo(() => {
    if (category === 'Fiscalidad') {
      const conceptTotals: Record<string, number> = {}
      for (const f of fiscalStats.items) {
        conceptTotals[f.concepto] = (conceptTotals[f.concepto] ?? 0) + f.importe
      }
      const topConcept = Object.entries(conceptTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
      const avg = fiscalStats.count ? fiscalStats.total / fiscalStats.count : 0
      return {
        total: fiscalStats.total,
        count: fiscalStats.count,
        top: topConcept,
        avg,
      }
    }

    if (category === 'Trabajadores') {
      const segTotal = trabStats.seg.reduce((sum, s) => sum + s.importe, 0)
      const nomTotal = trabStats.nom.reduce((sum, n) => sum + n.importe, 0)
      const top = segTotal >= nomTotal ? 'Seg. Sociales' : 'Nóminas'
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
    const total = category === '' ? (invoicesTotal + fiscalStats.total + trabStats.total) : invoicesTotal

    return {
      total,
      count: category === '' ? facturasOnly.length : count,
      top,
      avg: category === '' ? (facturasOnly.length ? invoicesTotal / facturasOnly.length : 0) : avg,
    }
  }, [category, facturasOnly, fiscalStats, trabStats, wholesalers])

  // Chart calculation data
  const chartsData = useMemo(() => {
    if (category === 'Fiscalidad') {
      const conceptMap = new Map<string, number>()
      for (const f of fiscalStats.items) {
        conceptMap.set(f.concepto, (conceptMap.get(f.concepto) ?? 0) + f.importe)
      }
      const bEntries = [...conceptMap.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

      const monthlyMap = new Map<string, number>()
      for (const f of fiscalStats.items) {
        if (!f.fecha) continue
        const k = f.fecha.slice(0, 7)
        monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + f.importe)
      }
      const mEntries = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

      return {
        labsLabels: bEntries.map(([l]) => l),
        labsData: bEntries.map(([, v]) => v),
        labsColor: 'rgba(16,185,129,0.8)',
        donutColors: palette(bEntries.length),
        monthlyLabels: mEntries.map(([k]) => formatMonthLabel(k)),
        monthlyData: mEntries.map(([, v]) => v),
        monthlyColor: 'rgba(16,185,129,0.7)',
        byLab: bEntries.map(([lab, amount]) => ({ lab, amount })),
      }
    }

    if (category === 'Trabajadores') {
      const breakdownMap = new Map<string, number>()
      breakdownMap.set('Seg. Sociales', trabStats.seg.reduce((sum, s) => sum + s.importe, 0))
      for (const n of trabStats.nom) {
        const name = n.trabajador_nombre || 'Sin nombre'
        breakdownMap.set(name, (breakdownMap.get(name) ?? 0) + n.importe)
      }
      const bEntries = [...breakdownMap.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

      const monthlyMap = new Map<string, number>()
      const allEntries = [
        ...trabStats.seg.map((s) => ({ fecha: s.fecha, importe: s.importe })),
        ...trabStats.nom.map((n) => ({ fecha: n.fecha, importe: n.importe }))
      ]
      for (const r of allEntries) {
        if (!r.fecha) continue
        const k = r.fecha.slice(0, 7)
        monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + r.importe)
      }
      const mEntries = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

      return {
        labsLabels: bEntries.map(([l]) => l),
        labsData: bEntries.map(([, v]) => v),
        labsColor: 'rgba(249,115,22,0.8)',
        donutColors: palette(bEntries.length),
        monthlyLabels: mEntries.map(([k]) => formatMonthLabel(k)),
        monthlyData: mEntries.map(([, v]) => v),
        monthlyColor: 'rgba(249,115,22,0.7)',
        byLab: bEntries.map(([lab, amount]) => ({ lab, amount })),
      }
    }

    // Normal category or total ('')
    const filteredInvoices = facturasOnly.filter((f) => {
      if (!category) return true
      if (category === 'Mayorista') return isWholesaler(f.tipo, wholesalers)
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

    let labsColor = 'rgba(37,99,235,0.8)'
    if (category === 'Mayorista') labsColor = 'rgba(124,58,237,0.8)'
    else if (category === 'Otro') labsColor = 'rgba(107,114,128,0.8)'

    return {
      labsLabels: bEntries.slice(0, 15).map(([l]) => l),
      labsData: bEntries.slice(0, 15).map(([, v]) => v),
      labsColor,
      donutColors: palette(Math.min(bEntries.length, 10)),
      monthlyLabels: mEntries.map(([k]) => formatMonthLabel(k)),
      monthlyData: mEntries.map(([, v]) => v),
      monthlyColor: 'rgba(37,99,235,0.7)',
      byLab: bEntries.map(([lab, amount]) => ({ lab, amount })),
    }
  }, [category, facturasOnly, fiscalStats, trabStats, wholesalers])

  // Evolución mensual apilada por mayorista (solo categoría "Mayorista").
  const stackedData = useMemo(
    () => (category === 'Mayorista' ? stackedByWholesaler(facturasOnly, wholesalers) : null),
    [category, facturasOnly, wholesalers],
  )

  // Abonos calculations
  const totalAbonos = useMemo(() => {
    return abonosOnly.reduce((sum, a) => sum + a.importe, 0)
  }, [abonosOnly])

  const countAbonos = abonosOnly.length
  const balanceNeto = (facturasOnly.reduce((sum, f) => sum + f.importe, 0)) - totalAbonos

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
    return balances.map(({ balance }) => (balance >= 0 ? 'rgba(37,99,235,0.7)' : 'rgba(16,185,129,0.7)'))
  }, [balances])

  const showAbonos = abonosOnly.length > 0 && category !== 'Fiscalidad' && category !== 'Trabajadores'

  const categoriesList: { value: AnalisisCategory; label: string }[] = [
    { value: '', label: 'Total' },
    { value: 'Laboratorio', label: 'Laboratorios' },
    { value: 'Mayorista', label: wholesalers.length > 1 ? 'Mayoristas' : 'Mayorista' },
    { value: 'Otro', label: 'Otros' },
    { value: 'Fiscalidad', label: 'Fiscalidad' },
    { value: 'Trabajadores', label: 'Trabajadores' },
  ]

  const period = hasRange ? `${desde || 'inicio'} – ${hasta || 'actual'}` : `Año ${year}`

  const refetchAll = () => {
    facturas.refetch()
    fiscal.refetch()
    nominas.refetch()
    seguros.refetch()
  }

  async function exportPDF() {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf()
        .set({
          margin: 10,
          filename: `analisis_gfarma_${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(reportRef.current)
        .save()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 fade-in">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Análisis de Inversiones</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gasto acumulado por laboratorio y evolución temporal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportPDF}
            disabled={exporting || !facturasOnly.length}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/5 disabled:opacity-50 shadow-lg"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Generando…' : 'Exportar PDF'}
          </button>
          <button
            type="button"
            onClick={refetchAll}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/5 shadow-lg"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtro Rango de Fechas */}
      <div className="mt-6 flex flex-wrap items-center gap-3 bg-slate-900/30 border border-white/5 rounded-2xl px-5 py-4 shadow-2xl">
        <Landmark className="w-4 h-4 text-[#00f2fe] shrink-0" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rango:</span>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-white/5 text-xs bg-slate-950/40 text-slate-200 focus:border-[#00f2fe]/40 focus:outline-none transition-all"
        />
        <span className="text-slate-600 text-sm">—</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-white/5 text-xs bg-slate-950/40 text-slate-200 focus:border-[#00f2fe]/40 focus:outline-none transition-all"
        />
        {hasRange && (
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
        )}
      </div>

      {/* Los 4 KPI cards superiores */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 shadow-2xl border border-white/5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Invertido</p>
          <p className="text-2xl font-black text-white leading-none">{formatMoney(topKpis.total)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 shadow-2xl border border-white/5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nº Facturas</p>
          <p className="text-2xl font-black text-white leading-none">{topKpis.count}</p>
        </div>
        <div
          onClick={() => {
            if (category !== 'Fiscalidad' && category !== 'Trabajadores' && chartsData.byLab.length) {
              setRankingOpen(true);
            }
          }}
          className={`glass-card rounded-2xl p-5 shadow-2xl border border-white/5 transition-all select-none ${
            category !== 'Fiscalidad' && category !== 'Trabajadores' && chartsData.byLab.length ? 'cursor-pointer hover:scale-[1.02] glass-card-hover' : ''
          }`}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Top Proveedor</p>
          <p className="text-2xl font-black text-white leading-none truncate">{topKpis.top}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 shadow-2xl border border-white/5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Promedio / Factura</p>
          <p className="text-2xl font-black text-white leading-none">{formatMoney(topKpis.avg)}</p>
        </div>
      </div>

      {/* Selector Ver gráficas de: */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ver gráficas de:</span>
        {categoriesList.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              category === c.value
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400/20 text-white shadow-lg'
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
          className={`bg-gradient-to-br from-blue-500/10 to-blue-950/5 border border-blue-500/20 rounded-2xl p-5 shadow-2xl cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/15 transition-all select-none glass-card ${
            category === 'Laboratorio' ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]"></span>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Laboratorios</p>
          </div>
          <p className="text-2xl font-black text-blue-400 leading-none">{formatMoney(labStats.total)}</p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">{labStats.count} factura{labStats.count !== 1 ? 's' : ''}</p>
        </div>

        {/* Mayoristas */}
        <div
          onClick={() => setCategory('Mayorista')}
          className={`bg-gradient-to-br from-purple-500/10 to-purple-950/5 border border-purple-500/20 rounded-2xl p-5 shadow-2xl cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/15 transition-all select-none glass-card ${
            category === 'Mayorista' ? 'ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]"></span>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">{wholesalers.length > 1 ? 'Mayoristas' : 'Mayorista'}</p>
          </div>
          <p className="text-2xl font-black text-purple-400 leading-none">{formatMoney(mayorStats.total)}</p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">{mayorStats.count} factura{mayorStats.count !== 1 ? 's' : ''}</p>
        </div>

        {/* Otros */}
        <div
          onClick={() => setCategory('Otro')}
          className={`bg-gradient-to-br from-slate-500/10 to-slate-950/5 border border-white/5 rounded-2xl p-5 shadow-2xl cursor-pointer hover:border-white/12 hover:bg-white/10 transition-all select-none glass-card ${
            category === 'Otro' ? 'ring-2 ring-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.2)]' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_6px_rgba(156,163,175,0.5)]"></span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Otros</p>
          </div>
          <p className="text-2xl font-black text-slate-200 leading-none">{formatMoney(otroStats.total)}</p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">{otroStats.count} factura{otroStats.count !== 1 ? 's' : ''}</p>
        </div>

        {/* Fiscalidad */}
        <div
          onClick={() => setCategory('Fiscalidad')}
          className={`bg-gradient-to-br from-emerald-500/10 to-emerald-950/5 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/15 transition-all select-none glass-card ${
            category === 'Fiscalidad' ? 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Fiscalidad</p>
          </div>
          <p className="text-2xl font-black text-emerald-400 leading-none">{formatMoney(fiscalStats.total)}</p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">{fiscalStats.count} pago{fiscalStats.count !== 1 ? 's' : ''}</p>
        </div>

        {/* Trabajadores */}
        <div
          onClick={() => setCategory('Trabajadores')}
          className={`bg-gradient-to-br from-orange-500/10 to-orange-950/5 border border-orange-500/20 rounded-2xl p-5 shadow-2xl cursor-pointer hover:border-orange-500/40 hover:bg-orange-500/15 transition-all select-none glass-card ${
            category === 'Trabajadores' ? 'ring-2 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]"></span>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Trabajadores</p>
          </div>
          <p className="text-2xl font-black text-orange-400 leading-none">{formatMoney(trabStats.total)}</p>
          <p className="text-2xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">{trabStats.count} entrada{trabStats.count !== 1 ? 's' : ''}</p>
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
          <div className="bg-gradient-to-br from-blue-500/10 to-[#00f2fe]/5 border border-blue-500/20 rounded-2xl p-6 shadow-2xl glass-card">
            <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#00f2fe]" />
              Resumen de Gastos Consolidado del Rango
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Facturas Proveedores</p>
                <p className="text-lg font-black text-white">{formatMoney(totalFacturasCons)}</p>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Impuestos y Tasas</p>
                <p className="text-lg font-black text-emerald-400">{formatMoney(totalFiscalCons)}</p>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Trabajadores y Nóminas</p>
                <p className="text-lg font-black text-orange-400">{formatMoney(totalTrabajadoresCons)}</p>
              </div>
              <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/40 p-4 rounded-xl">
                <p className="text-xs text-blue-300 font-bold uppercase tracking-wider mb-1">Gastos Totales Rango</p>
                <p className="text-lg font-black text-[#00f2fe]">{formatMoney(totalGastosConsolidado)}</p>
              </div>
            </div>
          </div>

          {/* Gráficas Principales */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ChartCard title={category === 'Fiscalidad' ? 'Gasto por Concepto' : category === 'Trabajadores' ? 'Desglose de Personal' : 'Gasto por Laboratorio'}>
                <Bar
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
              <ChartCard title="Distribución del Gasto">
                <Doughnut
                  data={{
                    labels: chartsData.labsLabels.slice(0, 10),
                    datasets: [
                      {
                        data: chartsData.labsData.slice(0, 10),
                        backgroundColor: chartsData.donutColors,
                        borderWidth: 2,
                        borderColor: '#0f172a',
                        hoverOffset: 6,
                      },
                    ],
                  }}
                  options={donutOptions}
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
                data={
                  stackedData
                    ? {
                        labels: stackedData.months.map((m) => m.label),
                        datasets: stackedData.series.map((s, idx) => ({
                          label: s.wholesaler,
                          data: s.data,
                          backgroundColor: palette(stackedData.series.length)[idx],
                          borderRadius: 4,
                        })),
                      }
                    : {
                        labels: chartsData.monthlyLabels,
                        datasets: [
                          {
                            label: '€',
                            data: chartsData.monthlyData,
                            backgroundColor: chartsData.monthlyColor,
                            borderRadius: 4,
                          },
                        ],
                      }
                }
                options={{
                  ...(stackedData ? barOptionsStacked : barOptions),
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </ChartCard>

          {/* Sección de Abonos */}
          {showAbonos && (
            <div className="mt-10 space-y-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-6 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">Análisis de Abonos</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-950/5 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl glass-card">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Total Abonado</p>
                  <p className="text-2xl font-black text-emerald-500 leading-none">{formatMoney(totalAbonos)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-950/5 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl glass-card">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Nº Abonos</p>
                  <p className="text-2xl font-black text-emerald-500 leading-none">{countAbonos}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-950/5 border border-blue-500/20 rounded-2xl p-5 shadow-2xl glass-card">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Balance Neto</p>
                  <p className="text-2xl font-black text-[#00f2fe] leading-none">{formatMoney(balanceNeto)}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="Total Abonado por Laboratorio">
                  <Bar
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

      {/* Informe imprimible (fuera de pantalla) para el export a PDF */}
      <div
        ref={reportRef}
        style={{ position: 'absolute', left: '-9999px', top: 0 }}
        aria-hidden
      >
        <AnalisisReport
          period={period}
          generatedAt={new Date().toLocaleString('es-ES')}
          analysis={{
            total: topKpis.total,
            count: topKpis.count,
            topLab: topKpis.top,
            avg: topKpis.avg,
            byLab: chartsData.byLab,
            byMonth: chartsData.monthlyLabels.map((l, i) => ({
              key: String(i),
              label: l,
              amount: chartsData.monthlyData[i],
            })),
          }}
          fiscalTotal={totalFiscalCons}
          trabTotal={totalTrabajadoresCons}
          granTotal={totalGastosConsolidado}
        />
      </div>
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
