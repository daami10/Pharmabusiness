import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('usa coma decimal (es-ES no agrupa millares en números de 4 cifras, igual que el legacy)', () => {
    expect(formatMoney(1234.5)).toBe('1234,50 €')
  })
  it('agrupa millares a partir de 5 cifras', () => {
    expect(formatMoney(12345.67)).toBe('12.345,67 €')
    expect(formatMoney(1000000)).toBe('1.000.000,00 €')
  })
  it('formatea cero', () => {
    expect(formatMoney(0)).toBe('0,00 €')
  })
  it('trata null/undefined como 0', () => {
    expect(formatMoney(null)).toBe('0,00 €')
    expect(formatMoney(undefined)).toBe('0,00 €')
  })
})
