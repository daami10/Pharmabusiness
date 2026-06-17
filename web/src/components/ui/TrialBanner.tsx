import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { startCheckout } from '@/lib/billing'

/**
 * Thin banner shown while the org is on an active free trial. Lets the titular
 * jump straight to checkout. Hidden for empleados and for paid (active) orgs.
 */
export function TrialBanner() {
  const { isTrialActive, trialDaysLeft, userRole, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isTrialActive || userRole !== 'titular') return null

  async function handleSubscribe() {
    setLoading(true)
    setError('')
    try {
      await startCheckout('premium', session?.access_token)
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error ? err.message : 'No se pudo conectar con la pasarela de pago.',
      )
      setLoading(false)
    }
  }

  const days = trialDaysLeft ?? 0
  const dayLabel = days === 1 ? 'día' : 'días'

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-[#00f2fe]/20 bg-[#00f2fe]/5 px-4 py-2 text-center">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#bdeffd]">
        <Sparkles className="h-3.5 w-3.5 text-[#00f2fe]" />
        Prueba gratuita: te {days === 1 ? 'queda' : 'quedan'}{' '}
        <strong className="font-black text-white">
          {days} {dayLabel}
        </strong>
      </span>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleSubscribe()}
        className="text-xs font-black uppercase tracking-wider text-[#00f2fe] underline-offset-2 hover:underline disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Cargando…' : 'Suscríbete ahora'}
      </button>
      {error && <span className="w-full text-[11px] font-semibold text-red-400">{error}</span>}
    </div>
  )
}
