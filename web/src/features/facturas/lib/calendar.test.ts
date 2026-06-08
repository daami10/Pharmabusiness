import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCalendarGrid, getMonthVencimientos, vencStats } from './calendar'
import type { Factura } from '@/types/domain'

const mk = (over: Partial<Factura>): Factura => ({
  id: '1',
  user_id: 'u',
  tipo: 'Laboratorio',
  laboratorio: 'X',
  num_factura: null,
  fecha: null,
  importe: 10,
  fecha_vencimiento: null,
  notas: null,
  pagada: false,
  ...over,
})

describe('buildCalendarGrid', () => {
  it('contiene todos los días del mes en orden, con nulls solo al inicio', () => {
    const grid = buildCalendarGrid(2026, 5) // junio 2026 (30 días)
    const days = grid.filter((c) => c.day !== null).map((c) => c.day)
    expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
    const firstNonNull = grid.findIndex((c) => c.day !== null)
    expect(grid.slice(0, firstNonNull).every((c) => c.day === null)).toBe(true)
  })
  it('genera dateStr en formato YYYY-MM-DD', () => {
    const grid = buildCalendarGrid(2026, 0) // enero
    const first = grid.find((c) => c.day === 1)
    expect(first?.dateStr).toBe('2026-01-01')
  })
})

describe('getMonthVencimientos', () => {
  const data = [
    mk({ id: 'a', fecha_vencimiento: '2026-06-10' }),
    mk({ id: 'b', fecha_vencimiento: '2026-07-01' }),
    mk({ id: 'c', fecha_vencimiento: '2026-06-25' }),
    mk({ id: 'd', tipo: 'Abono', fecha_vencimiento: '2026-06-15' }),
  ]
  it('filtra por mes y excluye abonos', () => {
    expect(
      getMonthVencimientos(data, 2026, 5)
        .map((f) => f.id)
        .sort(),
    ).toEqual(['a', 'c'])
  })
})

describe('vencStats', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('cuenta por estado efectivo, ignorando abonos', () => {
    const stats = vencStats([
      mk({ fecha_vencimiento: '2026-01-01' }), // overdue
      mk({ fecha_vencimiento: '2026-06-18' }), // neardue (≤7d)
      mk({ fecha_vencimiento: '2026-12-01' }), // pending
      mk({ fecha_vencimiento: null }), // paid (sin venc.)
      mk({ tipo: 'Abono' }), // ignorado
    ])
    expect(stats).toEqual({ overdue: 1, neardue: 1, pending: 1, paid: 1 })
  })
})
