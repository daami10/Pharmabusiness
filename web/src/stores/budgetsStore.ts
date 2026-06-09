import { create } from 'zustand'
import { BUDGETS_KEY, getBudgets } from '@/lib/config/budgets'

interface BudgetsState {
  budgets: Record<string, number>
  setBudget: (lab: string, amount: number) => void
  removeBudget: (lab: string) => void
}

function persist(b: Record<string, number>) {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(b))
}

/** Presupuestos por laboratorio (reactivo). Persiste en localStorage `pb_budgets`. */
export const useBudgetsStore = create<BudgetsState>((set, get) => ({
  budgets: getBudgets(),
  setBudget: (lab, amount) => {
    const name = lab.trim()
    if (!name || !Number.isFinite(amount) || amount <= 0) return
    const next = { ...get().budgets, [name]: amount }
    persist(next)
    set({ budgets: next })
  },
  removeBudget: (lab) => {
    const next = { ...get().budgets }
    delete next[lab]
    persist(next)
    set({ budgets: next })
  },
}))
