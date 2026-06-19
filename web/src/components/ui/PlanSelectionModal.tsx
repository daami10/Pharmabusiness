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
  { name: 'Fiscalidad, IVA y Nóminas', basic: false, premium: true },
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
          
          {/* PLAN BASICO */}
          <div className="relative flex flex-col rounded-2xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-sm hover:border-slate-800/80 transition-all">
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
                          <Check className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-300">
                            {feature.name}: <strong className="text-white font-black">{hasFeature}</strong>
                          </span>
                        </>
                      ) : hasFeature ? (
                        <>
                          <Check className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
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
              className="mt-6 w-full rounded-xl border border-white/10 py-3 text-xs font-black uppercase tracking-wider text-slate-200 hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === 'basic' ? 'Cargando...' : 'Suscribirse a Básico'}
            </button>
          </div>

          {/* PLAN PREMIUM */}
          <div className="relative flex flex-col rounded-2xl border border-cyan-500/35 bg-slate-950/90 p-6 shadow-[0_0_30px_rgba(0,242,254,0.08)] hover:border-cyan-400/50 transition-all">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-950 shadow-md">
              Recomendado
            </span>
            
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
              <h3 className="text-base font-black text-white">Plan Premium</h3>
            </div>
            
            <div className="mb-4">
              <span className="text-2xl font-black text-cyan-400 font-mono">34,99€</span>
              <span className="text-xs text-slate-400 font-semibold"> /mes + IVA</span>
            </div>

            <div className="flex-1">
              <div className="border-t border-white/5 my-3 pt-3">
                <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest">Características</span>
              </div>
              <ul className="space-y-3 mb-6">
                {COMPARISON_FEATURES.map((feature, idx) => {
                  const hasFeature = feature.premium;
                  return (
                    <li key={idx} className="flex items-start gap-2.5">
                      {typeof hasFeature === 'string' ? (
                        <>
                          <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-200">
                            {feature.name}: <strong className="text-white font-black">{hasFeature}</strong>
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
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
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 hover:scale-[1.01] hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
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
