import { describe, expect, it } from 'vitest'
import { classifyScan, toFacturaInput } from './batch-scan'
import type { OcrResult } from './ocr'

const complete: OcrResult = {
  laboratorio: 'Alfasigma',
  importe: 123.45,
  numFactura: 'F-001',
  fecha: '2026-02-10',
  vencimiento: '2026-03-10',
}

describe('classifyScan', () => {
  it('marca "ready" cuando todos los campos que bloquean están presentes', () => {
    const r = classifyScan(complete)
    expect(r.status).toBe('ready')
    expect(r.missing).toEqual([])
  })

  it('un escaneo fallido (null) siempre va a revisión con todo pendiente', () => {
    const r = classifyScan(null)
    expect(r.status).toBe('review')
    expect(r.missing).toEqual(['importe', 'fecha', 'num_factura', 'laboratorio'])
  })

  it('bloquea importe a 0 o negativo', () => {
    expect(classifyScan({ ...complete, importe: 0 }).missing).toContain('importe')
    expect(classifyScan({ ...complete, importe: -5 }).missing).toContain('importe')
  })

  it('bloquea fecha vacía o con formato inválido', () => {
    expect(classifyScan({ ...complete, fecha: '' }).missing).toContain('fecha')
    expect(classifyScan({ ...complete, fecha: '10/02/2026' }).missing).toContain('fecha')
  })

  it('bloquea nº de factura vacío (o solo espacios)', () => {
    expect(classifyScan({ ...complete, numFactura: '' }).missing).toContain('num_factura')
    expect(classifyScan({ ...complete, numFactura: '   ' }).missing).toContain('num_factura')
  })

  it('bloquea nombre (laboratorio) vacío', () => {
    expect(classifyScan({ ...complete, laboratorio: '' }).missing).toContain('laboratorio')
  })

  it('vencimiento ausente NO bloquea (no está en la lista)', () => {
    const r = classifyScan({ ...complete, vencimiento: '' })
    expect(r.status).toBe('ready')
    expect(r.missing).toEqual([])
  })

  it('acumula varios campos que faltan', () => {
    const r = classifyScan({ laboratorio: '', importe: 0, numFactura: '', fecha: '', vencimiento: '' })
    expect(r.status).toBe('review')
    expect(r.missing.sort()).toEqual(['fecha', 'importe', 'laboratorio', 'num_factura'])
  })
})

describe('toFacturaInput', () => {
  it('aplica categoría y nota comunes, y normaliza los campos', () => {
    const input = toFacturaInput(complete, { category: 'Laboratorio', note: '  lote enero  ' })
    expect(input).toEqual({
      tipo: 'Laboratorio',
      laboratorio: 'Alfasigma',
      num_factura: 'F-001',
      fecha: '2026-02-10',
      importe: 123.45,
      fecha_vencimiento: '2026-03-10',
      notas: 'lote enero',
      pagada: false,
    })
  })

  it('permite sobreescribir laboratorio (caso mayorista = nombre de la categoría)', () => {
    const input = toFacturaInput(complete, { category: 'FedeFarma', note: '', laboratorio: 'FedeFarma' })
    expect(input.tipo).toBe('FedeFarma')
    expect(input.laboratorio).toBe('FedeFarma')
  })

  it('num_factura vacío → null; fecha/venc inválidas → null; importe<=0 → 0', () => {
    const input = toFacturaInput(
      { laboratorio: 'X', importe: 0, numFactura: '', fecha: 'malo', vencimiento: '' },
      { category: 'Otro', note: '' },
    )
    expect(input.num_factura).toBeNull()
    expect(input.fecha).toBeNull()
    expect(input.fecha_vencimiento).toBeNull()
    expect(input.importe).toBe(0)
  })
})
