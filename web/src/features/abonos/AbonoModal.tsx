import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { useCreateFactura, useUpdateFactura } from '@/lib/queries/facturas'
import type { Factura, FacturaInput } from '@/types/domain'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/lib/i18n'

const schema = z.object({
  laboratorio: z.string().trim().min(1, 'facturas.error.select_lab'),
  fecha: z.string().min(1, 'facturas.error.select_date'),
  importe: z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number(v.replace(',', '.')) > 0,
      'trabajadores.error.min_importe',
    ),
  notas: z.string(),
})
type FormValues = z.infer<typeof schema>

function emptyForm(year?: number): FormValues {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return {
    laboratorio: '',
    fecha: `${y}-${m}-${d}`,
    importe: '',
    notas: '',
  }
}

function toForm(f: Factura): FormValues {
  return {
    laboratorio: f.laboratorio,
    fecha: f.fecha ?? '',
    importe: String(f.importe),
    notas: f.notas ?? '',
  }
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

export function AbonoModal({
  open,
  onClose,
  abono,
  activeYear,
}: {
  open: boolean
  onClose: () => void
  abono: Factura | null
  activeYear: number
}) {
  const { t } = useTranslation()
  const createFactura = useCreateFactura()
  const updateFactura = useUpdateFactura()
  const [serverError, setServerError] = useState('')

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

  const wholesalers = useWholesalersStore((s) => s.wholesalers)
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
    if (open) reset(abono ? toForm(abono) : emptyForm(activeYear))
  }, [open, abono, activeYear, reset])

  function handleClose() {
    setServerError('')
    onClose()
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError('')
    const input: FacturaInput = {
      tipo: 'Abono',
      laboratorio: v.laboratorio.trim(),
      num_factura: null,
      fecha: v.fecha || null,
      importe: Number(v.importe.replace(',', '.')),
      fecha_vencimiento: null,
      notas: v.notas.trim(),
      pagada: false,
    }
    try {
      if (abono) await updateFactura.mutateAsync({ id: abono.id, input })
      else await createFactura.mutateAsync(input)
      handleClose()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('general.save_error', 'Error al guardar'))
    }
  })

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={abono ? t('abonos.edit_title', 'Editar abono') : t('abonos.new_title', 'Nuevo abono')}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
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

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">{t('general.notes', 'Notas')}</label>
          <input type="text" {...register('notas')} className={inputCls} />
        </div>

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
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t('general.guardando', 'Guardando…') : abono ? t('general.guardar_cambios', 'Guardar cambios') : t('abonos.create_button', 'Crear abono')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
