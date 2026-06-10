import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { WholesalersEditor } from '@/components/WholesalersEditor'
import { BudgetsEditor } from '@/components/BudgetsEditor'
import { useWholesalersStore } from '@/stores/wholesalersStore'

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wholesalers = useWholesalersStore((s) => s.wholesalers)
  const setWholesalers = useWholesalersStore((s) => s.setWholesalers)
  // El modal se remonta al abrir (key en AppShell), así que el estado inicial
  // refleja siempre los mayoristas actuales sin necesidad de un efecto.
  const [draft, setDraft] = useState<string[]>(wholesalers)
  const [error, setError] = useState('')

  function save() {
    if (draft.length === 0) {
      setError('Selecciona al menos un mayorista.')
      return
    }
    setWholesalers(draft)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Configuración">
      <p className="mb-4 text-sm text-slate-400">
        Mayoristas / distribuidores que utilizas. Se usan en filtros, categorías y
        análisis.
      </p>
      <WholesalersEditor value={draft} onChange={setDraft} />
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="text-sm font-semibold text-slate-200">
          Alertas de presupuesto por laboratorio
        </h3>
        <p className="mt-1 mb-3 text-xs text-slate-400">
          Define un gasto máximo anual por laboratorio. Si lo superas, verás un aviso en
          Facturas. Los cambios se guardan al instante.
        </p>
        <BudgetsEditor />
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500"
        >
          Guardar
        </button>
      </div>
    </Dialog>
  )
}
