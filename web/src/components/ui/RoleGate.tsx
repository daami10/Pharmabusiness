import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'

export function RoleGate({ children }: { children: ReactNode }) {
  const { userRole } = useAuth()

  if (userRole === 'titular') {
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
        {/* Glassmorphic role warning card */}
        <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#0b111e]/85 p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] backdrop-blur-xl transition-all">
          {/* Glowing Alert Badge */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/35 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)] mb-6">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <h3 className="text-xl font-black text-white tracking-tight mb-2">
            Área Exclusiva del Titular
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Esta sección contiene información fiscal y laboral de la farmacia. Tu rol
            actual de <strong className="text-red-400 font-semibold">Empleado</strong> no
            dispone de permisos para consultar estos datos.
          </p>

          <div className="text-xs text-slate-500 leading-normal border-t border-white/5 pt-4">
            Si crees que deberías tener acceso, solicita al propietario de la farmacia que
            actualice tu rol a Titular.
          </div>
        </div>
      </div>
    </div>
  )
}
