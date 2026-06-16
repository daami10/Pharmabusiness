import { NavLink } from 'react-router-dom'
import { Lock, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { NAV_ITEMS } from './nav'

export function Sidebar({
  open,
  onClose,
  onSettings,
  onPrivacy,
}: {
  open: boolean
  onClose: () => void
  onSettings: () => void
  onPrivacy: () => void
}) {
  const { signOut, subscriptionTier, userRole } = useAuth()
  const secondaryCls =
    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 transition-all hover:bg-white/5 hover:text-white'

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-accent-blue/10 bg-[#0d1b32]/95 p-6 backdrop-blur-md transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-8">
          {/* Logo con cruz médica SVG */}
          <div className="flex items-center gap-3 shrink-0 select-none">
            <svg
              className="w-8 h-8"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="logo-g-grad-sidebar"
                  x1="0%"
                  y1="100%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#00f2fe" />
                </linearGradient>
              </defs>
              <path
                d="M 76 30 A 33 33 0 1 0 76 70 L 76 50 H 65"
                stroke="url(#logo-g-grad-sidebar)"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 45 37 H 55 V 45 H 63 V 55 H 55 V 63 H 45 V 55 H 37 V 45 H 45 Z"
                stroke="url(#logo-g-grad-sidebar)"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-2xl font-black tracking-tight text-white select-none">
              <span className="bg-gradient-to-r from-[#10b981] to-[#00f2fe] bg-clip-text text-transparent">
                G
              </span>
              Farma
            </span>
          </div>

          <nav className="space-y-2.5">
            {NAV_ITEMS.map(
              ({ to, label, icon: Icon, end, requiredTier, requiredRole }) => {
                const isLocked =
                  (requiredTier === 'premium' && subscriptionTier !== 'premium') ||
                  (requiredRole === 'titular' && userRole !== 'titular')
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-4 py-3.5 text-sm font-semibold transition-all border border-transparent ${
                        isActive
                          ? 'tab-active'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon className="h-5 w-5" />
                      {label}
                    </div>
                    {isLocked && (
                      <Lock className="h-3.5 w-3.5 text-[#00f2fe]/80 shrink-0" />
                    )}
                  </NavLink>
                )
              },
            )}
          </nav>
        </div>

        <div className="space-y-1.5">
          <button type="button" onClick={onSettings} className={secondaryCls}>
            <Settings className="h-5 w-5" />
            Configuración
          </button>
          <button type="button" onClick={onPrivacy} className={secondaryCls}>
            <ShieldCheck className="h-5 w-5" />
            Privacidad
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
            Salir
          </button>
        </div>
      </aside>
    </>
  )
}
