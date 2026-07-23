import { unzipSync } from 'fflate'
import type { FacturaInput } from '@/types/domain'
import { scanInvoice } from './ocr'
import type { OcrResult } from './ocr'

// Subida masiva de facturas desde un ZIP (fotos o PDFs). Cada archivo se escanea
// con la IA (Gemini, vía /api/scan) y se clasifica con una "red de seguridad":
// las que la IA leyó completas se guardan directas; las que tienen campos que
// bloquean van a una mini-bandeja de revisión (opción B acordada con el usuario).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Extensiones aceptadas dentro del zip → su mime type para Gemini. */
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
}

/** Campos cuya ausencia manda la factura a revisión manual. */
export type MissingField = 'importe' | 'fecha' | 'num_factura' | 'laboratorio'

export interface BatchItem {
  fileName: string
  /** Datos extraídos por la IA; null si el escaneo falló. */
  result: OcrResult | null
  /** Mensaje de error si el escaneo de este archivo falló. */
  error?: string
  status: 'ready' | 'review'
  missing: MissingField[]
}

/**
 * Clasifica un resultado de OCR según la red de seguridad (opción B).
 * Bloquean (mandan a revisión): importe a 0/vacío, fecha vacía o inválida,
 * nº de factura vacío o nombre (laboratorio) vacío.
 * Función pura → testeable sin red ni IA.
 */
export function classifyScan(result: OcrResult | null): {
  status: 'ready' | 'review'
  missing: MissingField[]
} {
  // Escaneo fallido → todo pendiente, siempre a revisión.
  if (!result) {
    return { status: 'review', missing: ['importe', 'fecha', 'num_factura', 'laboratorio'] }
  }

  const missing: MissingField[] = []
  // Importe 0/vacío bloquea; un importe NEGATIVO es válido → se guarda como abono.
  if (result.importe === 0) missing.push('importe')
  if (!DATE_RE.test(result.fecha)) missing.push('fecha')
  if (!result.numFactura.trim()) missing.push('num_factura')
  if (!result.laboratorio.trim()) missing.push('laboratorio')

  return { status: missing.length === 0 ? 'ready' : 'review', missing }
}

/** Descomprime un ZIP en memoria y devuelve los archivos de imagen/PDF como File[]. */
export async function unzipInvoices(zipFile: File): Promise<File[]> {
  const buf = new Uint8Array(await zipFile.arrayBuffer())
  const entries = unzipSync(buf)
  const files: File[] = []

  for (const [name, bytes] of Object.entries(entries)) {
    // Saltar directorios, metadatos de macOS y archivos ocultos.
    if (name.endsWith('/')) continue
    const base = name.split('/').pop() ?? name
    if (name.startsWith('__MACOSX') || base.startsWith('.')) continue

    const ext = base.split('.').pop()?.toLowerCase() ?? ''
    const mime = MIME_BY_EXT[ext]
    if (!mime) continue // ignorar cualquier otra cosa (txt, xlsx, etc.)

    // `bytes` es un Uint8Array; File acepta BlobPart.
    files.push(new File([bytes as BlobPart], base, { type: mime }))
  }

  return files
}

/** Ejecuta `fn` sobre `items` con como máximo `limit` en paralelo, preservando el orden. */
async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

export interface ScanBatchOptions {
  /** Máximo de escaneos concurrentes (evita el rate limit de Gemini). */
  concurrency?: number
  /** Callback de progreso: (completadas, total). */
  onProgress?: (done: number, total: number) => void
}

/** Escanea todos los archivos con concurrencia limitada y los clasifica. */
export async function scanBatch(
  files: File[],
  { concurrency = 4, onProgress }: ScanBatchOptions = {},
): Promise<BatchItem[]> {
  let done = 0
  return pool(files, concurrency, async (file) => {
    let item: BatchItem
    try {
      const result = await scanInvoice(file)
      item = { fileName: file.name, result, ...classifyScan(result) }
    } catch (err) {
      item = {
        fileName: file.name,
        result: null,
        error: err instanceof Error ? err.message : 'Error al escanear',
        ...classifyScan(null),
      }
    }
    done += 1
    onProgress?.(done, files.length)
    return item
  })
}

/**
 * Construye el FacturaInput final. La categoría (`tipo`) y la nota son comunes al
 * lote. `laboratorio` puede sobreescribirse (p. ej. mayorista = nombre de la
 * categoría); si no, se usa el valor leído por la IA.
 */
export function toFacturaInput(
  result: OcrResult,
  opts: { category: string; note: string; laboratorio?: string },
): FacturaInput {
  // Un importe negativo significa que es un abono (devolución): se guarda como
  // tipo 'Abono' con el importe en positivo (los abonos se almacenan positivos y
  // el signo lo aplican los cálculos). Los abonos no tienen vencimiento.
  const isAbono = result.importe < 0
  return {
    tipo: isAbono ? 'Abono' : opts.category,
    laboratorio: (opts.laboratorio ?? result.laboratorio).trim(),
    num_factura: result.numFactura.trim() || null,
    fecha: DATE_RE.test(result.fecha) ? result.fecha : null,
    importe: Math.abs(result.importe),
    fecha_vencimiento:
      isAbono || !DATE_RE.test(result.vencimiento) ? null : result.vencimiento,
    notas: opts.note.trim(),
    pagada: false,
  }
}
