import { useState } from 'react'
import { Dialog } from './Dialog'
import { Check, Lock, Sparkles, BarChart3 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { startCheckout } from '@/lib/billing'

interface PlanSelectionModalProps {
  open: boolean
  onClose: () => void
}

interface PlanFeature {
  name: string
  basic: boolean | string
  premium: boolean | string
}

const COMPARISON_FEATURES: PlanFeature[] = [
  { name: 'Inicio y panel de KPIs', basic: true, premium: true },
  { name: 'Gestión de Facturas e IA', basic: true, premium: true },
  { name: 'Control de Abonos', basic: true, premium: true },
  { name: 'Análisis y gráficos avanzados', basic: false, premium: true },
  { name: 'Fiscalidad', basic: false, premium: true },
  { name: 'Trabajadores y Seguros Sociales', basic: false, premium: true },
  { name: 'Usuarios permitidos', basic: '1 usuario', premium: 'Hasta 3 usuarios' },
]

export function PlanSelectionModal({ open, onClose }: PlanSelectionModalProps) {
  const { session } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<'basic' | 'premium' | null>(null)
  const [error, setError] = useState('')

  async function handleSubscribe(plan: 'basic' | 'premium') {
    setLoadingPlan(plan)
    setError('')
    try {
      await startCheckout(plan, session?.access_token)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al conectar con la pasarela de pago.')
      setLoadingPlan(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Elige tu Plan de Suscripción" size="2xl">
      <div className="relative">
        <p className="mb-6 text-xs text-slate-400 text-center max-w-lg mx-auto">
          GFarma se adapta al tamaño de tu farmacia. Selecciona el plan que mejor se ajuste a tus necesidades para continuar.
        </p>

        {/* Side-by-side Cards */}
        <div className="grid gap-5 md:grid-cols-2 mt-4">
          
          {/* PLAN BASICO - Plateado */}
          <div className="relative flex flex-col rounded-2xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-sm hover:border-[#e2e8f0]/30 hover:shadow-[0_0_30px_rgba(148,163,184,0.12)] transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-slate-400" />
              <h3 className="text-base font-black text-slate-200">Plan Básico</h3>
            </div>
            
            <div className="mb-4">
              <span className="text-2xl font-black text-white font-mono">24,99€</span>
              <span className="text-xs text-slate-400 font-semibold"> /mes + IVA</span>
            </div>

            <div className="flex-1">
              <div className="border-t border-white/5 my-3 pt-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Características</span>
              </div>
              <ul className="space-y-3 mb-6">
                {COMPARISON_FEATURES.map((feature, idx) => {
                  const hasFeature = feature.basic;
                  return (
                    <li key={idx} className="flex items-start gap-2.5">
                      {typeof hasFeature === 'string' ? (
                        <>
                          <Check className="h-4 w-4 text-[#cbd5e1] shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-300">
                            {feature.name}: <strong className="text-white font-black">{hasFeature}</strong>
                          </span>
                        </>
                      ) : hasFeature ? (
                        <>
                          <Check className="h-4 w-4 text-[#cbd5e1] shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-300">{feature.name}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-500 line-through decoration-slate-700/50">
                            {feature.name}
                          </span>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            <button
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => void handleSubscribe('basic')}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#94a3b8] via-[#e2e8f0] to-[#64748b] text-[#0f172a] border border-[#e2e8f0]/30 shadow-[0_0_20px_rgba(148,163,184,0.15)] hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(226,232,240,0.25)] transition-all duration-300 py-3 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPlan === 'basic' ? 'Cargando...' : 'Suscribirse a Básico'}
            </button>
          </div>

          {/* PLAN PREMIUM - Dorado */}
          <div className="relative flex flex-col rounded-2xl border border-[#bf953f]/30 bg-slate-950/80 p-6 shadow-[0_0_30px_rgba(212,175,55,0.06)] hover:border-[#fcf6ba]/50 hover:shadow-[0_0_40px_rgba(252,246,186,0.15)] transition-all duration-300">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#bf953f] to-[#fcf6ba] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#3c2a05] shadow-md">
              Recomendado
            </span>
            
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-[#fcf6ba] animate-pulse" />
              <h3 className="text-base font-black text-white">Plan Premium</h3>
            </div>
            
            <div className="mb-4">
              <span className="text-2xl font-black text-[#fcf6ba] font-mono">34,99€</span>
              <span className="text-xs text-slate-400 font-semibold"> /mes + IVA</span>
            </div>

            <div className="flex-1">
              <div className="border-t border-white/5 my-3 pt-3">
                <span className="text-[10px] font-bold text-[#bf953f] uppercase tracking-widest">Características</span>
              </div>
              <ul className="space-y-3 mb-6">
                {COMPARISON_FEATURES.map((feature, idx) => {
                  const hasFeature = feature.premium;
                  return (
                    <li key={idx} className="flex items-start gap-2.5">
                      {typeof hasFeature === 'string' ? (
                        <>
                          <Check className="h-4 w-4 text-[#fcf6ba] shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-200">
                            {feature.name}: <strong className="text-white font-black">{hasFeature}</strong>
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 text-[#fcf6ba] shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-200">{feature.name}</span>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            <button
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => void handleSubscribe('premium')}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] text-[#3c2a05] border border-[#fcf6ba]/30 shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(252,246,186,0.3)] transition-all duration-300 py-3 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPlan === 'premium' ? 'Cargando...' : 'Suscribirse a Premium'}
            </button>
          </div>

        </div>

        {error && (
          <p className="mt-4 text-center text-[10px] text-red-400 font-semibold animate-shake">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  )
}
