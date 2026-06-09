import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { Download, Trophy, FileText, Landmark, Users, TrendingDown, ArrowUpDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { palette } from '@/lib/chartSetup'
import { AnalisisReport } from './AnalisisReport'
import { useFacturas } from '@/lib/queries/facturas'
import { useFiscalidad } from '@/lib/queries/fiscalidad'
import { useNominas, useSeguros } from '@/lib/queries/trabajadores'
import { useYearStore } from '@/stores/yearStore'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { formatMoney } from '@/lib/utils/money'
import { monthLabel } from '@/lib/utils/dates'
import { analyzeFacturas, filterByDateRange } from './lib/analisis-view'
import type { AnalisisCategory } from './lib/analisis-view'
import { RankingModal } from './RankingModal'

const eur = (v: string | number) => `${Number(v).toLocaleString('es-ES')} €`

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { ticks: { callback: eur } } },
}

const donutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  cutout: '62%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
  },
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
  const inRange = (fecha: string | null) => {
    if (!fecha) return false
    if (hasRange) {
      if (desde && fecha < `${desde}-01`) return false
      if (hasta && fecha > `${hasta}-31`) return false
      return true
    }
    return fecha.slice(0, 4) === yearStr
  }

  const rangedFacturas = useMemo(() => {
    const all = facturas.data ?? []
    return hasRange
      ? filterByDateRange(all, desde, hasta)
      : all.filter((f) => (f.fecha_vencimiento ?? f.fecha ?? '').slice(0, 4) === yearStr)
  }, [facturas.data, hasRange, desde, hasta, yearStr])

  // Invoices (excluye abonos)
  const analysis = useMemo(
    () => analyzeFacturas(rangedFacturas, category, wholesalers),
    [rangedFacturas, category, wholesalers],
  )

  // Abonos
  const abonos = useMemo(() => {
    return rangedFacturas.filter((f) => f.tipo === 'Abono')
  }, [rangedFacturas])

  const totalAbonos = useMemo(() => {
    return abonos.reduce((sum, a) => sum + a.importe, 0)
  }, [abonos])

  const countAbonos = abonos.length
  const balanceNeto = analysis.total - totalAbonos

  const byLabAbono = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of abonos) {
      const l = a.laboratorio || 'Sin nombre'
      map.set(l, (map.get(l) ?? 0) + a.importe)
    }
    return [...map.entries()]
      .map(([lab, amount]) => ({ lab, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [abonos])

  const byMonthAbono = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of abonos) {
      if (!a.fecha) continue
      const k = a.fecha.slice(0, 7)
      map.set(k, (map.get(k) ?? 0) + a.importe)
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, amount]) => ({ key, label: monthLabel(key), amount }))
  }, [abonos])

  const balances = useMemo(() => {
    const labs = new Set<string>()
    const facturasMap = new Map<string, number>()
    const abonosMap = new Map<string, number>()

    for (const item of analysis.byLab) {
      labs.add(item.lab)
      facturasMap.set(item.lab, item.amount)
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
  }, [analysis.byLab, byLabAbono])

  const balanceColors = useMemo(() => {
    return balances.map(({ balance }) => (balance >= 0 ? 'rgba(37,99,235,0.7)' : 'rgba(16,185,129,0.7)'))
  }, [balances])

  const fiscalTotal = (fiscal.data ?? [])
    .filter((f) => inRange(f.fecha))
    .reduce((s, f) => s + f.importe, 0)

  const trabTotal =
    (nominas.data ?? [])
      .filter((n) => inRange(n.fecha))
      .reduce((s, n) => s + n.importe, 0) +
    (seguros.data ?? [])
      .filter((s) => inRange(s.fecha))
      .reduce((acc, s) => acc + s.importe, 0)

  const facturasTotal = analysis.total - totalAbonos
  const granTotal = facturasTotal + fiscalTotal + trabTotal

  const topLabs = analysis.byLab.slice(0, 15)
  const donutLabs = analysis.byLab.slice(0, 10)
  const mayoristaLabel = wholesalers.length > 1 ? 'Mayoristas' : 'Mayorista'

  const categories: { value: AnalisisCategory; label: string }[] = [
    { value: '', label: 'Total' },
    { value: 'Laboratorio', label: 'Laboratorios' },
    { value: 'Mayorista', label: mayoristaLabel },
    { value: 'Otro', label: 'Otros' },
  ]

  const period = hasRange ? `${desde || 'inicio'} – ${hasta || 'actual'}` : `Año ${year}`

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Análisis</h1>
          <p className="mt-1 text-sm text-slate-400">
            {hasRange ? 'Periodo seleccionado' : `Año ${year}`}.
          </p>
        </div>
        <button
          type="button"
          onClick={exportPDF}
          disabled={exporting || !analysis.byLab.length}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/5 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Generando…' : 'Exportar PDF'}
        </button>
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.value || 'all'}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
                category === c.value
                  ? 'border-blue-400/20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/10'
                  : 'border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs text-slate-400">
            Desde
            <input
              type="month"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="ml-2 rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-400">
            Hasta
            <input
              type="month"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="ml-2 rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
            />
          </label>
          {hasRange && (
            <button
              type="button"
              onClick={() => {
                setDesde('')
                setHasta('')
              }}
              className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* KPIs Facturas */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total facturas" value={formatMoney(analysis.total)} icon={FileText} color="text-blue-400" />
        <Kpi label="Nº facturas" value={String(analysis.count)} icon={FileText} color="text-blue-500" />
        <button
          type="button"
          onClick={() => analysis.byLab.length && setRankingOpen(true)}
          className="glass-card rounded-2xl p-5 text-left transition-all hover:bg-white/10 border border-white/5 shadow-xl glass-card-hover group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-400 group-hover:bg-yellow-500/20 transition-all">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="text-2xs font-bold text-slate-500 group-hover:text-yellow-400 transition-colors uppercase tracking-wider">Top Proveedor</span>
          </div>
          <p className="text-2xl font-black leading-none text-white truncate mb-1">
            {analysis.topLab}
          </p>
          <p className="text-xs text-slate-400">Ver ranking completo</p>
        </button>
        <Kpi label="Media por factura" value={formatMoney(analysis.avg)} icon={ArrowUpDown} color="text-cyan-400" />
      </div>

      {/* KPIs Abonos (Solo si hay abonos registrados) */}
      {abonos.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label="Total Abonado" value={formatMoney(totalAbonos)} icon={TrendingDown} color="text-emerald-400" />
          <Kpi label="Nº Abonos" value={String(countAbonos)} icon={TrendingDown} color="text-emerald-500" />
          <Kpi
            label="Balance Neto"
            value={formatMoney(balanceNeto)}
            icon={ArrowUpDown}
            color={balanceNeto >= 0 ? 'text-white' : 'text-emerald-400'}
            highlight
          />
        </div>
      )}

      {/* Resumen consolidado */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Facturas (Neto)" value={formatMoney(facturasTotal)} small icon={FileText} color="text-blue-400" />
        <Kpi label="Fiscalidad" value={formatMoney(fiscalTotal)} small icon={Landmark} color="text-purple-400" />
        <Kpi label="Trabajadores" value={formatMoney(trabTotal)} small icon={Users} color="text-teal-400" />
        <Kpi label="Gasto consolidado" value={formatMoney(granTotal)} small highlight icon={ArrowUpDown} color="text-cyan-400" />
      </div>

      {/* Gráficas */}
      {analysis.byLab.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          No hay facturas en este periodo.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Gasto por proveedor">
              <Bar
                data={{
                  labels: topLabs.map((l) => l.lab),
                  datasets: [
                    {
                      label: '€',
                      data: topLabs.map((l) => l.amount),
                      backgroundColor: 'rgba(37,99,235,0.8)',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={barOptions}
              />
            </ChartCard>
            <ChartCard title="Distribución">
              <Doughnut
                data={{
                  labels: donutLabs.map((l) => l.lab),
                  datasets: [
                    {
                      data: donutLabs.map((l) => l.amount),
                      backgroundColor: palette(donutLabs.length),
                      borderWidth: 0,
                    },
                  ],
                }}
                options={donutOptions}
              />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfica de evolución mensual de facturas */}
            <ChartCard title="Evolución mensual de facturas">
              <Bar
                data={{
                  labels: analysis.byMonth.map((m) => m.label),
                  datasets: [
                    {
                      label: '€',
                      data: analysis.byMonth.map((m) => m.amount),
                      backgroundColor: 'rgba(37,99,235,0.7)',
                      borderRadius: 4,
                    },
                  ],
                }}
                options={barOptions}
              />
            </ChartCard>

            {/* Evolución mensual de abonos (Solo si hay abonos) */}
            {abonos.length > 0 && (
              <ChartCard title="Evolución mensual de abonos">
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
            )}
          </div>

          {/* Gráficas adicionales de abonos */}
          {abonos.length > 0 && (
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

              <ChartCard title="Balance Neto por Laboratorio (Facturas − Abonos)">
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
                  options={barOptions}
                />
              </ChartCard>
            </div>
          )}
        </div>
      )}

      <RankingModal
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        items={analysis.byLab}
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
          analysis={analysis}
          fiscalTotal={fiscalTotal}
          trabTotal={trabTotal}
          granTotal={granTotal}
        />
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  small,
  highlight,
  icon: Icon,
  color = 'text-[#00f2fe]',
}: {
  label: string
  value: string
  small?: boolean
  highlight?: boolean
  icon: LucideIcon
  color?: string
}) {
  return (
    <div
      className={`glass-card rounded-2xl p-5 border transition-all duration-300 shadow-xl ${
        highlight ? 'border-accent-blue/30 bg-accent-blue/5' : 'border-white/5'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`p-2.5 rounded-xl bg-white/5 ${color} transition-all`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-2xs font-bold text-slate-500 transition-colors uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-black text-white ${small ? 'text-xl' : 'text-2xl'} leading-none mb-1`}>{value}</p>
      <p className="text-3xs text-slate-500 uppercase tracking-widest">Acumulado</p>
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
