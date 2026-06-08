import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { NAV_ITEMS } from './nav'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut } = useAuth()

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
          <span className="select-none text-2xl font-bold tracking-tight text-white">
            <span className="text-accent-blue">G</span>Farma
          </span>
          <nav className="space-y-1.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          Salir
        </button>
      </aside>
    </>
  )
}
