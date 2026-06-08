import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMonthSections } from './monthGroups'

interface Row {
  fecha: string
  importe: number
}

describe('buildMonthSections', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('agrupa por mes desc, suma y pluraliza/marca futuros', () => {
    const rows: Row[] = [
      { fecha: '2026-03-01', importe: 100 },
      { fecha: '2026-03-01', importe: 50 },
      { fecha: '2026-12-01', importe: 200 },
    ]
    const sections = buildMonthSections(rows, {
      getFecha: (r) => r.fecha,
      getImporte: (r) => r.importe,
      nounPast: 'nómina',
      nounFuture: 'prevista',
    })
    expect(sections.map((s) => s.key)).toEqual(['2026-12', '2026-03'])
    expect(sections[0].isFuture).toBe(true)
    expect(sections[0].countLabel).toBe('1 prevista')
    expect(sections[1].countLabel).toBe('2 nóminas')
    expect(sections[1].total).toBe(150)
  })
})
