import { describe, expect, it } from 'vitest'
import { buildFacturasCSV } from './csv'
import type { Factura } from '@/types/domain'

const factura: Factura = {
  id: '1',
  user_id: 'u',
  tipo: 'Laboratorio',
  laboratorio: 'Alfa "X"',
  num_factura: 'F-1',
  fecha: '2026-02-10',
  importe: 100.5,
  fecha_vencimiento: null,
  notas: null,
  pagada: true,
}

describe('buildFacturasCSV', () => {
  const dummyT = (_key: string, fallback: string) => fallback
  const csv = buildFacturasCSV([factura], dummyT)

  it('empieza con BOM y la directiva sep=', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('sep=,')
  })
  it('incluye la fila de cabeceras', () => {
    expect(csv).toContain(
      'Fecha,Laboratorio,Tipo,Nº Factura,Importe,Fecha Vencimiento,Pagada,Notas',
    )
  })
  it('escapa las comillas dobles y formatea el booleano pagada', () => {
    expect(csv).toContain('"Alfa ""X"""')
    expect(csv).toContain('"Sí"')
  })
})
