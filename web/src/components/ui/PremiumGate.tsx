import { useState } from 'react'
import type { ReactNode } from 'react'
import { Lock, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'

export function PremiumGate({ children }: { children: ReactNode }) {
  const { subscriptionTier, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    try {
      const token = session?.access_token
      if (!token) throw new Error('No se encontró sesión de usuario.')

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al iniciar la pasarela de pago.')
      }

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No se recibió la URL de redirección.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al conectar con Stripe.')
      setLoading(false)
    }
  }

  if (subscriptionTier === 'premium') {
    return <>{children}</>
  }

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden">
      {/* Blurred background content */}
      <div className="blur-[10px] pointer-events-none select-none opacity-25 transition-all duration-500">
        {children}
      </div>

      {/* Overlay Content */}
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-slate-950/20 backdrop-blur-[2px]">
        {/* Glassmorphic premium promo card */}
        <div className="w-full max-w-md rounded-3xl border border-[#00f2fe]/30 bg-[#0b111e]/85 p-8 text-center shadow-[0_0_50px_rgba(0,242,254,0.2)] backdrop-blur-xl transition-all">
          {/* Glowing Lock Badge */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00f2fe]/35 bg-[#00f2fe]/10 text-[#00f2fe] shadow-[0_0_20px_rgba(0,242,254,0.25)] mb-6">
            <Lock className="h-7 w-7" />
          </div>

          <h3 className="text-xl font-black text-white tracking-tight mb-2">
            Acceso Premium Requerido
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Obtén el control total de tu farmacia. Sube al plan{' '}
            <strong className="font-bold text-[#fcf6ba]">Premium</strong> para desbloquear
            esta sección y las herramientas de análisis avanzado.
          </p>

          {/* Benefits list */}
          <div className="space-y-3.5 text-left mb-8 border-y border-white/5 py-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4.5 w-4.5 text-[#00f2fe] shrink-0" />
              <span className="text-xs text-slate-300 font-semibold">
                Gráficos de mayoristas e informes PDF en A4
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="h-4.5 w-4.5 text-purple-400 shrink-0" />
              <span className="text-xs text-slate-300 font-semibold">
                Desglose de fiscalidad, IVA e impuestos libres
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-300 font-semibold">
                Gestión completa de empleados, nóminas y contratos
              </span>
            </div>
          </div>

          {/* Primary upgrade CTA button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleUpgrade}
            className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] py-4 text-xs font-black text-[#3c2a05]/95 shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:shadow-[0_0_35px_rgba(252,246,186,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer uppercase tracking-widest flex items-center justify-center gap-2 border border-[#fcf6ba]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="gold-btn-shimmer" />
            <Sparkles className="h-4 w-4 text-[#3c2a05]/80 shrink-0" />
            <span>{loading ? 'Cargando pasarela...' : 'Mejorar a Plan Premium'}</span>
          </button>

          {error && (
            <p className="mt-3 text-[11px] text-red-400 font-semibold">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
