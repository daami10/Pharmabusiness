import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { WholesalersEditor } from '@/components/WholesalersEditor'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { useAuth } from '@/features/auth/AuthProvider'

export function OnboardingModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const setWholesalers = useWholesalersStore((s) => s.setWholesalers)
  const { activeOrgId } = useAuth()
  const [draft, setDraft] = useState<string[]>(['FedeFarma'])
  const [error, setError] = useState('')

  function start() {
    if (draft.length === 0) {
      setError('Selecciona al menos un mayorista.')
      return
    }
    setWholesalers(draft, activeOrgId)
    onClose()
  }

  return (
    <Dialog open={open} onClose={() => undefined} title="¡Bienvenido a GFarma!">
      <p className="mb-4 text-sm text-slate-400">
        Para empezar, indícanos qué <strong className="text-slate-200">mayoristas</strong>{' '}
        usa tu farmacia. Podrás cambiarlos más tarde en Configuración.
      </p>
      <WholesalersEditor value={draft} onChange={setDraft} />
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={start}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500"
      >
        Guardar y comenzar
      </button>
    </Dialog>
  )
}
