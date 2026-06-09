import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useBudgetsStore } from '@/stores/budgetsStore'
import { formatMoney } from '@/lib/utils/money'

/**
 * Editor de presupuestos por laboratorio: nombre + importe máximo. Aplica los
 * cambios al instante sobre el store (igual que addBudget/removeBudget del legacy).
 */
export function BudgetsEditor() {
  const budgets = useBudgetsStore((s) => s.budgets)
  const setBudget = useBudgetsStore((s) => s.setBudget)
  const removeBudget = useBudgetsStore((s) => s.removeBudget)
  const [lab, setLab] = useState('')
  const [amount, setAmount] = useState('')

  const add = () => {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!lab.trim() || !Number.isFinite(amt) || amt <= 0) return
    setBudget(lab, amt)
    setLab('')
    setAmount('')
  }

  const entries = Object.entries(budgets)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={lab}
          onChange={(e) => setLab(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Nombre laboratorio"
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
        />
        <input
          type="number"
          min="0"
          step="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="€ máximo"
          className="w-28 shrink-0 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl border border-white/10 px-3 text-slate-300 hover:bg-white/5"
          aria-label="Añadir presupuesto"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {entries.length === 0 && (
          <p className="text-2xs italic text-slate-500">Sin presupuestos configurados.</p>
        )}
        {entries.map(([name, amt]) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2"
          >
            <span className="text-sm font-medium text-slate-200">{name}</span>
            <span className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">{formatMoney(amt)}</span>
              <button
                type="button"
                onClick={() => removeBudget(name)}
                className="text-red-400 hover:text-red-300"
                aria-label={`Quitar presupuesto de ${name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
