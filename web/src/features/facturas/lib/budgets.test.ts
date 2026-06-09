import { describe, expect, it } from 'vitest'
import { computeBudgetAlerts } from './budgets'
import type { Factura } from '@/types/domain'

const mk = (over: Partial<Factura>): Factura => ({
  id: '1',
  user_id: 'u',
  tipo: 'Laboratorio',
  laboratorio: 'Cinfa',
  num_factura: null,
  fecha: '2026-03-01',
  importe: 100,
  fecha_vencimiento: null,
  notas: null,
  pagada: false,
  ...over,
})

describe('computeBudgetAlerts', () => {
  it('sin presupuestos no hay alertas', () => {
    expect(computeBudgetAlerts([mk({})], {})).toEqual([])
  })

  it('alerta cuando el gasto supera el límite', () => {
    const facturas = [
      mk({ laboratorio: 'Cinfa', importe: 600 }),
      mk({ laboratorio: 'Cinfa', importe: 500 }),
      mk({ laboratorio: 'Kern', importe: 200 }),
    ]
    const alerts = computeBudgetAlerts(facturas, { Cinfa: 1000, Kern: 500 })
    expect(alerts).toEqual([{ lab: 'Cinfa', spent: 1100, limit: 1000 }])
  })

  it('los abonos restan al gasto del laboratorio', () => {
    const facturas = [
      mk({ laboratorio: 'Cinfa', importe: 1200 }),
      mk({ laboratorio: 'Cinfa', tipo: 'Abono', importe: 300 }),
    ]
    // 1200 - 300 = 900, por debajo del límite → sin alerta
    expect(computeBudgetAlerts(facturas, { Cinfa: 1000 })).toEqual([])
  })

  it('gasto igual al límite no dispara alerta (estricto >)', () => {
    expect(
      computeBudgetAlerts([mk({ laboratorio: 'Cinfa', importe: 1000 })], { Cinfa: 1000 }),
    ).toEqual([])
  })
})
