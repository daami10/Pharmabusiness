import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { Download, Trophy } from 'lucide-react'
import { palette } from '@/lib/chartSetup'
import { AnalisisReport } from './AnalisisReport'
import { useFacturas } from '@/lib/queries/facturas'
import { useFiscalidad } from '@/lib/queries/fiscalidad'
import { useNominas, useSeguros } from '@/lib/queries/trabajadores'
import { useYearStore } from '@/stores/yearStore'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { formatMoney } from '@/lib/utils/money'
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

  const analysis = useMemo(
    () => analyzeFacturas(rangedFacturas, category, wholesalers),
    [rangedFacturas, category, wholesalers],
  )

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
  const facturasTotal = analysis.total
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
    <div className="mx-auto max-w-7xl px-6 py-8">
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
                  ? 'border-blue-400/20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
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
              className="ml-2 rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1 text-xs text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-400">
            Hasta
            <input
              type="month"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="ml-2 rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1 text-xs text-slate-100"
            />
          </label>
          {hasRange && (
            <button
              type="button"
              onClick={() => {
                setDesde('')
                setHasta('')
              }}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total facturas" value={formatMoney(analysis.total)} />
        <Kpi label="Nº facturas" value={String(analysis.count)} />
        <button
          type="button"
          onClick={() => analysis.byLab.length && setRankingOpen(true)}
          className="rounded-2xl border border-white/5 bg-white/5 p-5 text-left transition-all hover:bg-white/10"
        >
          <p className="flex items-center gap-1.5 truncate text-lg font-black text-white">
            <Trophy className="h-4 w-4 shrink-0 text-yellow-400" />
            <span className="truncate">{analysis.topLab}</span>
          </p>
          <p className="mt-2 text-xs text-slate-400">Top proveedor · ver ranking</p>
        </button>
        <Kpi label="Media por factura" value={formatMoney(analysis.avg)} />
      </div>

      {/* Resumen consolidado */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Facturas" value={formatMoney(facturasTotal)} small />
        <Kpi label="Fiscalidad" value={formatMoney(fiscalTotal)} small />
        <Kpi label="Trabajadores" value={formatMoney(trabTotal)} small />
        <Kpi label="Gasto total" value={formatMoney(granTotal)} small highlight />
      </div>

      {/* Gráficas */}
      {analysis.byLab.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          No hay facturas en este periodo.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
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
          <ChartCard title="Evolución mensual" wide>
            <Bar
              data={{
                labels: analysis.byMonth.map((m) => m.label),
                datasets: [
                  {
                    label: '€',
                    data: analysis.byMonth.map((m) => m.amount),
                    backgroundColor: 'rgba(0,242,254,0.6)',
                    borderRadius: 4,
                  },
                ],
              }}
              options={barOptions}
            />
          </ChartCard>
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
}: {
  label: string
  value: string
  small?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? 'border-accent-blue/30 bg-accent-blue/5' : 'border-white/5 bg-white/5'
      }`}
    >
      <p className={`font-black text-white ${small ? 'text-xl' : 'text-2xl'}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
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
      className={`rounded-2xl border border-white/5 bg-white/5 p-5 ${wide ? 'lg:col-span-2' : ''}`}
    >
      <h3 className="mb-4 text-sm font-bold text-slate-200">{title}</h3>
      {children}
    </div>
  )
}
