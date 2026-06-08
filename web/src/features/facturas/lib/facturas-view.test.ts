import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  filterFacturas,
  getEffectiveVencStatus,
  groupByMonth,
  netTotal,
} from './facturas-view'
import type { Factura } from '@/types/domain'

const base: Factura = {
  id: '1',
  user_id: 'u',
  tipo: 'Laboratorio',
  laboratorio: 'Alfasigma',
  num_factura: 'F-001',
  fecha: '2026-02-10',
  importe: 100,
  fecha_vencimiento: null,
  notas: null,
  pagada: false,
}

const mk = (over: Partial<Factura>): Factura => ({ ...base, ...over })

const WHOLESALERS = ['FedeFarma', 'Cofares']

describe('getEffectiveVencStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('abono → none', () => {
    expect(getEffectiveVencStatus(mk({ tipo: 'Abono' }))).toBe('none')
  })
  it('sin fecha de vencimiento → paid', () => {
    expect(getEffectiveVencStatus(mk({ fecha_vencimiento: null }))).toBe('paid')
  })
  it('con vencimiento pasado e impagada → overdue', () => {
    expect(getEffectiveVencStatus(mk({ fecha_vencimiento: '2026-01-01' }))).toBe(
      'overdue',
    )
  })
})

describe('filterFacturas', () => {
  const data = [
    mk({ id: 'a', tipo: 'Laboratorio', laboratorio: 'Alfasigma', fecha: '2026-02-10' }),
    mk({ id: 'b', tipo: 'FedeFarma', laboratorio: 'FedeFarma', fecha: '2026-03-01' }),
    mk({ id: 'c', tipo: 'Otro', laboratorio: 'Sergio', fecha: '2025-12-01' }),
    mk({ id: 'd', tipo: 'Abono', laboratorio: 'Kenvue', fecha: '2026-04-01' }),
  ]
  const filters = {
    year: '2026',
    search: '',
    category: '' as const,
    vencStatus: '' as const,
  }

  it('filtra por año', () => {
    const r = filterFacturas(data, filters, WHOLESALERS)
    expect(r.map((f) => f.id).sort()).toEqual(['a', 'b', 'd'])
  })
  it('categoría Mayorista incluye los tipos de mayorista configurados', () => {
    const r = filterFacturas(data, { ...filters, category: 'Mayorista' }, WHOLESALERS)
    expect(r.map((f) => f.id)).toEqual(['b'])
  })
  it('búsqueda por laboratorio', () => {
    const r = filterFacturas(data, { ...filters, search: 'alfa' }, WHOLESALERS)
    expect(r.map((f) => f.id)).toEqual(['a'])
  })
})

describe('groupByMonth', () => {
  it('agrupa y ordena descendente, restando abonos en el total', () => {
    const groups = groupByMonth([
      mk({ id: '1', fecha: '2026-02-10', importe: 100, tipo: 'Laboratorio' }),
      mk({ id: '2', fecha: '2026-02-20', importe: 30, tipo: 'Abono' }),
      mk({ id: '3', fecha: '2026-03-01', importe: 50, tipo: 'Laboratorio' }),
    ])
    expect(groups.map((g) => g.key)).toEqual(['2026-03', '2026-02'])
    expect(groups[1].total).toBe(70) // 100 - 30
    expect(groups[1].label).toBe('Febrero 2026')
  })
})

describe('netTotal', () => {
  it('resta los abonos', () => {
    expect(netTotal([mk({ importe: 100 }), mk({ tipo: 'Abono', importe: 40 })])).toBe(60)
  })
})
