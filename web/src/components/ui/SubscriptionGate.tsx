import { useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, Check, LogOut, Lock, ShieldAlert, Sparkles } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { startCheckout } from '@/lib/billing'

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

interface PlanCard {
  id: 'basic' | 'premium'
  name: string
  price: string
  highlight: boolean
}

const PLANS: PlanCard[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: '24,99€',
    highlight: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '34,99€', // Corrected to match Stripe
    highlight: true,
  },
]

/**
 * Gates the whole authenticated app behind a paid (or trialing) subscription.
 * - Active or trialing org → renders the app.
 * - Otherwise: the titular sees a paywall to choose a plan; an empleado is told
 *   to contact the titular (only the titular can pay).
 */
export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { hasAccess, loading, userRole, session, signOut } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<'basic' | 'premium' | null>(null)
  const [error, setError] = useState('')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Cargando…
      </div>
    )
  }

  if (hasAccess) {
    return <>{children}</>
  }

  async function handleSubscribe(plan: 'basic' | 'premium') {
    setLoadingPlan(plan)
    setError('')
    try {
      await startCheckout(plan, session?.access_token)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al conectar con Stripe.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#090d16] text-[#f1f5f9] antialiased overflow-x-hidden">
      {/* Glowing Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-500/20 to-[#00f2fe]/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-purple-500/15 to-[#00f2fe]/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
        {userRole !== 'titular' ? (
          // Empleado: cannot pay, must contact the titular.
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#0b111e]/85 p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/35 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)] mb-6">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight mb-2">
              Suscripción no activa
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              La suscripción de tu farmacia no está activa o el periodo de prueba ha
              finalizado. Contacta con el{' '}
              <strong className="text-red-400 font-semibold">Titular</strong> para reactivar
              el acceso.
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        ) : (
          // Titular: choose a plan and pay.
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#bf953f]/35 bg-[#bf953f]/10 text-[#fcf6ba] shadow-[0_0_20px_rgba(212,175,55,0.15)] mb-5 animate-pulse">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                Elige tu plan para continuar
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tu periodo de prueba ha finalizado. Suscríbete para seguir gestionando tu
                farmacia.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-3xl border p-7 backdrop-blur-xl transition-all duration-300 ${
                    p.highlight
                      ? 'border-[#bf953f]/30 bg-slate-950/80 shadow-[0_0_30px_rgba(212,175,55,0.06)] hover:border-[#fcf6ba]/50 hover:shadow-[0_0_40px_rgba(252,246,186,0.15)]'
                      : 'border-white/10 bg-[#0b111e]/70 hover:border-[#e2e8f0]/30 hover:shadow-[0_0_30px_rgba(148,163,184,0.12)]'
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#bf953f] to-[#fcf6ba] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#3c2a05] shadow-md">
                      Recomendado
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    {p.highlight ? (
                      <Sparkles className="h-5 w-5 text-[#fcf6ba] animate-pulse" />
                    ) : (
                      <BarChart3 className="h-5 w-5 text-slate-300" />
                    )}
                    <h3 className="text-lg font-black text-white">{p.name}</h3>
                  </div>
                  <div className="mb-5">
                    <span className={`text-3xl font-black font-mono ${p.highlight ? 'text-[#fcf6ba]' : 'text-white'}`}>{p.price}</span>
                    <span className="text-xs text-slate-400 font-semibold"> /mes + IVA</span>
                  </div>
                  <ul className="space-y-3 mb-7 flex-1">
                    {COMPARISON_FEATURES.map((feature, idx) => {
                      const hasFeature = p.id === 'basic' ? feature.basic : feature.premium;
                      return (
                        <li key={idx} className="flex items-start gap-2.5">
                          {typeof hasFeature === 'string' ? (
                            <>
                              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${p.highlight ? 'text-[#fcf6ba]' : 'text-[#cbd5e1]'}`} />
                              <span className="text-xs font-semibold text-slate-300">
                                {feature.name}: <strong className="text-white font-black">{hasFeature}</strong>
                              </span>
                            </>
                          ) : hasFeature ? (
                            <>
                              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${p.highlight ? 'text-[#fcf6ba]' : 'text-[#cbd5e1]'}`} />
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
                  <button
                    type="button"
                    disabled={loadingPlan !== null}
                    onClick={() => void handleSubscribe(p.id)}
                    className={`w-full rounded-full py-3.5 text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      p.highlight
                        ? 'bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] text-[#3c2a05] border border-[#fcf6ba]/30 shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(252,246,186,0.3)]'
                        : 'bg-gradient-to-r from-[#94a3b8] via-[#e2e8f0] to-[#64748b] text-[#0f172a] border border-[#e2e8f0]/30 shadow-[0_0_20px_rgba(148,163,184,0.15)] hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(226,232,240,0.25)]'
                    }`}
                  >
                    {loadingPlan === p.id ? 'Cargando pasarela…' : `Suscribirme a ${p.name}`}
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-5 text-center text-[11px] text-red-400 font-semibold">
                {error}
              </p>
            )}

            <div className="mt-7 text-center">
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
