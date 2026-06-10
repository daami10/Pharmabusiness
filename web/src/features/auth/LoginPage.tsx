import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Coins,
  Eye,
  EyeOff,
  Lock,
  Mail,
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

  // Show/Hide password toggle
  const [showPassword, setShowPassword] = useState(false)

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

  const handleAuthSubmit = handleSubmit(async ({ email, password }) => {
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
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-[#090d16] overflow-hidden">
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

        {/* Card contenedor glassmorphic */}
        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-accent-blue/30 bg-[#090d16]/40 p-8 shadow-[0_0_50px_rgba(0,242,254,0.15)] backdrop-blur-xl glass-card">
          {/* Modos: Login y Registro */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black tracking-tight text-white lg:hidden">
                  <span className="text-accent-blue">G</span>Farma
                </h1>
                <h2 className="text-xl font-black tracking-tight text-white mt-1">
                  Bienvenido a{' '}
                  <span className="bg-gradient-to-r from-accent-blue to-blue-400 bg-clip-text text-transparent">
                    GFarma
                  </span>
                </h2>
                <p className="mt-1 text-xs text-slate-400 leading-normal">
                  {mode === 'login'
                    ? 'Inicia sesión para gestionar inteligentemente'
                    : 'Regístrate para empezar a gestionar tus gastos'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
                {/* Campo: Correo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="ejemplo@correo.com"
                      autoComplete="email"
                      {...register('email')}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 focus:outline-none transition-all"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-[10px] text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Campo: Contraseña */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      {...register('password')}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-10 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      aria-label={
                        showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-[10px] text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>

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

                {/* Botón enviar */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-xs font-black text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all hover:scale-[1.01] hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60 cursor-pointer uppercase tracking-wider"
                >
                  {isSubmitting
                    ? 'Cargando…'
                    : mode === 'login'
                      ? 'Iniciar Sesión'
                      : 'Registrarse'}
                </button>
              </form>

              {/* Enlaces de pie de tarjeta */}
              <div className="mt-5 space-y-2.5 text-center">
                {mode === 'login' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password')
                        setServerError('')
                        setInfo('')
                      }}
                      className="text-[11px] font-semibold text-[#00f2fe] hover:text-[#00f2fe]/80 transition-colors cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                    <p className="text-[11px] text-slate-400">
                      ¿No tienes cuenta?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('register')}
                        className="font-bold text-[#00f2fe] hover:underline cursor-pointer"
                      >
                        Regístrate
                      </button>
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    ¿Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-bold text-[#00f2fe] hover:underline cursor-pointer"
                    >
                      Inicia sesión
                    </button>
                  </p>
                )}
              </div>

              {/* Separador e Inicio de sesión social ficticio */}
              <div className="border-t border-white/5 my-5 pt-4 flex flex-col items-center">
                <div className="flex items-center gap-4">
                  {/* Google Icon SVG */}
                  <svg
                    className="h-5 w-5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                    viewBox="0 0 24 24"
                    aria-label="Iniciar con Google"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.78-2.4 3.63l3.07 2.38c1.8-1.66 2.84-4.11 2.84-7.06z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.07-2.38c-.9.6-2.06.96-3.23.96-2.48 0-4.58-1.67-5.33-3.92H1.03v2.44C3.01 22.12 7.21 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.67 15.75c-.2-.6-.31-1.24-.31-1.9 0-.66.11-1.3.31-1.9V9.51H1.03C.37 10.86 0 12.39 0 14s.37 3.14 1.03 4.49l3.07-2.38c-.2-.6-.43-1.42-.43-2.36z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.93 1.19 15.22 0 12 0 7.21 0 3.01 1.88 1.03 4.69l3.07 2.38c.75-2.25 2.85-3.92 5.33-3.92z"
                    />
                  </svg>

                  <span className="h-4 w-[1px] bg-white/10" />

                  {/* Microsoft Icon SVG */}
                  <svg
                    className="h-4.5 w-4.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                    viewBox="0 0 23 23"
                    aria-label="Iniciar con Microsoft"
                  >
                    <path fill="#F25022" d="M0 0h11v11H0z" />
                    <path fill="#7FBA00" d="M12 0h11v11H12z" />
                    <path fill="#01A6F0" d="M0 12h11v11H0z" />
                    <path fill="#FFB900" d="M12 12h11v11H12z" />
                  </svg>
                </div>
              </div>
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
                Volver
              </button>

              <h2 className="text-lg font-extrabold text-white">Recuperar contraseña</h2>
              <p className="mt-1.5 text-xs text-slate-400 leading-normal">
                Introduce tu correo electrónico y te enviaremos un enlace de recuperación.
              </p>

              <form onSubmit={handleSendRecovery} className="mt-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  {recoveryError && (
                    <p className="mt-1.5 text-[10px] text-red-400">{recoveryError}</p>
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
                  className="w-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-xs font-black text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all hover:scale-[1.01] hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60 cursor-pointer uppercase tracking-wider"
                >
                  {isSubmittingRecovery ? 'Enviando enlace…' : 'Enviar enlace'}
                </button>
              </form>
            </>
          )}

          {/* Modo: Nueva Contraseña (reset_password) */}
          {mode === 'reset_password' && (
            <>
              <h2 className="text-lg font-extrabold text-white">Nueva contraseña</h2>
              <p className="mt-1.5 text-xs text-slate-400 leading-normal">
                Establece la nueva contraseña para acceder a tu cuenta (mínimo 6
                caracteres).
              </p>

              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  {resetError && (
                    <p className="mt-1.5 text-[10px] text-red-400">{resetError}</p>
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
                  className="w-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-xs font-black text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all hover:scale-[1.01] hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60 cursor-pointer uppercase tracking-wider"
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
