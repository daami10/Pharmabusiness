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
  const { signOut, subscriptionTier } = useAuth()
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
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <defs>
                <linearGradient
                  id="cross-grad-sidebar"
                  x1="0%"
                  y1="100%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#00f2fe" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path
                d="M9 3H15V6.5C15 7.3 15.7 8 16.5 8H20V14H16.5C15.7 14 15 14.7 15 15.5V19H9V15.5C9 14.7 8.3 14 7.5 14H4V8H7.5C8.3 8 9 7.3 9 6.5V3Z"
                stroke="url(#cross-grad-sidebar)"
              />
              <path
                d="M7 11.5H9.5L10.8 8L12.8 15L14.2 11.5H17"
                stroke="url(#cross-grad-sidebar)"
                strokeWidth="2"
              />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-white">
              <span className="text-[#00f2fe]">G</span>Farma
            </span>
          </div>

          <nav className="space-y-2.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end, requiredTier }) => {
              const isLocked =
                requiredTier === 'premium' && subscriptionTier !== 'premium'
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
            })}
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
