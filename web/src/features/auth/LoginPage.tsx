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
  Sparkles,
  Store,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

const schema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  organizationName: z.string().optional(),
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

  // Un trabajador invitado llega por un enlace con un token secreto (?invite_token=...).
  // Su presencia — no una consulta pública — es lo que marca el registro como invitado.
  const [inviteToken] = useState(
    () => new URLSearchParams(window.location.search).get('invite_token') || '',
  )
  const isInvitedWorker = inviteToken.length > 0
  const [inviteCode, setInviteCode] = useState('')

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

  const handleAuthSubmit = handleSubmit(async ({ email, password, organizationName }) => {
    setServerError('')
    setInfo('')
    if (mode === 'register') {
      // Comprobaciones de cliente = solo UX. La validación real ocurre en /api/register.
      if (!isInvitedWorker) {
        if (!organizationName || organizationName.trim().length === 0) {
          setServerError('Introduce el nombre de tu farmacia.')
          return
        }
        if (!inviteCode.trim()) {
          setServerError('Introduce el código de invitación.')
          return
        }
      }

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            organizationName: organizationName?.trim(),
            inviteCode: inviteCode.trim(),
            inviteToken: inviteToken || undefined,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setServerError(data.error || 'No se pudo completar el registro.')
          return
        }
        setInfo('Cuenta creada. Ya puedes iniciar sesión.')
        setMode('login')
      } catch {
        setServerError('Error de red al procesar el registro.')
      }
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
    } catch {
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
    } catch {
      setResetError('Error al guardar la nueva contraseña.')
    } finally {
      setIsSubmittingReset(false)
    }
  }

  if (session && mode !== 'reset_password') return <Navigate to="/" replace />

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#070b13] p-4 sm:p-6 overflow-hidden">
      {/* Background neon curves and glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#00f2fe]/15 to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-purple-500/15 to-[#00f2fe]/5 blur-[150px]" />
        <div className="absolute top-[35%] left-[25%] w-[45%] h-[45%] rounded-full bg-blue-500/8 blur-[130px]" />

        {/* Neon wave curves */}
        <svg
          className="absolute w-full h-full opacity-25 min-w-[1024px]"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="neon-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="neon-wave-2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path
            d="M-100 200 C 300 400, 700 100, 1100 500 C 1300 700, 1500 600, 1600 500"
            stroke="url(#neon-wave-1)"
            strokeWidth="12"
            strokeLinecap="round"
            className="blur-[8px]"
          />
          <path
            d="M-50 450 C 400 200, 800 650, 1200 300 C 1350 150, 1500 250, 1550 300"
            stroke="url(#neon-wave-2)"
            strokeWidth="8"
            strokeLinecap="round"
            className="blur-[6px]"
          />
        </svg>
      </div>

      {/* Floating lateral showcase on the left (visible on large screens, does not shift the centered login card) */}
      <section className="absolute left-8 xl:left-20 top-1/2 -translate-y-1/2 max-w-[280px] xl:max-w-sm hidden lg:flex flex-col gap-6 text-left z-10 select-none">
        <h2 className="text-2xl xl:text-3xl font-black text-white leading-tight">
          La gestión de tu farmacia,{' '}
          <span className="bg-gradient-to-r from-[#00f2fe] via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            bajo control total
          </span>
          .
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-[#00f2fe] shadow-[0_0_15px_rgba(0,242,254,0.1)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">
                Escáner OCR Inteligente
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">
                Sube tus facturas PDF o imágenes y deja que la IA extraiga los importes,
                proveedores y fechas de vencimiento de forma automatizada.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">
                Calendario de Vencimientos
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">
                Visualiza tus próximos pagos mensuales con un código de colores intuitivo
                y gestiona facturas pagadas o pendientes a golpe de clic.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">
                Gráficos y Reportes PDF
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">
                Analiza desgloses por mayoristas y laboratorios con gráficos apilados y
                descarga informes A4 en PDF listos para imprimir.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">
                Fiscalidad Flexible y Personal
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">
                Configura conceptos de impuestos libres, personaliza tus gastos y
                supervisa las nóminas y seguros sociales de tus trabajadores.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Modern logo above the card */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex items-center justify-center w-9 h-9">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="logo-g-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#00f2fe" />
                </linearGradient>
              </defs>
              <path
                d="M 76 30 A 33 33 0 1 0 76 70 L 76 50 H 65"
                stroke="url(#logo-g-grad)"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 45 37 H 55 V 45 H 63 V 55 H 55 V 63 H 45 V 55 H 37 V 45 H 45 Z"
                stroke="url(#logo-g-grad)"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-white select-none">
            <span className="bg-gradient-to-r from-[#10b981] to-[#00f2fe] bg-clip-text text-transparent">
              G
            </span>
            Farma
          </span>
        </div>

        {/* Card Contenedor */}
        <div className="w-full rounded-3xl border border-[#00f2fe]/25 bg-[#0b101d]/60 p-8 shadow-[0_0_40px_rgba(0,242,254,0.15)] backdrop-blur-xl">
          {/* Modos: Login y Registro */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Bienvenido a GFarma
                </h2>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
                {/* Campo: Nombre de la Farmacia (solo si es registro de nueva farmacia) */}
                {mode === 'register' && !isInvitedWorker && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Nombre de la Farmacia
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Ej. Farmacia Central"
                        {...register('organizationName')}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-[#00f2fe]/60 focus:ring-1 focus:ring-[#00f2fe]/30 focus:shadow-[0_0_12px_rgba(0,242,254,0.25)] focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

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
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-[#00f2fe]/60 focus:ring-1 focus:ring-[#00f2fe]/30 focus:shadow-[0_0_12px_rgba(0,242,254,0.25)] focus:outline-none transition-all"
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
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-10 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-[#00f2fe]/60 focus:ring-1 focus:ring-[#00f2fe]/30 focus:shadow-[0_0_12px_rgba(0,242,254,0.25)] focus:outline-none transition-all"
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

                {/* Campo: Código de invitación (solo si es registro y no es trabajador invitado) */}
                {mode === 'register' && !isInvitedWorker && (
                  <div className="transition-all duration-300">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Código de Invitación
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Introduce tu código de invitación"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-[#00f2fe]/60 focus:ring-1 focus:ring-[#00f2fe]/30 focus:shadow-[0_0_12px_rgba(0,242,254,0.25)] focus:outline-none transition-all uppercase"
                      />
                    </div>
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

                {/* Botón enviar */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-gradient-to-r from-blue-500 to-[#00f2fe] py-3.5 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(0,242,254,0.35)] transition-all hover:scale-[1.01] hover:from-blue-400 hover:to-[#00f2fe]/90 disabled:opacity-60 cursor-pointer uppercase tracking-wider"
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
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-[#00f2fe]/60 focus:ring-1 focus:ring-[#00f2fe]/30 focus:shadow-[0_0_12px_rgba(0,242,254,0.25)] focus:outline-none transition-all"
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
                  className="w-full rounded-full bg-gradient-to-r from-blue-500 to-[#00f2fe] py-3.5 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(0,242,254,0.35)] transition-all hover:scale-[1.01] hover:from-blue-400 hover:to-[#00f2fe]/90 disabled:opacity-60 cursor-pointer uppercase tracking-wider"
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
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-[#00f2fe]/60 focus:ring-1 focus:ring-[#00f2fe]/30 focus:shadow-[0_0_12px_rgba(0,242,254,0.25)] focus:outline-none transition-all"
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
                  className="w-full rounded-full bg-gradient-to-r from-blue-500 to-[#00f2fe] py-3.5 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(0,242,254,0.35)] transition-all hover:scale-[1.01] hover:from-blue-400 hover:to-[#00f2fe]/90 disabled:opacity-60 cursor-pointer uppercase tracking-wider"
                >
                  {isSubmittingReset
                    ? 'Guardando contraseña…'
                    : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
