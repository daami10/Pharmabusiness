import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'

interface CsvExportModalProps {
  open: boolean
  onClose: () => void
  onExport: (startDate: string, endDate: string) => void
}

export function CsvExportModal({ open, onClose, onExport }: CsvExportModalProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Reset inputs when modal is opened
  useEffect(() => {
    if (open) {
      setStartDate('')
      setEndDate('')
    }
  }, [open])

  const handleExport = () => {
    onExport(startDate, endDate)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Exportar Facturas a CSV" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Selecciona el rango de fechas de emisión para la exportación de facturas.
          Si no seleccionas ninguna fecha, se exportará la lista completa con los filtros actuales.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Fecha Desde (Emisión):
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Fecha Hasta (Emisión):
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
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
