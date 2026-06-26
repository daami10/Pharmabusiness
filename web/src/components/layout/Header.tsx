import { Menu } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useYearStore } from '@/stores/yearStore'

export function Header({ onMenu }: { onMenu: () => void }) {
  const { user, activeOrgName } = useAuth()
  const { year, availableYears, setYear } = useYearStore()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-accent-blue/10 bg-[#0d1b32]/40 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-slate-950/40 p-0.5">
          {availableYears.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-black transition-all ${
                y === year
                  ? 'border border-accent-blue/40 bg-accent-blue/10 text-accent-blue shadow-[0_0_10px_rgba(0,242,254,0.2)]'
                  : 'border border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-end text-right select-none">
        <span className="max-w-[200px] truncate text-xs font-bold text-white">
          {activeOrgName || 'Farmacia'}
        </span>
        <span className="max-w-[180px] truncate text-[10px] font-medium text-slate-400 font-mono mt-0.5">
          {user?.email}
        </span>
      </div>
    </header>
  )
}
