import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { DatePicker } from '@/components/ui/DatePicker'

interface CsvExportModalProps {
  open: boolean
  onClose: () => void
  onExport: (
    startDate: string,
    endDate: string,
    categories: { labs: boolean; wholesalers: boolean; others: boolean; abonos: boolean },
    format: 'csv' | 'xlsx',
  ) => void
}

export function CsvExportModal({ open, onClose, onExport }: CsvExportModalProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [labs, setLabs] = useState(false)
  const [wholesalers, setWholesalers] = useState(false)
  const [others, setOthers] = useState(false)
  const [abonos, setAbonos] = useState(false)
  const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx')
  const [errorMsg, setErrorMsg] = useState('')



  const handleExport = () => {
    if (!labs && !wholesalers && !others && !abonos) {
      setErrorMsg('Selecciona al menos una categoría para exportar')
      return
    }
    setErrorMsg('')
    onExport(startDate, endDate, { labs, wholesalers, others, abonos }, format)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Exportar Facturas" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Selecciona el rango de fechas de emisión y las categorías para la exportación de facturas.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Fecha Desde (Emisión):
            </label>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Fecha Hasta (Emisión):
            </label>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
          </div>
        </div>

        {/* Checkboxes de categorías */}
        <div className="border-t border-white/5 pt-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Categorías a Exportar:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={labs}
                onChange={(e) => {
                  setLabs(e.target.checked)
                  setErrorMsg('')
                }}
                className="h-4 w-4 rounded border-white/10 bg-slate-950/40 text-accent-blue focus:ring-0 focus:outline-none cursor-pointer"
              />
              Laboratorios
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={wholesalers}
                onChange={(e) => {
                  setWholesalers(e.target.checked)
                  setErrorMsg('')
                }}
                className="h-4 w-4 rounded border-white/10 bg-slate-950/40 text-accent-blue focus:ring-0 focus:outline-none cursor-pointer"
              />
              Mayoristas
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={others}
                onChange={(e) => {
                  setOthers(e.target.checked)
                  setErrorMsg('')
                }}
                className="h-4 w-4 rounded border-white/10 bg-slate-950/40 text-accent-blue focus:ring-0 focus:outline-none cursor-pointer"
              />
              Otros
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={abonos}
                onChange={(e) => {
                  setAbonos(e.target.checked)
                  setErrorMsg('')
                }}
                className="h-4 w-4 rounded border-white/10 bg-slate-950/40 text-accent-blue focus:ring-0 focus:outline-none cursor-pointer"
              />
              Abonos
            </label>
          </div>
          {errorMsg && (
            <p className="text-xs text-red-400 font-semibold mt-3 animate-pulse">
              ⚠️ {errorMsg}
            </p>
          )}
        </div>

        {/* Formato de archivo */}
        <div className="border-t border-white/5 pt-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Formato de Archivo:
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 hover:text-white select-none">
              <input
                type="radio"
                name="exportFormat"
                value="xlsx"
                checked={format === 'xlsx'}
                onChange={() => setFormat('xlsx')}
                className="h-4 w-4 border-white/10 bg-slate-950/40 text-accent-blue focus:ring-0 focus:outline-none cursor-pointer"
              />
              Excel (.xlsx)
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 hover:text-white select-none">
              <input
                type="radio"
                name="exportFormat"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
                className="h-4 w-4 border-white/10 bg-slate-950/40 text-accent-blue focus:ring-0 focus:outline-none cursor-pointer"
              />
              CSV (.csv)
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-sm font-semibold transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-accent-blue hover:opacity-90 text-slate-950 text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            Exportar
          </button>
        </div>
      </div>
    </Dialog>
  )
}
