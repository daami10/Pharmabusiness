import { getVencStatus, monthLabel } from '@/lib/utils/dates'
import type { VencStatus } from '@/lib/utils/dates'
import { isWholesaler } from '@/lib/config/wholesalers'
import type { Factura } from '@/types/domain'

export type FacturaCategory = '' | 'Laboratorio' | 'Mayorista' | 'Otro' | 'Abono'

export interface FacturaFilters {
  year: string
  search: string
  category: FacturaCategory
  vencStatus: '' | VencStatus
  month?: string
  minImporte?: string
  maxImporte?: string
  startDate?: string
  endDate?: string
}

/** Estado de vencimiento efectivo (los abonos no vencen; sin fecha de venc. = pagada). */
export function getEffectiveVencStatus(f: Factura): VencStatus | 'none' {
  if (f.tipo === 'Abono') return 'none'
  if (!f.fecha_vencimiento) return 'paid'
  return getVencStatus(f.fecha_vencimiento, f.pagada)
}

function matchesCategory(
  f: Factura,
  category: FacturaCategory,
  wholesalers: string[],
): boolean {
  if (!category) return true
  if (category === 'Mayorista') return isWholesaler(f.tipo, wholesalers)
  return f.tipo === category
}

/** Aplica los filtros de la pestaña Facturas (parity con `filterFacturas` del legacy). */
export function filterFacturas(
  facturas: Factura[],
  filters: FacturaFilters,
  wholesalers: string[],
): Factura[] {
  const s = filters.search.toLowerCase().trim()
  const min =
    filters.minImporte && filters.minImporte !== ''
      ? parseFloat(filters.minImporte.replace(',', '.'))
      : null
  const max =
    filters.maxImporte && filters.maxImporte !== ''
      ? parseFloat(filters.maxImporte.replace(',', '.'))
      : null
  return facturas.filter((f) => {
    const dateVal = f.fecha ?? f.fecha_vencimiento ?? ''
    const hasDateRange = !!(filters.startDate || filters.endDate)
    if (!hasDateRange && dateVal.slice(0, 4) !== filters.year) return false

    if (filters.startDate && (!f.fecha || f.fecha < filters.startDate)) return false
    if (filters.endDate && (!f.fecha || f.fecha > filters.endDate)) return false
    if (
      s &&
      !f.laboratorio.toLowerCase().includes(s) &&
      !(f.num_factura ?? '').toLowerCase().includes(s)
    ) {
      return false
    }
    if (filters.month && (f.fecha ?? '').slice(5, 7) !== filters.month) return false
    if (!matchesCategory(f, filters.category, wholesalers)) return false
    if (filters.vencStatus && getEffectiveVencStatus(f) !== filters.vencStatus)
      return false

    const imp = f.importe ?? 0
    if (min !== null && imp < min) return false
    if (max !== null && imp > max) return false

    return true
  })
}

export interface MonthGroup {
  key: string
  label: string
  items: Factura[]
  /** Total del mes: suma de facturas menos suma de abonos (igual que el legacy). */
  total: number
}

/** Agrupa por mes (`YYYY-MM`), ordenado de más reciente a más antiguo. */
export function groupByMonth(facturas: Factura[]): MonthGroup[] {
  const groups = new Map<string, Factura[]>()
  for (const f of facturas) {
    const key = (f.fecha ?? '0000-00').slice(0, 7)
    const bucket = groups.get(key)
    if (bucket) bucket.push(f)
    else groups.set(key, [f])
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      let total = 0
      for (const f of items) total += f.tipo === 'Abono' ? -f.importe : f.importe
      return {
        key,
        label: key === '0000-00' ? 'Sin fecha' : monthLabel(key),
        items,
        total,
      }
    })
}

/** Total neto (facturas − abonos) de un conjunto de registros. */
export function netTotal(facturas: Factura[]): number {
  return facturas.reduce(
    (sum, f) => sum + (f.tipo === 'Abono' ? -f.importe : f.importe),
    0,
  )
}
