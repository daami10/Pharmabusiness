import type { Factura } from '@/types/domain'
import { getEffectiveVencStatus } from './facturas-view'
import type { VencStatus } from '@/lib/utils/dates'

export interface CalCell {
  day: number | null
  dateStr: string | null
}

/** Rejilla del mes (offsets vacíos al inicio, lunes primero). `month0` es 0-indexado. */
export function buildCalendarGrid(year: number, month0: number): CalCell[] {
  const firstDow = new Date(year, month0, 1).getDay() // 0 = domingo
  const startOffset = firstDow === 0 ? 6 : firstDow - 1 // semana empieza en lunes
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const cells: CalCell[] = []
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, dateStr: null })
  const mm = String(month0 + 1).padStart(2, '0')
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${year}-${mm}-${String(d).padStart(2, '0')}` })
  }
  return cells
}

/** Facturas (no abonos) cuyo vencimiento cae en el mes indicado. */
export function getMonthVencimientos(
  facturas: Factura[],
  year: number,
  month0: number,
): Factura[] {
  const key = `${year}-${String(month0 + 1).padStart(2, '0')}`
  return facturas.filter(
    (f) => f.tipo !== 'Abono' && (f.fecha_vencimiento ?? '').startsWith(key),
  )
}

export type VencStats = Record<VencStatus, number>

/** Conteo de facturas (no abonos) por estado de vencimiento efectivo. */
export function vencStats(facturas: Factura[]): VencStats {
  const c: VencStats = { overdue: 0, neardue: 0, pending: 0, paid: 0 }
  for (const f of facturas) {
    if (f.tipo === 'Abono') continue
    const s = getEffectiveVencStatus(f)
    if (s !== 'none') c[s]++
  }
  return c
}
