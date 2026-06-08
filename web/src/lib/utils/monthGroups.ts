import { isFuturePeriod, monthLabel } from './dates'
import type { MonthSection } from '@/components/MonthGroupAccordion'

interface BuildOpts<T> {
  getFecha: (t: T) => string | null
  getImporte: (t: T) => number
  /** Sustantivo del contador en periodos pasados, p.ej. "nómina" (se pluraliza con +s). */
  nounPast: string
  /** Sustantivo en periodos futuros, p.ej. "prevista". */
  nounFuture: string
}

/** Agrupa registros por mes (`YYYY-MM`) en secciones para el MonthGroupAccordion. */
export function buildMonthSections<T>(items: T[], opts: BuildOpts<T>): MonthSection<T>[] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const key = (opts.getFecha(it) ?? '0000-00').slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.push(it)
    else map.set(key, [it])
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, its]) => {
      const isFuture = isFuturePeriod(`${key}-01`)
      const n = its.length
      const noun = isFuture ? opts.nounFuture : opts.nounPast
      return {
        key,
        label: monthLabel(key),
        items: its,
        total: its.reduce((s, t) => s + opts.getImporte(t), 0),
        isFuture,
        countLabel: `${n} ${noun}${n !== 1 ? 's' : ''}`,
      }
    })
}
