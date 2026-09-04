import { useCallback, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, FolderOpen, Sparkles, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { useTranslation } from '@/lib/i18n'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCreateFacturas } from '@/lib/queries/facturas'
import { isWholesaler } from '@/lib/config/wholesalers'
import { isReservedCategory } from '@/lib/config/categories'
import {
  classifyScan,
  loadTanda,
  MAX_ZIP_BYTES,
  readFolderSource,
  readZipSource,
  scanBatch,
  splitTandas,
  TANDA_SIZE,
  toFacturaInput,
  ZipTooLargeError,
} from './lib/batch-scan'
import type { BatchSource, SourceEntry } from './lib/batch-scan'
import type { FacturaInput } from '@/types/domain'

// Subida masiva desde una carpeta o un ZIP (fotos/PDFs). Categoría + nota comunes
// al lote. El lote se procesa por TANDAS de TANDA_SIZE: se escanea una tanda, el
// usuario la revisa y se guarda antes de pasar a la siguiente. Así la memoria y la
// bandeja quedan acotadas, y lo ya guardado no se pierde si algo falla a mitad.
// Las facturas que la IA lee completas se guardan directas; las dudosas se editan
// en la mini-bandeja antes de guardar (opción B: red de seguridad).

const NEW_CATEGORY = '__new__'

interface EditRow {
  key: number
  fileName: string
  scanError?: string
  laboratorio: string
  numFactura: string
  importe: string
  fecha: string
  vencimiento: string
  esAbono: boolean
  discarded: boolean
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

// text-2xs/3xs no están definidos en este proyecto (no generan CSS), así que se
// usa un tamaño explícito pequeño y real.
const fieldLabelCls = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500'

const pickerCls =
  'flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed p-4 text-center transition-colors'

export function BulkUploadModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { activeOrgId } = useAuth()
  const wholesalers = useWholesalersStore((s) => s.wholesalers)
  const categories = useCategoriesStore((s) => s.categories)
  const addCategory = useCategoriesStore((s) => s.addCategory)
  const createFacturas = useCreateFacturas()

  const [step, setStep] = useState<'config' | 'scanning' | 'review' | 'done'>('config')

  // El origen y las tandas viven en refs: el buffer del ZIP puede pesar cientos de
  // MB y no debe entrar en el estado de React (provocaría copias en cada render).
  const sourceRef = useRef<BatchSource | null>(null)
  const tandasRef = useRef<SourceEntry[][]>([])
  const categorySavedRef = useRef(false)

  const [pickLabel, setPickLabel] = useState('')
  const [pickCount, setPickCount] = useState(0)
  const [pickTandas, setPickTandas] = useState(0)

  const [categorySel, setCategorySel] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [note, setNote] = useState('')

  const [tandaIndex, setTandaIndex] = useState(0)
  const [totalTandas, setTotalTandas] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [rows, setRows] = useState<EditRow[]>([])
  const [error, setError] = useState('')

  // Categoría efectiva (texto libre → soporta personalizadas).
  const category =
    categorySel === NEW_CATEGORY ? newCategory.trim() : categorySel.trim()
  const isWholesalerCat = isWholesaler(category, wholesalers)

  // webkitdirectory no está en los tipos de React; se pone como atributo suelto.
  const folderInputRef = useCallback((el: HTMLInputElement | null) => {
    if (!el) return
    el.setAttribute('webkitdirectory', '')
    el.setAttribute('directory', '')
  }, [])

  function resetAll() {
    setStep('config')
    sourceRef.current = null
    tandasRef.current = []
    categorySavedRef.current = false
    setPickLabel('')
    setPickCount(0)
    setPickTandas(0)
    setCategorySel('')
    setNewCategory('')
    setNote('')
    setTandaIndex(0)
    setTotalTandas(0)
    setSavedCount(0)
    setTotalCount(0)
    setProgress({ done: 0, total: 0 })
    setRows([])
    setError('')
  }

  function handleClose() {
    resetAll()
    onClose()
  }

  function clearPick() {
    sourceRef.current = null
    setPickLabel('')
    setPickCount(0)
    setPickTandas(0)
  }

  async function pickZip(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!f) return
    setError('')
    try {
      // Solo lee el índice del ZIP: no descomprime ni una factura todavía.
      const source = await readZipSource(f)
      if (source.entries.length === 0) {
        clearPick()
        setError(t('bulk.error.no_files', 'El ZIP no contiene imágenes ni PDFs.'))
        return
      }
      sourceRef.current = source
      setPickLabel(f.name)
      setPickCount(source.entries.length)
      setPickTandas(splitTandas(source.entries).length)
    } catch (err) {
      clearPick()
      if (err instanceof ZipTooLargeError) {
        setError(
          t(
            'bulk.error.zip_too_big',
            `Este ZIP pesa ${Math.round(err.size / 1048576)} MB y el máximo es ${Math.round(
              MAX_ZIP_BYTES / 1048576,
            )} MB. Divídelo en varios, o mejor: sube la carpeta directamente (sin límite).`,
          ),
        )
      } else {
        setError(t('bulk.error.bad_zip', 'No se pudo abrir el ZIP. ¿Está dañado?'))
      }
    }
  }

  function pickFolder(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (list.length === 0) return
    setError('')
    const source = readFolderSource(list)
    if (source.entries.length === 0) {
      clearPick()
      setError(t('bulk.error.no_files_folder', 'La carpeta no contiene imágenes ni PDFs.'))
      return
    }
    sourceRef.current = source
    const folderName = list[0].webkitRelativePath?.split('/')[0] ?? ''
    setPickLabel(folderName || t('bulk.folder_picked', 'Carpeta seleccionada'))
    setPickCount(source.entries.length)
    setPickTandas(splitTandas(source.entries).length)
  }

  /** Escanea la tanda `i`: materializa solo esos archivos y los pasa por la IA. */
  async function scanTanda(i: number) {
    const source = sourceRef.current
    const tanda = tandasRef.current[i]
    if (!source || !tanda) return

    setTandaIndex(i)
    setStep('scanning')
    setProgress({ done: 0, total: tanda.length })

    let files: File[]
    try {
      files = loadTanda(source, tanda)
    } catch {
      setError(t('bulk.error.bad_zip', 'No se pudo abrir el ZIP. ¿Está dañado?'))
      setStep('config')
      return
    }

    const items = await scanBatch(files, {
      concurrency: 4,
      onProgress: (done, total) => setProgress({ done, total }),
    })

    // Para mayoristas, el nombre = la categoría; si no, lo que leyó la IA.
    setRows(
      items.map((it, idx) => ({
        key: idx,
        fileName: it.fileName,
        scanError: it.error,
        laboratorio: isWholesalerCat
          ? category
          : (it.result?.laboratorio ?? ''),
        numFactura: it.result?.numFactura ?? '',
        // El importe se muestra siempre en positivo (magnitud); el signo/abono se
        // captura aparte en esAbono.
        importe: it.result && it.result.importe !== 0 ? String(Math.abs(it.result.importe)) : '',
        fecha: it.result?.fecha ?? '',
        vencimiento: it.result?.vencimiento ?? '',
        // Abono si la IA lo marcó (esAbono) o si el importe salió negativo (fallback).
        esAbono: (it.result?.esAbono ?? false) || (it.result ? it.result.importe < 0 : false),
        discarded: false,
      })),
    )
    setStep('review')
  }

  async function startScan() {
    setError('')
    const source = sourceRef.current
    if (!source) {
      setError(t('bulk.error.no_source', 'Selecciona una carpeta o un archivo ZIP.'))
      return
    }
    if (!category) {
      setError(t('bulk.error.no_category', 'Elige o escribe una categoría para el lote.'))
      return
    }
    // Categoría nueva: validar el nombre, pero NO persistirla todavía. Solo se
    // guarda en la organización cuando se guarda la primera tanda (en save()), para
    // que cancelar la subida no deje una categoría huérfana.
    if (categorySel === NEW_CATEGORY && isReservedCategory(category, wholesalers)) {
      setError(t('categories.error.reserved', 'Ese nombre ya es una categoría de sistema o un mayorista.'))
      return
    }

    const tandas = splitTandas(source.entries)
    tandasRef.current = tandas
    categorySavedRef.current = false
    setTotalTandas(tandas.length)
    setTotalCount(source.entries.length)
    setSavedCount(0)
    await scanTanda(0)
  }

  function updateRow(key: number, patch: Partial<EditRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  // Clasifica una fila con sus valores actuales (recalcula en vivo mientras se edita).
  function rowMissing(r: EditRow) {
    return classifyScan({
      laboratorio: r.laboratorio,
      importe: Number(r.importe.replace(',', '.')) || 0,
      numFactura: r.numFactura,
      fecha: r.fecha,
      vencimiento: r.vencimiento,
      esAbono: r.esAbono,
    }).missing
  }

  const active = rows.filter((r) => !r.discarded)
  const pending = active.filter((r) => rowMissing(r).length > 0)
  const readyCount = active.length - pending.length
  const isLastTanda = tandaIndex >= totalTandas - 1
  // Se puede continuar aunque no quede ninguna activa (todas descartadas): la
  // tanda simplemente se salta.
  const canSave = pending.length === 0

  /** Guarda la tanda actual y encadena con la siguiente (o termina). */
  async function save() {
    setError('')
    const inputs: FacturaInput[] = active.map((r) =>
      toFacturaInput(
        {
          laboratorio: r.laboratorio,
          importe: Number(r.importe.replace(',', '.')) || 0,
          numFactura: r.numFactura,
          fecha: r.fecha,
          vencimiento: r.vencimiento,
          esAbono: r.esAbono,
        },
        { category, note, laboratorio: r.laboratorio },
      ),
    )
    try {
      if (inputs.length > 0) {
        await createFacturas.mutateAsync(inputs)
      }
      // La categoría nueva solo se persiste con la primera tanda ya guardada.
      if (categorySel === NEW_CATEGORY && !categorySavedRef.current) {
        await addCategory(category, activeOrgId)
        categorySavedRef.current = true
      }
      setSavedCount((n) => n + inputs.length)

      const next = tandaIndex + 1
      if (next < tandasRef.current.length) {
        await scanTanda(next)
      } else {
        setStep('done')
      }
    } catch (e) {
      // Se queda en la tanda actual: lo guardado en tandas anteriores se conserva.
      setError(e instanceof Error ? e.message : t('general.save_error', 'Error al guardar'))
    }
  }

  const customOptions = useMemo(
    () => categories.filter((c) => c && !wholesalers.includes(c)),
    [categories, wholesalers],
  )

  const tandaLabel = `${t('bulk.tanda', 'Tanda')} ${tandaIndex + 1} ${t('general.de', 'de')} ${totalTandas} · ${savedCount} ${t('general.de', 'de')} ${totalCount} ${t('bulk.saved', 'guardadas')}`

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('bulk.title', 'Subida masiva de facturas')}
      size="2xl"
    >
      {step === 'config' && (
        <div className="space-y-5">
          <p className="text-sm text-slate-400">
            {t(
              'bulk.intro',
              `Sube una carpeta o un ZIP con fotos o PDFs. La IA extraerá los datos de cada factura y te las irá presentando en tandas de ${TANDA_SIZE} para que las revises y guardes.`,
            )}
          </p>

          {/* Origen: carpeta (recomendada, sin límite) o ZIP */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className={`${pickerCls} border-accent-blue/30 bg-accent-blue/5 hover:bg-accent-blue/10`}>
              <FolderOpen className="h-6 w-6 text-accent-blue" />
              <span className="text-sm font-semibold text-accent-blue">
                {t('bulk.pick_folder', 'Seleccionar carpeta')}
              </span>
              <span className="text-xs text-slate-500">
                {t('bulk.folder_hint', 'Recomendado · sin límite de facturas')}
              </span>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={pickFolder}
              />
            </label>

            <label className={`${pickerCls} border-white/10 bg-white/[0.02] hover:bg-white/5`}>
              <FileUp className="h-6 w-6 text-slate-400" />
              <span className="text-sm font-semibold text-slate-300">
                {t('bulk.pick_zip', 'Seleccionar archivo ZIP')}
              </span>
              <span className="text-xs text-slate-500">
                {t('bulk.zip_hint_max', `Máximo ${Math.round(MAX_ZIP_BYTES / 1048576)} MB`)}
              </span>
              <input
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={pickZip}
              />
            </label>
          </div>

          {pickCount > 0 && (
            <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                <span className="font-semibold">{pickCount}</span>{' '}
                {t('bulk.detected', 'facturas detectadas en')} {pickLabel} ·{' '}
                {pickTandas}{' '}
                {t('bulk.tandas_of', `tandas de ${TANDA_SIZE}`)}
              </span>
            </p>
          )}

          {/* Categoría común */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              {t('bulk.category_label', 'Categoría para todas las facturas del lote')}
            </label>
            <select
              value={categorySel}
              onChange={(e) => setCategorySel(e.target.value)}
              className={inputCls}
            >
              <option value="">{t('facturas.placeholder.select_category', 'Seleccionar categoría…')}</option>
              <option value="Laboratorio">{t('general.laboratorio', 'Laboratorio')}</option>
              {wholesalers.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
              <option value="Otro">{t('general.otro', 'Otro')}</option>
              {customOptions.length > 0 && (
                <optgroup label={t('bulk.custom_group', 'Personalizadas')}>
                  {customOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              )}
              <option value={NEW_CATEGORY}>
                ➕ {t('bulk.new_category', 'Nueva categoría…')}
              </option>
            </select>
            {categorySel === NEW_CATEGORY && (
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder={t('bulk.new_category_ph', 'Nombre de la nueva categoría')}
                className={`${inputCls} mt-2`}
                autoFocus
              />
            )}
          </div>

          {/* Nota común */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              {t('bulk.note_label', 'Nota común (opcional)')}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
              placeholder={t('bulk.note_ph', 'Se añadirá a todas las facturas del lote')}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
            >
              {t('general.cancelar', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={startScan}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500"
            >
              <Sparkles className="h-4 w-4" />
              {t('bulk.scan_button', 'Escanear lote')}
            </button>
          </div>
        </div>
      )}

      {step === 'scanning' && (
        <div className="space-y-4 py-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 animate-pulse text-accent-blue" />
          <p className="text-sm font-semibold text-slate-200">
            {t('bulk.scanning', 'Analizando facturas con IA…')}
          </p>
          <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-accent-blue transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {progress.done} / {progress.total}
          </p>
          {totalTandas > 1 && <p className="text-xs text-slate-500">{tandaLabel}</p>}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          {/* Progreso global del lote */}
          {totalTandas > 1 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-400">{tandaLabel}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-accent-blue transition-all"
                  style={{ width: `${totalCount ? (savedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {readyCount} {t('bulk.ready', 'listas')}
            </span>
            {pending.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {pending.length} {t('bulk.need_review', 'por revisar')}
              </span>
            )}
          </div>

          {pending.length > 0 && (
            <p className="text-xs text-slate-400">
              {t(
                'bulk.review_hint',
                'Completa los campos resaltados. Las demás se guardarán automáticamente.',
              )}
            </p>
          )}

          {/* Filas a revisar (editables) */}
          <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
            {active.map((r) => {
              const missing = rowMissing(r)
              const ok = missing.length === 0
              const importeNum = Number(r.importe.replace(',', '.')) || 0
              const isAbonoRow = r.esAbono || importeNum < 0
              return (
                <div
                  key={r.key}
                  className={`rounded-xl border p-3 ${
                    ok
                      ? 'border-emerald-500/15 bg-emerald-500/5'
                      : 'border-amber-500/25 bg-amber-500/5'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-slate-300" title={r.fileName}>
                      {ok ? (
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-400" />
                      )}
                      {r.fileName}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {isAbonoRow && (
                        <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-2xs font-bold text-emerald-400">
                          {t('bulk.abono_tag', 'Abono')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => updateRow(r.key, { discarded: true })}
                        className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-red-400"
                        title={t('bulk.discard', 'Descartar')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {isAbonoRow && (
                    <p className="mb-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-300">
                      {t(
                        'bulk.abono_note',
                        'Detectada como abono (importe negativo): se guardará como devolución, no como factura.',
                      )}
                    </p>
                  )}
                  {r.scanError && (
                    <p className="mb-2 text-xs text-red-400">{r.scanError}</p>
                  )}
                  {/* Se muestran SIEMPRE los campos escaneados (editables) para poder
                      confirmar los datos de cada factura/abono antes de guardar; los
                      que bloquean se resaltan en ámbar. */}
                  <div className="grid grid-cols-2 gap-2">
                      {!isWholesalerCat && (
                        <div>
                          <label className={fieldLabelCls}>
                            {t('facturas.label.lab_supplier', 'Laboratorio / Proveedor')}
                          </label>
                          <input
                            value={r.laboratorio}
                            onChange={(e) => updateRow(r.key, { laboratorio: e.target.value })}
                            placeholder={t('facturas.label.lab_supplier', 'Laboratorio / Proveedor')}
                            className={`${inputCls} ${missing.includes('laboratorio') ? 'border-amber-500/50' : ''}`}
                          />
                        </div>
                      )}
                      <div>
                        <label className={fieldLabelCls}>
                          {t('facturas.label.invoice_number', 'Nº factura')}
                        </label>
                        <input
                          value={r.numFactura}
                          onChange={(e) => updateRow(r.key, { numFactura: e.target.value })}
                          placeholder={t('facturas.label.invoice_number', 'Nº factura')}
                          className={`${inputCls} ${missing.includes('num_factura') ? 'border-amber-500/50' : ''}`}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelCls}>
                          {t('general.importe', 'Importe')} (€)
                        </label>
                        <input
                          value={r.importe}
                          onChange={(e) => updateRow(r.key, { importe: e.target.value })}
                          inputMode="decimal"
                          placeholder={`${t('general.importe', 'Importe')} (€)`}
                          className={`${inputCls} ${missing.includes('importe') ? 'border-amber-500/50' : ''}`}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelCls}>
                          {t('facturas.label.fecha_exp', 'Fecha de expedición')}
                        </label>
                        <DatePicker
                          value={r.fecha}
                          onChange={(v) => updateRow(r.key, { fecha: v })}
                          className={`${inputCls} ${missing.includes('fecha') ? 'border-amber-500/50' : ''}`}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelCls}>
                          {t('facturas.label.vencimiento', 'Vencimiento')}
                        </label>
                        <DatePicker
                          value={r.vencimiento}
                          onChange={(v) => updateRow(r.key, { vencimiento: v })}
                          className={`${inputCls} ${missing.includes('vencimiento') ? 'border-amber-500/50' : ''}`}
                        />
                      </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
            >
              {savedCount > 0
                ? t('bulk.finish_here', 'Terminar aquí')
                : t('general.cancelar', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave || createFacturas.isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50"
            >
              {createFacturas.isPending
                ? t('general.guardando', 'Guardando…')
                : isLastTanda
                  ? `${t('bulk.save', 'Guardar')} ${active.length} ${t('bulk.invoices', 'facturas')}`
                  : `${t('bulk.save_continue', 'Guardar y continuar')} (${active.length})`}
            </button>
          </div>
          {!canSave && (
            <p className="text-center text-xs text-amber-400">
              {t('bulk.blocked', 'Completa las facturas marcadas para poder guardar.')}
            </p>
          )}
          {savedCount > 0 && (
            <p className="text-center text-xs text-slate-500">
              {t('bulk.kept_hint', 'Las facturas ya guardadas se conservan aunque salgas ahora.')}
            </p>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-5 py-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-100">
              {savedCount} {t('bulk.done_title', 'facturas guardadas')}
            </p>
            <p className="text-sm text-slate-400">
              {t('bulk.done_hint', 'Ya están en tu listado de facturas y en el calendario de vencimientos.')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500"
          >
            {t('general.cerrar', 'Cerrar')}
          </button>
        </div>
      )}
    </Dialog>
  )
}
