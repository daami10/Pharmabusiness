import { unzipSync } from 'fflate'
import type { FacturaInput } from '@/types/domain'
import { scanInvoice } from './ocr'
import type { OcrResult } from './ocr'

// Subida masiva de facturas desde una carpeta o un ZIP (fotos o PDFs). El lote se
// procesa por TANDAS: solo se materializan y escanean unas pocas facturas a la vez
// y cada tanda se guarda antes de pasar a la siguiente. Cada archivo se escanea con
// la IA (Gemini, vía /api/scan) y se clasifica con una "red de seguridad": las que
// la IA leyó completas se guardan directas; las que tienen campos que bloquean van
// a una mini-bandeja de revisión (opción B acordada con el usuario).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Extensiones aceptadas → su mime type para Gemini. */
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
}

/**
 * Facturas por tanda. Acota tres cosas a la vez: la memoria (solo estas se
 * descomprimen), el DOM de la bandeja de revisión y el radio de daño si el
 * guardado falla. Además, el rato que el usuario tarda en revisar una tanda deja
 * respirar el límite por minuto de Gemini.
 */
export const TANDA_SIZE = 25

/**
 * Tope de tamaño del ZIP. Un ZIP de fotos NO comprime nada (un JPEG ya viene
 * comprimido), así que el archivo entero se queda en memoria mientras dura la
 * subida. La carpeta no tiene este problema: sus File apuntan al disco y solo se
 * lee la tanda en curso, por eso es la entrada recomendada para lotes grandes.
 */
export const MAX_ZIP_BYTES = 200 * 1024 * 1024

export class ZipTooLargeError extends Error {
  /** Tamaño real del ZIP rechazado, en bytes. */
  size: number

  constructor(size: number) {
    super(`ZIP demasiado grande: ${Math.round(size / 1048576)} MB`)
    this.name = 'ZipTooLargeError'
    this.size = size
  }
}

/** Una factura del lote, todavía sin descomprimir ni leer del disco. */
export interface SourceEntry {
  /** Clave única dentro de la fuente (ruta dentro del ZIP o de la carpeta). */
  path: string
  /** Nombre visible del archivo. */
  name: string
  /** Tamaño original en bytes. */
  size: number
}

/** Origen del lote: un ZIP en memoria o una carpeta (File respaldados por disco). */
export type BatchSource =
  | { kind: 'zip'; entries: SourceEntry[]; buffer: Uint8Array }
  | { kind: 'folder'; entries: SourceEntry[]; files: Map<string, File> }

/** Campos cuya ausencia manda la factura a revisión manual. */
export type MissingField =
  | 'importe'
  | 'fecha'
  | 'vencimiento'
  | 'num_factura'
  | 'laboratorio'

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
    return {
      status: 'review',
      missing: ['importe', 'fecha', 'vencimiento', 'num_factura', 'laboratorio'],
    }
  }

  const missing: MissingField[] = []
  // Importe 0/vacío o no numérico (NaN) bloquea; un importe NEGATIVO es válido
  // → se guarda como abono.
  if (result.importe === 0 || Number.isNaN(result.importe)) missing.push('importe')
  if (!DATE_RE.test(result.fecha)) missing.push('fecha')
  // El vencimiento es obligatorio en facturas y abonos (marca cuándo pagar/cobrar
  // y se usa en el calendario).
  if (!DATE_RE.test(result.vencimiento)) missing.push('vencimiento')
  if (!result.numFactura.trim()) missing.push('num_factura')
  if (!result.laboratorio.trim()) missing.push('laboratorio')

  return { status: missing.length === 0 ? 'ready' : 'review', missing }
}

/**
 * Devuelve el mime type si la ruta es una factura admitida, o null si hay que
 * ignorarla (directorios, metadatos de macOS, ocultos y cualquier otra extensión).
 */
export function invoiceMime(path: string): string | null {
  if (path.endsWith('/')) return null
  const parts = path.split('/')
  if (parts.includes('__MACOSX')) return null
  const base = parts.pop() ?? path
  if (base.startsWith('.')) return null
  const ext = base.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? null
}

/**
 * Lee el índice de un ZIP SIN descomprimir nada: fflate llama al filtro para cada
 * entrada y, devolviendo false, no infla ni un byte. Así se sabe cuántas facturas
 * hay (y cuánto pesan) antes de gastar una sola llamada a la IA.
 */
export async function readZipSource(zipFile: File): Promise<BatchSource> {
  // El tamaño se comprueba ANTES de leer: arrayBuffer() copiaría el archivo entero
  // a memoria, que es justo lo que hay que evitar con un ZIP enorme.
  if (zipFile.size > MAX_ZIP_BYTES) throw new ZipTooLargeError(zipFile.size)

  const buffer = new Uint8Array(await zipFile.arrayBuffer())
  const entries: SourceEntry[] = []
  unzipSync(buffer, {
    filter: (f) => {
      if (invoiceMime(f.name)) {
        entries.push({
          path: f.name,
          name: f.name.split('/').pop() ?? f.name,
          size: f.originalSize,
        })
      }
      return false // nunca se descomprime aquí: esto es solo el inventario
    },
  })
  return { kind: 'zip', entries, buffer }
}

/**
 * Construye la fuente a partir de una carpeta elegida por el usuario. Los File ya
 * apuntan al disco, así que no hay que descomprimir nada ni acotar el tamaño: el
 * navegador solo carga en memoria el archivo que se está leyendo.
 */
export function readFolderSource(picked: File[]): BatchSource {
  const files = new Map<string, File>()
  const entries: SourceEntry[] = []
  for (const f of picked) {
    const path = f.webkitRelativePath || f.name
    if (!invoiceMime(path) || files.has(path)) continue
    files.set(path, f)
    entries.push({ path, name: f.name, size: f.size })
  }
  return { kind: 'folder', entries, files }
}

/** Parte el lote en tandas del tamaño indicado, conservando el orden. */
export function splitTandas(entries: SourceEntry[], size = TANDA_SIZE): SourceEntry[][] {
  const out: SourceEntry[][] = []
  for (let i = 0; i < entries.length; i += size) out.push(entries.slice(i, i + size))
  return out
}

/**
 * Materializa SOLO las facturas de una tanda. En un ZIP se descomprimen únicamente
 * esas entradas (el resto se queda comprimido); en una carpeta los File ya sirven
 * tal cual.
 */
export function loadTanda(source: BatchSource, tanda: SourceEntry[]): File[] {
  if (source.kind === 'folder') {
    return tanda
      .map((e) => source.files.get(e.path))
      .filter((f): f is File => f !== undefined)
  }

  const wanted = new Set(tanda.map((e) => e.path))
  const unzipped = unzipSync(source.buffer, { filter: (f) => wanted.has(f.name) })
  const files: File[] = []
  for (const e of tanda) {
    const bytes = unzipped[e.path]
    if (!bytes) continue
    // `bytes` es un Uint8Array; File acepta BlobPart.
    files.push(
      new File([bytes as BlobPart], e.name, {
        type: invoiceMime(e.path) ?? 'application/octet-stream',
      }),
    )
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
  // Es un abono (devolución) si la IA lo marcó (esAbono) o si el importe salió
  // negativo (fallback). Se guarda como tipo 'Abono' con el importe en positivo
  // (los abonos se almacenan positivos y el signo lo aplican los cálculos). Los
  // abonos también conservan su vencimiento (se muestran en el calendario).
  const isAbono = result.esAbono === true || result.importe < 0
  return {
    tipo: isAbono ? 'Abono' : opts.category,
    laboratorio: (opts.laboratorio ?? result.laboratorio).trim(),
    num_factura: result.numFactura.trim() || null,
    fecha: DATE_RE.test(result.fecha) ? result.fecha : null,
    importe: Math.abs(result.importe),
    fecha_vencimiento: DATE_RE.test(result.vencimiento) ? result.vencimiento : null,
    notas: opts.note.trim(),
    pagada: false,
  }
}
