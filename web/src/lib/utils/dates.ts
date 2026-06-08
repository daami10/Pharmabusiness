export type VencStatus = 'overdue' | 'neardue' | 'pending' | 'paid'

/** Estado de vencimiento de una factura según su fecha y si está pagada. */
export function getVencStatus(fechaVenc: string, pagada: boolean): VencStatus {
  if (pagada) return 'paid'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${fechaVenc}T00:00:00`)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'neardue'
  return 'pending'
}

/** True si el periodo (`YYYY-MM` o `YYYY-MM-DD`) es posterior al mes actual. */
export function isFuturePeriod(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const now = new Date()
  const [y, m] = dateStr.split('-')
  const yr = parseInt(y, 10)
  const mo = parseInt(m, 10)
  if (yr > now.getFullYear()) return true
  if (yr === now.getFullYear() && mo > now.getMonth() + 1) return true
  return false
}

/**
 * Meses (`YYYY-MM-01`) desde el mes indicado hasta diciembre de ese año.
 * Reproduce la recurrencia "repetir mensualmente hasta fin de año" del legacy.
 */
export function getRemainingMonths(year: number, startMonth: number): string[] {
  const months: string[] = []
  for (let m = startMonth; m <= 12; m++) {
    months.push(`${year}-${String(m).padStart(2, '0')}-01`)
  }
  return months
}
