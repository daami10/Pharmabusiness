import { describe, expect, it } from 'vitest'
import { analyzeFacturas, filterByDateRange } from './analisis-view'
import type { Factura } from '@/types/domain'

const mk = (over: Partial<Factura>): Factura => ({
  id: '1',
  user_id: 'u',
  tipo: 'Laboratorio',
  laboratorio: 'Alfa',
  num_factura: null,
  fecha: '2026-02-10',
  importe: 100,
  fecha_vencimiento: null,
  notas: null,
  pagada: false,
  ...over,
})

const WHOLESALERS = ['FedeFarma']

describe('analyzeFacturas', () => {
  const data = [
    mk({ laboratorio: 'Alfa', importe: 100, fecha: '2026-02-10' }),
    mk({ laboratorio: 'Beta', importe: 300, fecha: '2026-03-10' }),
    mk({ laboratorio: 'Alfa', importe: 50, fecha: '2026-03-15' }),
    mk({
      tipo: 'FedeFarma',
      laboratorio: 'FedeFarma',
      importe: 500,
      fecha: '2026-02-01',
    }),
    mk({ tipo: 'Abono', laboratorio: 'Alfa', importe: 999, fecha: '2026-02-20' }),
  ]

  it('excluye abonos y ordena byLab desc', () => {
    const r = analyzeFacturas(data, '', WHOLESALERS)
    expect(r.total).toBe(950)
    expect(r.count).toBe(4)
    expect(r.byLab[0]).toEqual({ lab: 'FedeFarma', amount: 500 })
    expect(r.topLab).toBe('FedeFarma')
  })

  it('filtra por categoría Mayorista', () => {
    const r = analyzeFacturas(data, 'Mayorista', WHOLESALERS)
    expect(r.total).toBe(500)
    expect(r.byLab).toEqual([{ lab: 'FedeFarma', amount: 500 }])
  })

  it('agrupa byMonth ascendente', () => {
    const r = analyzeFacturas(data, 'Laboratorio', WHOLESALERS)
    expect(r.byMonth.map((m) => m.key)).toEqual(['2026-02', '2026-03'])
    expect(r.byMonth[1].amount).toBe(350)
  })
})

describe('filterByDateRange', () => {
  const data = [
    mk({ id: 'a', fecha: '2026-01-15', fecha_vencimiento: null }),
    mk({ id: 'b', fecha: '2026-06-15', fecha_vencimiento: null }),
    mk({ id: 'c', fecha: '2026-12-15', fecha_vencimiento: null }),
  ]
  it('filtra por rango de meses', () => {
    expect(filterByDateRange(data, '2026-03', '2026-09').map((f) => f.id)).toEqual(['b'])
  })
  it('sin rango devuelve todo', () => {
    expect(filterByDateRange(data, '', '')).toHaveLength(3)
  })
})
