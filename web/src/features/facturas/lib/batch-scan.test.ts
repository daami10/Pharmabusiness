import { describe, expect, it, vi } from 'vitest'
import { zipSync } from 'fflate'
import {
  classifyScan,
  invoiceMime,
  loadTanda,
  MAX_ZIP_BYTES,
  readFolderSource,
  readZipSource,
  splitTandas,
  TANDA_SIZE,
  toFacturaInput,
  ZipTooLargeError,
} from './batch-scan'
import type { SourceEntry } from './batch-scan'
import type { OcrResult } from './ocr'

const complete: OcrResult = {
  laboratorio: 'Alfasigma',
  importe: 123.45,
  numFactura: 'F-001',
  fecha: '2026-02-10',
  vencimiento: '2026-03-10',
  esAbono: false,
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
    expect(r.missing).toEqual(['importe', 'fecha', 'vencimiento', 'num_factura', 'laboratorio'])
  })

  it('bloquea importe a 0/vacío pero NO negativo (negativo = abono)', () => {
    expect(classifyScan({ ...complete, importe: 0 }).missing).toContain('importe')
    const neg = classifyScan({ ...complete, importe: -5 })
    expect(neg.missing).not.toContain('importe')
    expect(neg.status).toBe('ready')
  })

  it('bloquea importe no numérico (NaN)', () => {
    expect(classifyScan({ ...complete, importe: NaN }).missing).toContain('importe')
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

  it('vencimiento ausente bloquea en una factura normal', () => {
    const r = classifyScan({ ...complete, vencimiento: '' })
    expect(r.status).toBe('review')
    expect(r.missing).toContain('vencimiento')
  })

  it('vencimiento ausente también bloquea en abonos (ahora vencen igual que facturas)', () => {
    const r = classifyScan({ ...complete, vencimiento: '', esAbono: true })
    expect(r.missing).toContain('vencimiento')
    expect(r.status).toBe('review')
  })

  it('acumula varios campos que faltan', () => {
    const r = classifyScan({ laboratorio: '', importe: 0, numFactura: '', fecha: '', vencimiento: '', esAbono: false })
    expect(r.status).toBe('review')
    expect(r.missing.sort()).toEqual([
      'fecha',
      'importe',
      'laboratorio',
      'num_factura',
      'vencimiento',
    ])
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

  it('importe negativo → se guarda como Abono con importe en positivo, conservando el vencimiento', () => {
    const input = toFacturaInput(
      { ...complete, importe: -30.5 },
      { category: 'Laboratorio', note: '' },
    )
    expect(input.tipo).toBe('Abono')
    expect(input.importe).toBe(30.5)
    expect(input.fecha_vencimiento).toBe('2026-03-10')
  })

  it('esAbono=true (con importe positivo) → se guarda como Abono conservando el vencimiento', () => {
    const input = toFacturaInput(
      { ...complete, importe: 30.5, esAbono: true },
      { category: 'Laboratorio', note: '' },
    )
    expect(input.tipo).toBe('Abono')
    expect(input.importe).toBe(30.5)
    expect(input.fecha_vencimiento).toBe('2026-03-10')
  })

  it('num_factura vacío → null; fecha/venc inválidas → null; importe 0 → 0', () => {
    const input = toFacturaInput(
      { laboratorio: 'X', importe: 0, numFactura: '', fecha: 'malo', vencimiento: '', esAbono: false },
      { category: 'Otro', note: '' },
    )
    expect(input.num_factura).toBeNull()
    expect(input.fecha).toBeNull()
    expect(input.fecha_vencimiento).toBeNull()
    expect(input.importe).toBe(0)
  })
})

// --- Tandas: inventario, troceado y materialización perezosa ---

const bytesOf = (s: string) => new TextEncoder().encode(s)

function makeZip(files: Record<string, string>): File {
  const packed = zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, bytesOf(v)])),
  )
  return new File([packed as BlobPart], 'facturas.zip', { type: 'application/zip' })
}

/** File como los que entrega un <input webkitdirectory>. */
function folderFile(path: string, content = 'x'): File {
  const f = new File([bytesOf(content)], path.split('/').pop() ?? path)
  Object.defineProperty(f, 'webkitRelativePath', { value: path })
  return f
}

const entry = (path: string): SourceEntry => ({ path, name: path.split('/').pop() ?? path, size: 1 })

describe('invoiceMime', () => {
  it('acepta las extensiones de factura y les asigna su mime', () => {
    expect(invoiceMime('f.jpg')).toBe('image/jpeg')
    expect(invoiceMime('f.JPEG')).toBe('image/jpeg')
    expect(invoiceMime('sub/f.png')).toBe('image/png')
    expect(invoiceMime('f.pdf')).toBe('application/pdf')
  })

  it('ignora directorios, ocultos, metadatos de macOS y otras extensiones', () => {
    expect(invoiceMime('carpeta/')).toBeNull()
    expect(invoiceMime('.oculta.jpg')).toBeNull()
    expect(invoiceMime('__MACOSX/f.jpg')).toBeNull()
    // También cuando __MACOSX no es el primer segmento (caso carpeta).
    expect(invoiceMime('facturas/__MACOSX/f.jpg')).toBeNull()
    expect(invoiceMime('notas.txt')).toBeNull()
    expect(invoiceMime('sinextension')).toBeNull()
  })
})

describe('splitTandas', () => {
  it('trocea en tandas del tamaño por defecto y deja el resto en la última', () => {
    const entries = Array.from({ length: 60 }, (_, i) => entry(`f${i}.jpg`))
    const tandas = splitTandas(entries)
    expect(tandas.map((t) => t.length)).toEqual([TANDA_SIZE, TANDA_SIZE, 60 - 2 * TANDA_SIZE])
  })

  it('conserva el orden original de las facturas', () => {
    const entries = [entry('a.jpg'), entry('b.jpg'), entry('c.jpg')]
    expect(splitTandas(entries, 2)).toEqual([[entries[0], entries[1]], [entries[2]]])
  })

  it('un lote vacío no produce ninguna tanda', () => {
    expect(splitTandas([])).toEqual([])
  })
})

describe('readZipSource', () => {
  it('inventaría el ZIP sin descomprimir, ignorando lo que no son facturas', async () => {
    const zip = makeZip({
      'a.jpg': 'aaa',
      'sub/b.pdf': 'bb',
      '__MACOSX/c.jpg': 'basura',
      'notas.txt': 'basura',
    })
    const source = await readZipSource(zip)
    expect(source.kind).toBe('zip')
    expect(source.entries.map((e) => e.path)).toEqual(['a.jpg', 'sub/b.pdf'])
    // El nombre visible es el del archivo, no la ruta completa.
    expect(source.entries[1].name).toBe('b.pdf')
    expect(source.entries[0].size).toBe(3)
  })

  it('rechaza un ZIP por encima del tope SIN llegar a leerlo en memoria', async () => {
    const big = new File([bytesOf('x')], 'big.zip')
    Object.defineProperty(big, 'size', { value: MAX_ZIP_BYTES + 1 })
    const spy = vi.spyOn(big, 'arrayBuffer')
    await expect(readZipSource(big)).rejects.toBeInstanceOf(ZipTooLargeError)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('readFolderSource', () => {
  it('usa la ruta relativa como clave y descarta lo que no son facturas', () => {
    const source = readFolderSource([
      folderFile('facturas/a.jpg'),
      folderFile('facturas/2025/b.pdf'),
      folderFile('facturas/notas.txt'),
      folderFile('facturas/__MACOSX/c.jpg'),
    ])
    expect(source.kind).toBe('folder')
    expect(source.entries.map((e) => e.path)).toEqual(['facturas/a.jpg', 'facturas/2025/b.pdf'])
  })

  it('no duplica una misma ruta', () => {
    const source = readFolderSource([folderFile('f/a.jpg'), folderFile('f/a.jpg')])
    expect(source.entries).toHaveLength(1)
  })
})

describe('loadTanda', () => {
  it('descomprime SOLO las facturas de la tanda pedida', async () => {
    const zip = makeZip({ 'a.jpg': 'AAA', 'b.jpg': 'BBB', 'c.jpg': 'CCC' })
    const source = await readZipSource(zip)
    const [tanda] = splitTandas(source.entries, 2)

    const files = loadTanda(source, tanda)
    expect(files.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg'])
    expect(files[0].type).toBe('image/jpeg')
    expect(await files[0].text()).toBe('AAA')
  })

  it('en una carpeta devuelve los File originales, sin copiarlos', () => {
    const a = folderFile('f/a.jpg')
    const b = folderFile('f/b.pdf')
    const source = readFolderSource([a, b])
    const files = loadTanda(source, source.entries)
    expect(files[0]).toBe(a)
    expect(files[1]).toBe(b)
  })
})

describe('recorrido completo del lote por tandas', () => {
  it('cubre todas las facturas exactamente una vez, sin repetir ni perder ninguna', async () => {
    const total = 120
    const contents = Object.fromEntries(
      Array.from({ length: total }, (_, i) => [`facturas/f${i}.jpg`, `factura-${i}`]),
    )
    const source = await readZipSource(makeZip(contents))
    expect(source.entries).toHaveLength(total)

    const tandas = splitTandas(source.entries)
    expect(tandas).toHaveLength(Math.ceil(total / TANDA_SIZE))

    // Se recorre tanda a tanda, como hace el modal, materializando solo cada una.
    const vistos: string[] = []
    for (const tanda of tandas) {
      const files = loadTanda(source, tanda)
      expect(files).toHaveLength(tanda.length)
      for (const f of files) vistos.push(await f.text())
    }

    expect(vistos).toHaveLength(total)
    expect(new Set(vistos).size).toBe(total)
    expect(vistos).toEqual(Array.from({ length: total }, (_, i) => `factura-${i}`))
  })
})
