import { isFuturePeriod, monthLabel } from '@/lib/utils/dates'
import type { Fiscal } from '@/types/domain'
import type { MonthSection } from '@/components/MonthGroupAccordion'

export interface FiscalKpis {
  total: number
  autonomo: number
  renta: number
}

/** KPIs fiscales (excluyen periodos futuros, igual que el legacy). */
export function fiscalKpis(items: Fiscal[]): FiscalKpis {
  const k: FiscalKpis = { total: 0, autonomo: 0, renta: 0 }
  for (const f of items) {
    if (isFuturePeriod(f.fecha)) continue
    k.total += f.importe
    if (f.concepto === 'Cuota de Autónomos') k.autonomo += f.importe
    else if (
      f.concepto === 'Declaración de la Renta' ||
      f.concepto === 'Impuesto de Sociedades'
    )
      k.renta += f.importe
  }
  return k
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
