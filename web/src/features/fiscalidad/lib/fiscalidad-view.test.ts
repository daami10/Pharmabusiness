import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fiscalKpis, groupFiscalByMonth } from './fiscalidad-view'
import type { Fiscal } from '@/types/domain'

const mk = (over: Partial<Fiscal>): Fiscal => ({
  id: '1',
  user_id: 'u',
  concepto: 'Otros',
  fecha: '2026-02-01',
  importe: 100,
  notas: null,
  ...over,
})

describe('fiscalidad-view', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('fiscalKpis suma por concepto y excluye futuros', () => {
    const k = fiscalKpis([
      mk({ concepto: 'Cuota de Autónomos', fecha: '2026-03-01', importe: 300 }),
      mk({ concepto: 'Impuesto de Sociedades', fecha: '2026-04-01', importe: 500 }),
      mk({ concepto: 'Declaración de la Renta', fecha: '2026-05-01', importe: 200 }),
      mk({ concepto: 'Cuota de Autónomos', fecha: '2026-12-01', importe: 999 }), // futuro → excluido
    ])
    expect(k.total).toBe(1000)
    expect(k.autonomo).toBe(300)
    expect(k.renta).toBe(700)
  })

  it('fiscalKpis incluye IRPF en el KPI de renta (paridad legacy)', () => {
    const k = fiscalKpis([
      mk({ concepto: 'Declaración de la Renta', fecha: '2026-05-01', importe: 200 }),
      mk({ concepto: 'IRPF', fecha: '2026-04-01', importe: 150 }),
    ])
    expect(k.total).toBe(350)
    expect(k.renta).toBe(350)
  })

  it('groupFiscalByMonth ordena desc y marca futuros', () => {
    const groups = groupFiscalByMonth([
      mk({ fecha: '2026-03-01' }),
      mk({ fecha: '2026-12-01' }),
    ])
    expect(groups.map((g) => g.key)).toEqual(['2026-12', '2026-03'])
    expect(groups[0].isFuture).toBe(true)
    expect(groups[0].countLabel).toBe('1 previsto')
    expect(groups[1].countLabel).toBe('1 pago')
  })
})
