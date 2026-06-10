import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Coins,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

const schema = z.object({
  email: z.email('Introduce un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})
type FormValues = z.infer<typeof schema>

const LOGIN_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Email o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu email antes de iniciar sesión.',
}

type LoginMode = 'login' | 'register' | 'forgot_password' | 'reset_password'

export function LoginPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<LoginMode>('login')
  const [serverError, setServerError] = useState('')
  const [info, setInfo] = useState('')

  // States for forgot password
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false)

  // States for reset password
  const [newPassword, setNewPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [isSubmittingReset, setIsSubmittingReset] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Listen for Supabase password recovery trigger
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset_password')
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError('')
    setInfo('')
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setServerError(error.message)
      else
        setInfo('Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setServerError(LOGIN_ERRORS[error.message] ?? error.message)
    }
  })

  // Recovery email submission
  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryError('')
    setInfo('')
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      setRecoveryError('Introduce un email válido')
      return
    }
    setIsSubmittingRecovery(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: window.location.origin + '/login',
      })
      if (error) {
        setRecoveryError(error.message)
      } else {
        setInfo('Hemos enviado un enlace de recuperación a tu email.')
        setRecoveryEmail('')
      }
    } catch (err) {
      setRecoveryError('Error de red al procesar la solicitud.')
    } finally {
      setIsSubmittingRecovery(false)
    }
  }

  // Update password submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    setInfo('')
    if (newPassword.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setIsSubmittingReset(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setResetError(error.message)
      } else {
        setInfo('Contraseña restablecida con éxito. Redirigiendo...')
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      }
    } catch (err) {
      setResetError('Error al guardar la nueva contraseña.')
    } finally {
      setIsSubmittingReset(false)
    }
  }

  if (session && mode !== 'reset_password') return <Navigate to="/" replace />

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Columna Izquierda: Showcase de Funcionalidades */}
      <section className="relative hidden flex-col justify-between p-12 bg-radial-[at_top_left,#0d1a33_0%,#04080f_90%] border-r border-white/5 lg:flex">
        {/* Glow orbs background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-gradient-to-br from-blue-500/15 to-[#00f2fe]/5 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-purple-500/10 to-[#00f2fe]/5 blur-[120px]" />
        </div>

        {/* Cabecera */}
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight">
            <span className="text-accent-blue">G</span>Farma
          </h1>
        </div>

        {/* Características */}
        <div className="relative z-10 max-w-lg my-auto space-y-10">
          <h2 className="text-3xl font-black text-white leading-tight">
            La contabilidad y vencimientos de tu farmacia,{' '}
            <span className="bg-gradient-to-r from-accent-blue via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              bajo control total
            </span>
            .
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-accent-blue shadow-[0_0_15px_rgba(0,242,254,0.1)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Escáner OCR Inteligente
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Sube tus facturas PDF o imágenes y deja que la IA extraiga los importes,
                  proveedores y fechas de vencimiento de forma automatizada.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Calendario de Vencimientos
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Visualiza tus próximos pagos mensuales con un código de colores
                  intuitivo y gestiona facturas pagadas o pendientes a golpe de clic.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Gráficos y Reportes PDF
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Analiza desgloses por mayoristas y laboratorios con gráficos apilados y
                  descarga informes A4 en PDF listos para imprimir.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Fiscalidad Flexible y Personal
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Configura conceptos de impuestos libres, personaliza tus gastos y
                  supervisa las nóminas y seguros sociales de tus trabajadores.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2 text-2xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500/60" />
          <span>© 2026 GFarma. Seguridad cifrada y protección de datos RLS activa.</span>
        </div>
      </section>

      {/* Columna Derecha: Formulario (Login, Register, Forgot, Reset) */}
      <section className="flex items-center justify-center p-6 bg-[#090d16] relative">
        {/* Glow orb for mobile layout background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 lg:hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[90px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-accent-blue/15 bg-slate-900/40 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl glass-card">
          {/* Logo móvil */}
          <h1 className="mb-6 text-center text-2xl font-black text-white tracking-tight lg:hidden">
            <span className="text-accent-blue">G</span>Farma
          </h1>

          {/* Modo Login o Registro */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="mb-6 flex rounded-xl bg-slate-950/40 p-1">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m)
                      setServerError('')
                      setInfo('')
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${
                      mode === m
                        ? 'bg-white/10 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                  </button>
                ))}
              </div>

              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div>
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    autoComplete="email"
                    {...register('email')}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none transition-all"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Contraseña"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    {...register('password')}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none transition-all"
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password')
                        setServerError('')
                        setInfo('')
                      }}
                      className="text-xs font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                {serverError && (
                  <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-xs text-red-400 leading-normal">
                    {serverError}
                  </p>
                )}
                {info && (
                  <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-400 leading-normal">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Cargando…'
                    : mode === 'login'
                      ? 'Iniciar sesión'
                      : 'Crear cuenta'}
                </button>
              </form>
            </>
          )}

          {/* Modo: Olvidaste tu Contraseña (forgot_password) */}
          {mode === 'forgot_password' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setRecoveryError('')
                  setInfo('')
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </button>

              <h2 className="text-lg font-extrabold text-white">Recuperar contraseña</h2>
              <p className="mt-1.5 text-xs text-slate-400 leading-normal">
                Escribe tu dirección de correo electrónico y te enviaremos un enlace de
                recuperación.
              </p>

              <form onSubmit={handleSendRecovery} className="mt-6 space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none transition-all"
                    required
                  />
                  {recoveryError && (
                    <p className="mt-1.5 text-xs text-red-400">{recoveryError}</p>
                  )}
                </div>

                {info && (
                  <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-400 leading-normal">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingRecovery}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingRecovery
                    ? 'Enviando enlace…'
                    : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}

          {/* Modo: Nueva Contraseña (reset_password) */}
          {mode === 'reset_password' && (
            <>
              <h2 className="text-lg font-extrabold text-white">Nueva contraseña</h2>
              <p className="mt-1.5 text-xs text-slate-400 leading-normal">
                Establece la nueva contraseña para el acceso a tu cuenta. Debe tener al
                menos 6 caracteres.
              </p>

              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none transition-all"
                    required
                  />
                  {resetError && (
                    <p className="mt-1.5 text-xs text-red-400">{resetError}</p>
                  )}
                </div>

                {info && (
                  <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-400 leading-normal">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingReset
                    ? 'Guardando contraseña…'
                    : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
