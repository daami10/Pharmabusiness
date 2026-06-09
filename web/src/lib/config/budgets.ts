// Presupuestos por laboratorio. Parity con el legacy: leídos de localStorage `pb_budgets`.
// Mapa { [laboratorio]: importe máximo }. TODO (multi-tenant): mover a Supabase por organización.
export const BUDGETS_KEY = 'pb_budgets'

export function getBudgets(): Record<string, number> {
  const stored = localStorage.getItem(BUDGETS_KEY)
  if (!stored) return {}
  try {
    const parsed = JSON.parse(stored)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Saneamos: solo entradas con importe numérico positivo.
      const out: Record<string, number> = {}
      for (const [lab, amt] of Object.entries(parsed)) {
        const n = Number(amt)
        if (lab && Number.isFinite(n) && n > 0) out[lab] = n
      }
      return out
    }
    return {}
  } catch {
    return {}
  }
}
