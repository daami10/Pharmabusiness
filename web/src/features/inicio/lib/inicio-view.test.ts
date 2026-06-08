import { describe, expect, it } from 'vitest'
import { buildPrevision, computeInicioKpis } from './inicio-view'
import type { DataSets } from './inicio-view'
import type { Factura, Fiscal, Nomina, Seguro } from '@/types/domain'

const factura = (over: Partial<Factura>): Factura => ({
  id: 'f',
  user_id: 'u',
  tipo: 'Laboratorio',
  laboratorio: 'X',
  num_factura: null,
  fecha: null,
  importe: 0,
  fecha_vencimiento: null,
  notas: null,
  pagada: false,
  ...over,
})
const fiscal = (over: Partial<Fiscal>): Fiscal => ({
  id: 't',
  user_id: 'u',
  concepto: 'Otros',
  fecha: '2026-01-01',
  importe: 0,
  notas: null,
  ...over,
})
const nomina = (over: Partial<Nomina>): Nomina => ({
  id: 'n',
  user_id: 'u',
  trabajador_id: null,
  trabajador_nombre: 'A',
  fecha: '2026-01-01',
  importe: 0,
  concepto: null,
  ...over,
})
const seguro = (over: Partial<Seguro>): Seguro => ({
  id: 's',
  user_id: 'u',
  fecha: '2026-01-01',
  importe: 0,
  notas: null,
  ...over,
})

describe('computeInicioKpis', () => {
  it('cuenta facturas que vencen o se pagaron en el mes, abonos, fiscal y trabajadores', () => {
    const data: DataSets = {
      facturas: [
        factura({ id: '1', fecha_vencimiento: '2026-06-20', importe: 100 }), // vence en junio
        factura({ id: '2', pagada: true, fecha: '2026-06-05', importe: 50 }), // pagada en junio
        factura({ id: '3', fecha_vencimiento: '2026-07-01', importe: 999 }), // otro mes
        factura({ id: '4', tipo: 'Abono', fecha: '2026-06-10', importe: 30 }),
      ],
      fiscal: [fiscal({ fecha: '2026-06-01', importe: 200 })],
      nominas: [nomina({ fecha: '2026-06-01', importe: 1500 })],
      seguros: [seguro({ fecha: '2026-06-01', importe: 400 })],
    }
    const k = computeInicioKpis(data, '2026-06')
    expect(k.facturas).toEqual({ total: 150, count: 2 })
    expect(k.abonos).toEqual({ total: 30, count: 1 })
    expect(k.fiscal).toEqual({ total: 200, count: 1 })
    expect(k.trabajadores).toEqual({ total: 1900, nominas: 1, seguros: 1 })
  })
})

describe('buildPrevision', () => {
  it('agrupa futuros por mes e ignora pagadas/abonos/pasados', () => {
    const data: DataSets = {
      facturas: [
        factura({ id: '1', fecha_vencimiento: '2026-08-10', importe: 100 }), // futuro
        factura({ id: '2', fecha_vencimiento: '2026-08-20', importe: 50, pagada: true }), // pagada → fuera
        factura({ id: '3', fecha_vencimiento: '2026-03-01', importe: 70 }), // pasado → fuera
      ],
      fiscal: [fiscal({ fecha: '2026-09-01', importe: 300 })],
      nominas: [nomina({ fecha: '2026-08-01', importe: 1500 })],
      seguros: [],
    }
    const sections = buildPrevision(data, 2026, 6) // ahora = junio 2026
    expect(sections.map((s) => s.key)).toEqual(['2026-08', '2026-09'])
    const aug = sections[0]
    expect(aug.invoices.map((f) => f.id)).toEqual(['1'])
    expect(aug.payrolls).toHaveLength(1)
    expect(aug.total).toBe(1600)
    expect(sections[1].total).toBe(300)
  })
})
