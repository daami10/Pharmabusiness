import { isFuturePeriod, monthLabel } from '@/lib/utils/dates'
import type { Fiscal } from '@/types/domain'
import type { MonthSection } from '@/components/MonthGroupAccordion'

export interface FiscalKpis {
  total: number
  byConcept: { concepto: string; total: number }[]
}

/** KPIs fiscales (excluyen periodos futuros, igual que el legacy). */
export function fiscalKpis(items: Fiscal[]): FiscalKpis {
  let total = 0
  const conceptMap = new Map<string, number>()

  for (const f of items) {
    if (isFuturePeriod(f.fecha)) continue
    total += f.importe
    const current = conceptMap.get(f.concepto) ?? 0
    conceptMap.set(f.concepto, current + f.importe)
  }

  const byConcept = [...conceptMap.entries()]
    .map(([concepto, sum]) => ({ concepto, total: sum }))
    .sort((a, b) => b.total - a.total)

  return { total, byConcept }
}

export function groupFiscalByMonth(items: Fiscal[]): MonthSection<Fiscal>[] {
  const map = new Map<string, Fiscal[]>()
  for (const f of items) {
    const key = (f.fecha ?? '0000-00').slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.push(f)
    else map.set(key, [f])
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, its]) => {
      const isFuture = isFuturePeriod(`${key}-01`)
      const n = its.length
      const noun = isFuture ? 'previsto' : 'pago'
      return {
        key,
        label: monthLabel(key),
        items: its,
        total: its.reduce((s, f) => s + f.importe, 0),
        isFuture,
        countLabel: `${n} ${noun}${n !== 1 ? 's' : ''}`,
      }
    })
}
