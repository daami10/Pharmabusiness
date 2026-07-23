import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, Sparkles, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { useTranslation } from '@/lib/i18n'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCreateFacturas } from '@/lib/queries/facturas'
import { isWholesaler } from '@/lib/config/wholesalers'
import { isReservedCategory } from '@/lib/config/categories'
import { classifyScan, scanBatch, toFacturaInput, unzipInvoices } from './lib/batch-scan'
import type { FacturaInput } from '@/types/domain'

// Subida masiva desde un ZIP (fotos/PDFs). Categoría + nota comunes al lote.
// Las facturas que la IA lee completas se guardan directas; las dudosas se editan
// en una mini-bandeja antes de guardar (opción B: red de seguridad).

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
  discarded: boolean
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

// text-2xs/3xs no están definidos en este proyecto (no generan CSS), así que se
// usa un tamaño explícito pequeño y real.
const fieldLabelCls = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500'

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

  const [step, setStep] = useState<'config' | 'scanning' | 'review'>('config')
  const [zipName, setZipName] = useState('')
  const zipRef = useRef<File | null>(null)

  const [categorySel, setCategorySel] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [note, setNote] = useState('')

  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [rows, setRows] = useState<EditRow[]>([])
  const [error, setError] = useState('')

  // Categoría efectiva (texto libre → soporta personalizadas).
  const category =
    categorySel === NEW_CATEGORY ? newCategory.trim() : categorySel.trim()
  const isWholesalerCat = isWholesaler(category, wholesalers)

  function resetAll() {
    setStep('config')
    setZipName('')
    zipRef.current = null
    setCategorySel('')
    setNewCategory('')
    setNote('')
    setProgress({ done: 0, total: 0 })
    setRows([])
    setError('')
  }

  function handleClose() {
    resetAll()
    onClose()
  }

  function pickZip(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    e.target.value = ''
    zipRef.current = f
    setZipName(f?.name ?? '')
    setError('')
  }

  async function startScan() {
    setError('')
    if (!zipRef.current) {
      setError(t('bulk.error.no_zip', 'Selecciona un archivo ZIP.'))
      return
    }
    if (!category) {
      setError(t('bulk.error.no_category', 'Elige o escribe una categoría para el lote.'))
      return
    }
    // Categoría nueva: validar el nombre, pero NO persistirla todavía. Solo se
    // guarda en la organización si el lote llega a guardarse (en save()), para que
    // cancelar la subida no deje una categoría huérfana.
    if (categorySel === NEW_CATEGORY && isReservedCategory(category, wholesalers)) {
      setError(t('categories.error.reserved', 'Ese nombre ya es una categoría de sistema o un mayorista.'))
      return
    }

    let files: File[]
    try {
      files = await unzipInvoices(zipRef.current)
    } catch {
      setError(t('bulk.error.bad_zip', 'No se pudo abrir el ZIP. ¿Está dañado?'))
      return
    }
    if (files.length === 0) {
      setError(t('bulk.error.no_files', 'El ZIP no contiene imágenes ni PDFs.'))
      return
    }

    setStep('scanning')
    setProgress({ done: 0, total: files.length })
    const items = await scanBatch(files, {
      concurrency: 4,
      onProgress: (done, total) => setProgress({ done, total }),
    })

    // Para mayoristas, el nombre = la categoría; si no, lo que leyó la IA.
    setRows(
      items.map((it, i) => ({
        key: i,
        fileName: it.fileName,
        scanError: it.error,
        laboratorio: isWholesalerCat
          ? category
          : (it.result?.laboratorio ?? ''),
        numFactura: it.result?.numFactura ?? '',
        importe: it.result && it.result.importe > 0 ? String(it.result.importe) : '',
        fecha: it.result?.fecha ?? '',
        vencimiento: it.result?.vencimiento ?? '',
        discarded: false,
      })),
    )
    setStep('review')
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
    }).missing
  }

  const active = rows.filter((r) => !r.discarded)
  const pending = active.filter((r) => rowMissing(r).length > 0)
  const readyCount = active.length - pending.length
  const canSave = active.length > 0 && pending.length === 0

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
        },
        { category, note, laboratorio: r.laboratorio },
      ),
    )
    try {
      await createFacturas.mutateAsync(inputs)
      // La categoría nueva solo se persiste ahora, con las facturas ya guardadas.
      if (categorySel === NEW_CATEGORY) {
        await addCategory(category, activeOrgId)
      }
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('general.save_error', 'Error al guardar'))
    }
  }

  const customOptions = useMemo(
    () => categories.filter((c) => c && !wholesalers.includes(c)),
    [categories, wholesalers],
  )

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
              'Sube un ZIP con fotos o PDFs. La IA extraerá los datos de cada factura. Las que queden incompletas se marcarán para que las revises.',
            )}
          </p>

          {/* ZIP */}
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-accent-blue/30 bg-accent-blue/5 p-6 text-center">
            <FileUp className="h-6 w-6 text-accent-blue" />
            <span className="text-sm font-semibold text-accent-blue">
              {zipName || t('bulk.pick_zip', 'Seleccionar archivo ZIP')}
            </span>
            <span className="text-xs text-slate-500">
              {t('bulk.zip_hint', 'Fotos (JPG/PNG) o PDFs comprimidos en .zip')}
            </span>
            <input type="file" accept=".zip,application/zip" className="hidden" onChange={pickZip} />
          </label>

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
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
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
              const isAbonoRow = importeNum < 0
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
                  {/* Solo se muestran los campos editables si hay algo que revisar.
                      Cada casilla lleva su título para que se entienda qué falta. */}
                  {!ok && (
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
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setStep('config')}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
            >
              {t('general.atras', 'Atrás')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave || createFacturas.isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50"
            >
              {createFacturas.isPending
                ? t('general.guardando', 'Guardando…')
                : `${t('bulk.save', 'Guardar')} ${active.length} ${t('bulk.invoices', 'facturas')}`}
            </button>
          </div>
          {!canSave && active.length > 0 && (
            <p className="text-center text-xs text-amber-400">
              {t('bulk.blocked', 'Completa las facturas marcadas para poder guardar.')}
            </p>
          )}
        </div>
      )}
    </Dialog>
  )
}
