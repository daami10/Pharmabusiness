import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRemainingMonths, getVencStatus, isFuturePeriod, getRemainingDatesForDate } from './dates'

describe('getVencStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('devuelve paid si está pagada, sin importar la fecha', () => {
    expect(getVencStatus('2020-01-01', true)).toBe('paid')
  })
  it('devuelve overdue si venció en el pasado', () => {
    expect(getVencStatus('2026-06-10', false)).toBe('overdue')
  })
  it('devuelve neardue si vence dentro de 7 días', () => {
    expect(getVencStatus('2026-06-20', false)).toBe('neardue')
  })
  it('devuelve pending si vence en más de 7 días', () => {
    expect(getVencStatus('2026-07-30', false)).toBe('pending')
  })
})

describe('isFuturePeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('false para null/undefined', () => {
    expect(isFuturePeriod(null)).toBe(false)
    expect(isFuturePeriod(undefined)).toBe(false)
  })
  it('false para el mes actual', () => {
    expect(isFuturePeriod('2026-06-01')).toBe(false)
  })
  it('true para un mes futuro del mismo año', () => {
    expect(isFuturePeriod('2026-07-01')).toBe(true)
  })
  it('true para un año futuro', () => {
    expect(isFuturePeriod('2027-01-01')).toBe(true)
  })
  it('false para el pasado', () => {
    expect(isFuturePeriod('2025-12-01')).toBe(false)
  })
})

describe('getRemainingMonths', () => {
  it('genera de junio a diciembre', () => {
    expect(getRemainingMonths(2026, 6)).toEqual([
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
      '2026-12-01',
    ])
  })
  it('diciembre genera solo un mes', () => {
    expect(getRemainingMonths(2026, 12)).toEqual(['2026-12-01'])
  })
})

describe('getRemainingDatesForDate', () => {
  it('genera fechas correctamente y maneja meses mas cortos', () => {
    expect(getRemainingDatesForDate('2026-10-31')).toEqual([
      '2026-10-31',
      '2026-11-30',
      '2026-12-31',
    ])
  })
  it('diciembre genera solo un dia', () => {
    expect(getRemainingDatesForDate('2026-12-15')).toEqual(['2026-12-15'])
  })
})
