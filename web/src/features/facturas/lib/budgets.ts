import type { Factura } from '@/types/domain'

export interface BudgetAlert {
  lab: string
  spent: number
  limit: number
}

/**
 * Laboratorios que superan su presupuesto. El gasto por laboratorio es la suma
 * de facturas menos abonos (igual que `checkBudgetAlerts` del legacy).
 */
export function computeBudgetAlerts(
  facturas: Factura[],
  budgets: Record<string, number>,
): BudgetAlert[] {
  const labs = Object.keys(budgets)
  if (labs.length === 0) return []
  const byLab: Record<string, number> = {}
  for (const f of facturas) {
    const lab = f.laboratorio || ''
    const delta = (f.tipo === 'Abono' ? -1 : 1) * (f.importe || 0)
    byLab[lab] = (byLab[lab] || 0) + delta
  }
  return labs
    .filter((lab) => (byLab[lab] || 0) > budgets[lab])
    .map((lab) => ({ lab, spent: byLab[lab] || 0, limit: budgets[lab] }))
}
