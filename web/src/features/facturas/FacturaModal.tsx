import { useEffect, useRef, useState, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { useTranslation } from '@/lib/i18n'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useAuth } from '@/features/auth/AuthProvider'
import { isReservedCategory } from '@/lib/config/categories'
import { useUpdateFactura, useCreateFacturas } from '@/lib/queries/facturas'
import { scanInvoice } from './lib/ocr'
import type { Factura, FacturaInput } from '@/types/domain'
import { getRemainingDatesForDate } from '@/lib/utils/dates'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  tipo: z.string().min(1, 'facturas.error.select_category'),
  laboratorio: z.string().trim().min(1, 'facturas.error.select_lab'),
  num_factura: z.string(),
  fecha: z.string().min(1, 'facturas.error.select_date'),
  importe: z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number(v.replace(',', '.')) > 0,
      'trabajadores.error.min_importe',
    ),
  fecha_vencimiento: z.string(),
  notas: z.string(),
  pagada: z.boolean(),
  repetir: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function emptyForm(year?: number): FormValues {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return {
    tipo: '',
    laboratorio: '',
    num_factura: '',
    fecha: `${y}-${m}-${d}`,
    importe: '',
    fecha_vencimiento: '',
    notas: '',
    pagada: false,
    repetir: false,
  }
}

function toForm(f: Factura): FormValues {
  return {
    tipo: f.tipo,
    laboratorio: f.laboratorio,
    num_factura: f.num_factura ?? '',
    fecha: f.fecha ?? '',
    importe: String(f.importe),
    fecha_vencimiento: f.fecha_vencimiento ?? '',
    notas: f.notas ?? '',
    pagada: f.pagada,
    repetir: false,
  }
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

export function FacturaModal({
  open,
  onClose,
  factura,
  initialFile,
  activeYear,
}: {
  open: boolean
  onClose: () => void
  factura: Factura | null
  initialFile?: File | null
  activeYear: number
}) {
  const { t } = useTranslation()
  const { activeOrgId } = useAuth()
  const wholesalers = useWholesalersStore((s) => s.wholesalers)
  const categories = useCategoriesStore((s) => s.categories)
  const addCategory = useCategoriesStore((s) => s.addCategory)
  const [newCatMode, setNewCatMode] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [catError, setCatError] = useState('')
  const createFacturas = useCreateFacturas()
  const updateFactura = useUpdateFactura()
  const [serverError, setServerError] = useState('')
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'loading' | 'ok'>('idle')
  const [ocrError, setOcrError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm(activeYear),
  })

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (open) {
      const loadSuggestions = async () => {
        try {
          const [factRes, abonoRes] = await Promise.all([
            supabase.from('facturas').select('laboratorio'),
            supabase.from('abonos').select('laboratorio'),
          ])

          const unique = new Set<string>()
          wholesalers.forEach((w) => unique.add(w))

          if (factRes.data) {
            factRes.data.forEach((f) => {
              if (f.laboratorio) unique.add(f.laboratorio.trim())
            })
          }
          if (abonoRes.data) {
            abonoRes.data.forEach((a) => {
              if (a.laboratorio) unique.add(a.laboratorio.trim())
            })
          }

          setSuggestions(Array.from(unique).sort())
        } catch (err) {
          console.error('Error loading suggestions:', err)
        }
      }
      loadSuggestions()
    }
  }, [open, wholesalers])

  const watchLaboratorio = watch('laboratorio') || ''

  const filteredSuggestions = useMemo(() => {
    const val = watchLaboratorio.trim().toLowerCase()
    if (!val) return suggestions
    return suggestions.filter(
      (s) => s.toLowerCase().includes(val) && s.toLowerCase() !== val,
    )
  }, [watchLaboratorio, suggestions])

  useEffect(() => {
    if (open) reset(factura ? toForm(factura) : emptyForm(activeYear))
  }, [open, factura, activeYear, reset])

  // OCR automático al recibir un archivo. IMPORTANTE: escanear UNA SOLA VEZ por
  // archivo. Antes el efecto tenía `t` (y `setValue`) en deps, y como useTranslation
  // crea una `t` nueva en cada render, el efecto se reejecutaba y lanzaba varias
  // llamadas concurrentes a Gemini → los valores "bailaban" y se gastaba cuota.
  const scannedFileRef = useRef<File | null>(null)
  useEffect(() => {
    if (!open) {
      scannedFileRef.current = null
      return
    }
    if (!initialFile || factura) return
    if (scannedFileRef.current === initialFile) return
    scannedFileRef.current = initialFile

    const runScan = async () => {
      setOcrError('')
      setOcrStatus('loading')
      try {
        const r = await scanInvoice(initialFile)
        if (r.laboratorio) setValue('laboratorio', r.laboratorio)
        if (r.numFactura) setValue('num_factura', r.numFactura)
        if (r.importe > 0) setValue('importe', String(r.importe))
        if (/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)) setValue('fecha', r.fecha)
        if (/^\d{4}-\d{2}-\d{2}$/.test(r.vencimiento))
          setValue('fecha_vencimiento', r.vencimiento)
        setOcrStatus('ok')
      } catch (err) {
        setOcrStatus('idle')
        setOcrError(err instanceof Error ? err.message : t('facturas.ocr.error_message', 'Error al analizar la imagen'))
      }
    }
    runScan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile, factura])

  function handleClose() {
    setServerError('')
    setOcrError('')
    setOcrStatus('idle')
    onClose()
  }

  async function handleScanFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setOcrError('')
    setOcrStatus('loading')
    try {
      const r = await scanInvoice(file)
      if (r.laboratorio) setValue('laboratorio', r.laboratorio)
      if (r.numFactura) setValue('num_factura', r.numFactura)
      if (r.importe > 0) setValue('importe', String(r.importe))
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)) setValue('fecha', r.fecha)
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.vencimiento))
        setValue('fecha_vencimiento', r.vencimiento)
      setOcrStatus('ok')
    } catch (err) {
      setOcrStatus('idle')
      setOcrError(err instanceof Error ? err.message : t('facturas.ocr.error_message', 'Error al analizar la imagen'))
    }
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError('')
    try {
      if (factura) {
        const input: FacturaInput = {
          tipo: v.tipo,
          laboratorio: v.laboratorio.trim(),
          num_factura: v.num_factura.trim() || null,
          fecha: v.fecha || null,
          importe: Number(v.importe.replace(',', '.')),
          fecha_vencimiento: v.fecha_vencimiento || null,
          notas: v.notas.trim(),
          pagada: v.pagada,
        }
        await updateFactura.mutateAsync({ id: factura.id, input })
      } else {
        const fechas = v.repetir
          ? getRemainingDatesForDate(v.fecha)
          : [v.fecha]

        let offsetDays: number | null = null
        if (v.fecha && v.fecha_vencimiento) {
          const d1 = new Date(`${v.fecha}T00:00:00`)
          const d2 = new Date(`${v.fecha_vencimiento}T00:00:00`)
          offsetDays = Math.round((d2.getTime() - d1.getTime()) / 86_400_000)
        }

        const inputs: FacturaInput[] = fechas.map((fecha) => {
          let fecha_vencimiento: string | null = null
          if (offsetDays !== null) {
            const base = new Date(`${fecha}T00:00:00`)
            base.setDate(base.getDate() + offsetDays)
            const y = base.getFullYear()
            const m = String(base.getMonth() + 1).padStart(2, '0')
            const d = String(base.getDate()).padStart(2, '0')
            fecha_vencimiento = `${y}-${m}-${d}`
          }

          return {
            tipo: v.tipo,
            laboratorio: v.laboratorio.trim(),
            num_factura: v.num_factura.trim() || null,
            fecha,
            importe: Number(v.importe.replace(',', '.')),
            fecha_vencimiento,
            notas: v.notas.trim(),
            pagada: v.pagada,
          }
        })

        await createFacturas.mutateAsync(inputs)
      }
      handleClose()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('general.save_error', 'Error al guardar'))
    }
  })

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={factura ? t('facturas.edit_title', 'Editar factura') : t('facturas.new_title', 'Nueva factura')}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Escaneo con IA (OCR) */}
        <div className="rounded-xl border border-dashed border-accent-blue/25 bg-accent-blue/5 p-4">
          <label
            className={`flex items-center justify-center gap-2 text-sm font-semibold text-accent-blue ${
              ocrStatus === 'loading' ? 'cursor-wait opacity-70' : 'cursor-pointer'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {ocrStatus === 'loading' ? t('facturas.ocr.scanning', 'Analizando imagen…') : t('facturas.ocr.scan_button', 'Escanear factura con IA')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={ocrStatus === 'loading'}
              onChange={handleScanFile}
            />
          </label>
          {ocrStatus === 'ok' && (
            <p className="mt-2 text-center text-xs text-emerald-400">
              {t('facturas.ocr.ok_message', '✓ Datos extraídos. Revísalos antes de guardar.')}
            </p>
          )}
          {ocrError && (
            <p className="mt-2 text-center text-xs text-red-400">{ocrError}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">
            {t('facturas.filter.category', 'Categoría')}
          </label>
          <select
            {...register('tipo', {
              onChange: (e) => {
                const v = e.target.value
                if (v === '__new__') {
                  // No es una categoría real: abre el input para crear una nueva.
                  setValue('tipo', '')
                  setCatError('')
                  setNewCatMode(true)
                  return
                }
                setNewCatMode(false)
                if (wholesalers.includes(v)) setValue('laboratorio', v)
              },
            })}
            className={inputCls}
          >
            <option value="">{t('facturas.placeholder.select_category', 'Seleccionar categoría…')}</option>
            <option value="Laboratorio">{t('general.laboratorio', 'Laboratorio')}</option>
            {wholesalers.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
            <option value="Otro">{t('general.otro', 'Otro')}</option>
            {categories.length > 0 && (
              <optgroup label={t('bulk.custom_group', 'Personalizadas')}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="__new__">➕ {t('bulk.new_category', 'Nueva categoría…')}</option>
          </select>
          {newCatMode && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder={t('categories.placeholder', 'Ej: Parafarmacia, Limpieza…')}
                className={inputCls}
                autoFocus
              />
              <button
                type="button"
                onClick={async () => {
                  const v = newCat.trim()
                  setCatError('')
                  if (!v) return
                  if (isReservedCategory(v, wholesalers)) {
                    setCatError(t('categories.error.reserved', 'Ese nombre ya es una categoría de sistema o un mayorista.'))
                    return
                  }
                  await addCategory(v, activeOrgId)
                  setValue('tipo', v, { shouldValidate: true })
                  setNewCat('')
                  setNewCatMode(false)
                }}
                className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 text-sm font-semibold text-white transition-all hover:from-blue-400 hover:to-indigo-500"
              >
                {t('general.anadir', 'Añadir')}
              </button>
            </div>
          )}
          {catError && <p className="mt-1 text-xs text-red-400">{catError}</p>}
          {errors.tipo && (
            <p className="mt-1 text-xs text-red-400">{t(errors.tipo.message || '', 'Selecciona una categoría')}</p>
          )}
        </div>

        <div className="relative">
          <label className="mb-1 block text-xs font-semibold text-slate-400">
            {t('facturas.label.lab_supplier', 'Laboratorio / Proveedor')}
          </label>
          <input
            type="text"
            {...register('laboratorio')}
            className={inputCls}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => {
              // Timeout to allow onMouseDown event to trigger on option items
              setTimeout(() => setShowDropdown(false), 200)
            }}
            autoComplete="off"
          />
          {showDropdown && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 py-1.5 shadow-2xl backdrop-blur-md">
              {filteredSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={() => {
                    setValue('laboratorio', item, { shouldValidate: true })
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          {errors.laboratorio && (
            <p className="mt-1 text-xs text-red-400">{t(errors.laboratorio.message || '', 'Indica el laboratorio o proveedor')}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              {t('facturas.label.invoice_number', 'Nº factura')}
            </label>
            <input type="text" {...register('num_factura')} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              {t('general.importe', 'Importe')} (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              {...register('importe')}
              className={inputCls}
            />
            {errors.importe && (
              <p className="mt-1 text-xs text-red-400">{t(errors.importe.message || '', 'Importe mayor que 0')}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              {t('general.fecha', 'Fecha')}
            </label>
            <Controller
              control={control}
              name="fecha"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  className={inputCls}
                />
              )}
            />
            {errors.fecha && (
              <p className="mt-1 text-xs text-red-400">{t(errors.fecha.message || '', 'Indica la fecha')}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              {t('facturas.label.vencimiento', 'Vencimiento')}
            </label>
            <Controller
              control={control}
              name="fecha_vencimiento"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  className={inputCls}
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">{t('general.notes', 'Notas')}</label>
          <input type="text" {...register('notas')} className={inputCls} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" {...register('pagada')} className="h-4 w-4 rounded" />
          {t('facturas.label.mark_as_paid', 'Marcar como pagada')}
        </label>

        {!factura && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" {...register('repetir')} className="h-4 w-4 rounded" />
            {t('general.repeat_monthly', 'Repetir mensualmente hasta fin de año')}
          </label>
        )}

        {serverError && (
          <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {serverError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
          >
            {t('general.cancelar', 'Cancelar')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? t('general.guardando', 'Guardando…') : factura ? t('general.guardar_cambios', 'Guardar cambios') : t('facturas.create_button', 'Crear factura')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
