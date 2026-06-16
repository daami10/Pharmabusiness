import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { WholesalersEditor } from '@/components/WholesalersEditor'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { useAuth } from '@/features/auth/AuthProvider'

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wholesalers = useWholesalersStore((s) => s.wholesalers)
  const setWholesalers = useWholesalersStore((s) => s.setWholesalers)
  const { subscriptionTier, activeOrgId } = useAuth()

  // El modal se remonta al abrir (key en AppShell), así que el estado inicial
  // refleja siempre los mayoristas actuales sin necesidad de un efecto.
  const [draft, setDraft] = useState<string[]>(wholesalers)
  const [error, setError] = useState('')

  function save() {
    if (draft.length === 0) {
      setError('Selecciona al menos un mayorista.')
      return
    }
    setWholesalers(draft, activeOrgId)
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

      {/* Licenciamiento y Planes (Modo de Pruebas) */}
      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="text-sm font-semibold text-slate-200">Suscripción y Licencia</h3>
        <p className="mt-1 mb-3 text-xs text-slate-400">
          Gestiona el nivel de acceso asignado a esta farmacia.
        </p>
        <div className="flex items-center justify-between rounded-xl bg-slate-900/50 p-4 border border-white/5">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-300">Plan de Acceso</span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              Control de módulos de GFarma
            </span>
          </div>
          <span
            className={`font-black uppercase tracking-wider px-2.5 py-1 rounded-md text-[9px] ${
              subscriptionTier === 'premium'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
            }`}
          >
            {subscriptionTier === 'premium' ? '✨ Premium' : 'Básico'}
          </span>
        </div>
        <button
          type="button"
          disabled
          className="mt-3 w-full rounded-xl bg-slate-950 py-2.5 text-xs font-bold text-slate-500 border border-white/5 cursor-not-allowed uppercase tracking-wider opacity-60"
        >
          Gestión del Plan (Próximamente)
        </button>
      </div>

      {/* Botones de Acción */}
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
