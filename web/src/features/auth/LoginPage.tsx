import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
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

export function LoginPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [serverError, setServerError] = useState('')
  const [info, setInfo] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

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
      // si va bien, AuthProvider detecta la sesión y el redirect de abajo actúa
    }
  })

  if (session) return <Navigate to="/" replace />

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-accent-blue/15 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="mb-6 text-center text-2xl font-extrabold text-white">
          <span className="text-accent-blue">G</span>Farma
        </h1>

        <div className="mb-6 flex rounded-xl bg-slate-950/40 p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
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
              placeholder="Email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              {...register('password')}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              {serverError}
            </p>
          )}
          {info && (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-400">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60"
          >
            {isSubmitting
              ? 'Cargando…'
              : mode === 'login'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </main>
  )
}
