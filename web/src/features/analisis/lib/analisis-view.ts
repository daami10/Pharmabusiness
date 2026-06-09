import type { Factura } from '@/types/domain'
import { isWholesaler } from '@/lib/config/wholesalers'
import { monthLabel } from '@/lib/utils/dates'

export type AnalisisCategory = '' | 'Laboratorio' | 'Mayorista' | 'Otro'

export interface AnalisisData {
  total: number
  count: number
  topLab: string
  avg: number
  byLab: { lab: string; amount: number }[]
  byMonth: { key: string; label: string; amount: number }[]
}

function matchesCategory(
  f: Factura,
  category: AnalisisCategory,
  wholesalers: string[],
): boolean {
  if (!category) return true
  if (category === 'Mayorista') return isWholesaler(f.tipo, wholesalers)
  return (f.tipo || 'Otro') === category
}

/** Agrega facturas (excluye abonos) para los gráficos de Análisis. */
export function analyzeFacturas(
  facturas: Factura[],
  category: AnalisisCategory,
  wholesalers: string[],
): AnalisisData {
  const items = facturas
    .filter((f) => f.tipo !== 'Abono')
    .filter((f) => matchesCategory(f, category, wholesalers))

  const total = items.reduce((s, f) => s + f.importe, 0)
  const count = items.length

  const labMap = new Map<string, number>()
  for (const f of items) {
    const lab = f.laboratorio || 'Sin nombre'
    labMap.set(lab, (labMap.get(lab) ?? 0) + f.importe)
  }
  const byLab = [...labMap.entries()]
    .map(([lab, amount]) => ({ lab, amount }))
    .sort((a, b) => b.amount - a.amount)

  const monthMap = new Map<string, number>()
  for (const f of items) {
    if (!f.fecha) continue
    const k = f.fecha.slice(0, 7)
    monthMap.set(k, (monthMap.get(k) ?? 0) + f.importe)
  }
  const byMonth = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, amount]) => ({ key, label: monthLabel(key), amount }))

  return {
    total,
    count,
    topLab: byLab[0]?.lab ?? '—',
    avg: count ? total / count : 0,
    byLab,
    byMonth,
  }
}

export interface StackedByWholesaler {
  months: { key: string; label: string }[]
  series: { wholesaler: string; data: number[] }[]
}

/**
 * Evolución mensual desglosada por mayorista (para la gráfica apilada de la
 * categoría "Mayorista"). Cada serie es un mayorista; cada valor, su gasto en el
 * mes correspondiente. Paridad con el stacked chart del legacy (index.html:3329).
 */
export function stackedByWholesaler(
  facturas: Factura[],
  wholesalers: string[],
): StackedByWholesaler {
  const items = facturas.filter(
    (f) => f.tipo !== 'Abono' && wholesalers.includes(f.tipo) && f.fecha,
  )

  const monthSet = new Set<string>()
  for (const f of items) monthSet.add((f.fecha as string).slice(0, 7))
  const monthKeys = [...monthSet].sort((a, b) => a.localeCompare(b))

  // Mapa { mayorista → { mes → total } }
  const byW = new Map<string, Map<string, number>>()
  for (const w of wholesalers) byW.set(w, new Map())
  for (const f of items) {
    const k = (f.fecha as string).slice(0, 7)
    const m = byW.get(f.tipo)
    if (m) m.set(k, (m.get(k) ?? 0) + f.importe)
  }

  return {
    months: monthKeys.map((key) => ({ key, label: monthLabel(key) })),
    series: wholesalers.map((w) => ({
      wholesaler: w,
      data: monthKeys.map((k) => byW.get(w)?.get(k) ?? 0),
    })),
  }
}

/** Filtra por rango de meses [desde, hasta] (formato YYYY-MM); usa fecha o vencimiento. */
export function filterByDateRange(
  facturas: Factura[],
  desde: string,
  hasta: string,
): Factura[] {
  if (!desde && !hasta) return facturas
  const from = desde ? `${desde}-01` : ''
  const to = hasta ? `${hasta}-31` : ''
  return facturas.filter((f) => {
    const d = f.fecha_vencimiento ?? f.fecha ?? ''
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
}
