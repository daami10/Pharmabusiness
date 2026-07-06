import { useState, useRef, useCallback } from 'react'
import { Download, Calendar, Info } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useTranslation } from '@/lib/i18n'
import { useFacturas } from '@/lib/queries/facturas'
import { useFiscalidad } from '@/lib/queries/fiscalidad'
import { useNominas, useSeguros } from '@/lib/queries/trabajadores'
import { AnalisisReport } from './AnalisisReport'

interface ExportPdfModalProps {
  open: boolean
  onClose: () => void
  defaultDesde: string
  defaultHasta: string
}

function formatFechaLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

export function ExportPdfModal({
  open,
  onClose,
  defaultDesde,
  defaultHasta,
}: ExportPdfModalProps) {
  const { t, language } = useTranslation()
  const [desde, setDesde] = useState(defaultDesde || '')
  const [hasta, setHasta] = useState(defaultHasta || '')

  const [includeFacturas, setIncludeFacturas] = useState(false)
  const [includeAbonos, setIncludeAbonos] = useState(false)
  const [includeFiscalidad, setIncludeFiscalidad] = useState(false)
  const [includeTrabajadores, setIncludeTrabajadores] = useState(false)
  const [exporting, setExporting] = useState(false)

  const reportRef = useRef<HTMLDivElement>(null)

  // Load cached React Query data
  const facturas = useFacturas()
  const fiscal = useFiscalidad()
  const nominas = useNominas()
  const seguros = useSeguros()

  // Filter logic based on the date range entered in the modal
  const inModalRange = useCallback(
    (fechaStr: string | null | undefined) => {
      if (!fechaStr) return false
      const f = fechaStr.slice(0, 10)
      if (desde && f < desde) return false
      if (hasta && f > hasta) return false
      return true
    },
    [desde, hasta],
  )

  // Computed data lists filtered by current dates in the modal
  const allFacturas = facturas.data ?? []
  const filteredFacturas = allFacturas.filter(
    (f) => inModalRange(f.fecha ?? f.fecha_vencimiento) && f.tipo !== 'Abono',
  )
  const filteredAbonos = allFacturas.filter(
    (f) => inModalRange(f.fecha ?? f.fecha_vencimiento) && f.tipo === 'Abono',
  )
  const filteredFiscal = (fiscal.data ?? []).filter((f) => inModalRange(f.fecha))
  const filteredNominas = (nominas.data ?? []).filter((n) => inModalRange(n.fecha))
  const filteredSeguros = (seguros.data ?? []).filter((s) => inModalRange(s.fecha))

  const noneSelected =
    !includeFacturas && !includeAbonos && !includeFiscalidad && !includeTrabajadores

  const handleExport = async () => {
    if (!reportRef.current || noneSelected) return
    setExporting(true)
    try {

      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf()
        .set({
          margin: 10,
          filename: `informe_gfarma_${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(reportRef.current)
        .save()

      onClose()
    } catch (err) {
      console.error('Error al exportar PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  const periodText =
    desde || hasta
      ? `${desde ? formatFechaLabel(desde) : t('general.inicio', 'inicio')} – ${hasta ? formatFechaLabel(hasta) : t('general.actual', 'actual')}`
      : t('pdf.historic_complete', 'Histórico Completo')

  return (
    <Dialog open={open} onClose={onClose} title={t('pdf.modal_title', 'Personalizar Exportación PDF')} size="lg">
      <div className="space-y-6">
        {/* Step 1: Date Range */}
        <div>
          <h3 className="mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#00f2fe]" />
            {t('pdf.step1', '1. Seleccionar rango de fechas')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('general.desde', 'Desde')}
              </label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950/40 text-sm text-slate-200 focus:border-[#00f2fe]/40 focus:outline-none transition-all cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('general.hasta', 'Hasta')}
              </label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950/40 text-sm text-slate-200 focus:border-[#00f2fe]/40 focus:outline-none transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Choose Sections */}
        <div>
          <h3 className="mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Info className="h-4 w-4 text-[#00f2fe]" />
            {t('pdf.step2', '2. Seleccionar secciones a incluir')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxOption
              label={t('analisis.facturas_proveedores', 'Facturas Proveedores')}
              description={t('pdf.facturas_desc', 'Incluye resumen e informe de laboratorios')}
              checked={includeFacturas}
              onChange={setIncludeFacturas}
              colorClass="bg-blue-600 border-blue-500 text-blue-400"
              activeBorderClass="border-blue-500/40"
              activeBgClass="bg-blue-500/5"
            />
            <CheckboxOption
              label={t('pdf.abonos_recibidos', 'Abonos Recibidos')}
              description={t('pdf.abonos_desc', 'Incluye devoluciones y balance neto')}
              checked={includeAbonos}
              onChange={setIncludeAbonos}
              colorClass="bg-emerald-600 border-emerald-500 text-emerald-400"
              activeBorderClass="border-emerald-500/40"
              activeBgClass="bg-emerald-500/5"
            />
            <CheckboxOption
              label={t('nav.fiscalidad', 'Impuestos y Fiscalidad')}
              description={t('pdf.fiscalidad_desc', 'Incluye desglose de tasas y liquidaciones')}
              checked={includeFiscalidad}
              onChange={setIncludeFiscalidad}
              colorClass="bg-teal-600 border-teal-500 text-teal-400"
              activeBorderClass="border-teal-500/40"
              activeBgClass="bg-teal-500/5"
            />
            <CheckboxOption
              label={t('pdf.trabajadores_personal', 'Trabajadores y Personal')}
              description={t('pdf.trabajadores_desc', 'Incluye nóminas y seguros sociales')}
              checked={includeTrabajadores}
              onChange={setIncludeTrabajadores}
              colorClass="bg-orange-600 border-orange-500 text-orange-400"
              activeBorderClass="border-orange-500/40"
              activeBgClass="bg-orange-500/5"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
          >
            {t('general.cancelar', 'Cancelar')}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || noneSelected}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:from-blue-400 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {exporting ? t('pdf.generando', 'Generando PDF...') : t('pdf.exportar', 'Exportar PDF')}
          </button>
        </div>
      </div>

      {/* Hidden print rendering frame */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          overflow: 'hidden',
          zIndex: -9999,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <div ref={reportRef}>
          <AnalisisReport
            period={periodText}
            generatedAt={new Date().toLocaleString(language === 'ca' ? 'ca-ES' : 'es-ES')}
            includeFacturas={includeFacturas}
            includeAbonos={includeAbonos}
            includeFiscalidad={includeFiscalidad}
            includeTrabajadores={includeTrabajadores}
            facturas={filteredFacturas}
            abonos={filteredAbonos}
            fiscal={filteredFiscal}
            nominas={filteredNominas}
            seguros={filteredSeguros}
          />
        </div>
      </div>
    </Dialog>
  )
}

interface CheckboxOptionProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  colorClass: string
  activeBorderClass: string
  activeBgClass: string
}

function CheckboxOption({
  label,
  description,
  checked,
  onChange,
  colorClass,
  activeBorderClass,
  activeBgClass,
}: CheckboxOptionProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`relative flex items-start gap-3 rounded-2xl border p-4 transition-all duration-300 select-none cursor-pointer ${
        checked
          ? `${activeBorderClass} ${activeBgClass} shadow-[0_0_15px_rgba(59,130,246,0.05)]`
          : 'border-white/5 bg-slate-950/20 hover:border-white/10 hover:bg-slate-950/40'
      }`}
    >
      <div className="flex h-5 items-center">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-all duration-300 ${
            checked ? `${colorClass} border-transparent` : 'border-white/25 bg-transparent'
          }`}
        >
          {checked && (
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={4}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex flex-col text-left">
        <span
          className={`text-sm font-bold transition-colors duration-300 ${
            checked ? 'text-white' : 'text-slate-300'
          }`}
        >
          {label}
        </span>
        <span className="mt-1 text-2xs text-slate-500 font-semibold leading-normal">
          {description}
        </span>
      </div>
    </div>
  )
}
