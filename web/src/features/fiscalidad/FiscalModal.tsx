import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { getRemainingDatesForDate } from '@/lib/utils/dates'
import { useCreateFiscales, useUpdateFiscal } from '@/lib/queries/fiscalidad'
import type { Fiscal, FiscalInput } from '@/types/domain'
import { useTranslation } from '@/lib/i18n'

const schema = z.object({
  concepto: z.string().min(1, 'fiscalidad.error.select_concept'),
  fecha: z.string().min(1, 'facturas.error.select_date'),
  importe: z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number(v.replace(',', '.')) > 0,
      'trabajadores.error.min_importe',
    ),
  notas: z.string(),
  repetir: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function emptyForm(): FormValues {
  return {
    concepto: '',
    fecha: new Date().toISOString().slice(0, 10),
    importe: '',
    notas: '',
    repetir: false,
  }
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

export function FiscalModal({
  open,
  onClose,
  fiscal,
}: {
  open: boolean
  onClose: () => void
  fiscal: Fiscal | null
}) {
  const { t } = useTranslation()
  const createFiscales = useCreateFiscales()
  const updateFiscal = useUpdateFiscal()
  const [serverError, setServerError] = useState('')

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm() })

  useEffect(() => {
    if (!open) return
    reset(
      fiscal
        ? {
            concepto: fiscal.concepto,
            fecha: fiscal.fecha,
            importe: String(fiscal.importe),
            notas: fiscal.notas ?? '',
            repetir: false,
          }
        : emptyForm(),
    )
  }, [open, fiscal, reset])

  function handleClose() {
    setServerError('')
    onClose()
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError('')
    const importe = Number(v.importe.replace(',', '.'))
    const notas = v.notas.trim() || null
    try {
      if (fiscal) {
        const input: FiscalInput = {
          concepto: v.concepto,
          fecha: v.fecha,
          importe,
          notas,
        }
        await updateFiscal.mutateAsync({ id: fiscal.id, input })
      } else {
        const fechas = v.repetir ? getRemainingDatesForDate(v.fecha) : [v.fecha]
        await createFiscales.mutateAsync(
          fechas.map((fecha) => ({ concepto: v.concepto, fecha, importe, notas })),
        )
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
      title={fiscal ? t('fiscalidad.edit_title', 'Editar gasto fiscal') : t('fiscalidad.new_title', 'Nuevo gasto fiscal')}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">
            {t('general.concepto', 'Concepto')}
          </label>
          <input
            type="text"
            {...register('concepto')}
            placeholder={t('fiscalidad.placeholder.concept', 'Ej. IVA, IRPF, Autónomos...')}
            className={inputCls}
          />
          {errors.concepto && (
            <p className="mt-1 text-xs text-red-400">{t(errors.concepto.message || '', 'Indica el concepto')}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">{t('general.fecha', 'Fecha')}</label>
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

        {!fiscal && (
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
            {isSubmitting ? t('general.guardando', 'Guardando…') : fiscal ? t('general.guardar_cambios', 'Guardar cambios') : t('general.guardar', 'Guardar')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
