import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { getRemainingDatesForDate } from '@/lib/utils/dates'
import { useCreateSeguros, useUpdateSeguro } from '@/lib/queries/trabajadores'
import type { Seguro, SeguroInput } from '@/types/domain'

const schema = z.object({
  fecha: z.string().min(1, 'Indica la fecha'),
  importe: z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number(v.replace(',', '.')) > 0,
      'Importe mayor que 0',
    ),
  notas: z.string(),
  repetir: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

export function SeguroModal({
  open,
  onClose,
  seguro,
}: {
  open: boolean
  onClose: () => void
  seguro: Seguro | null
}) {
  const createSeguros = useCreateSeguros()
  const updateSeguro = useUpdateSeguro()
  const [serverError, setServerError] = useState('')

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fecha: '', importe: '', notas: '', repetir: false },
  })

  useEffect(() => {
    if (!open) return
    reset({
      fecha: seguro ? seguro.fecha : new Date().toISOString().slice(0, 10),
      importe: seguro ? String(seguro.importe) : '',
      notas: seguro?.notas ?? '',
      repetir: false,
    })
  }, [open, seguro, reset])

  function handleClose() {
    setServerError('')
    onClose()
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError('')
    const importe = Number(v.importe.replace(',', '.'))
    const notas = v.notas.trim() || null
    try {
      if (seguro) {
        const input: SeguroInput = { fecha: v.fecha, importe, notas }
        await updateSeguro.mutateAsync({ id: seguro.id, input })
      } else {
        const fechas = v.repetir ? getRemainingDatesForDate(v.fecha) : [v.fecha]
        await createSeguros.mutateAsync(
          fechas.map((fecha) => ({ fecha, importe, notas })),
        )
      }
      handleClose()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Error al guardar')
    }
  })

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={seguro ? 'Editar seguro social' : 'Nuevo seguro social'}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">Fecha</label>
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
              <p className="mt-1 text-xs text-red-400">{errors.fecha.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              Importe (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              {...register('importe')}
              className={inputCls}
            />
            {errors.importe && (
              <p className="mt-1 text-xs text-red-400">{errors.importe.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Notas</label>
          <input type="text" {...register('notas')} className={inputCls} />
        </div>

        {!seguro && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" {...register('repetir')} className="h-4 w-4 rounded" />
            Repetir mensualmente hasta fin de año
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
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando…' : seguro ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
