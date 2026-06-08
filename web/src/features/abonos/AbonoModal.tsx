import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import { useCreateFactura, useUpdateFactura } from '@/lib/queries/facturas'
import type { Factura, FacturaInput } from '@/types/domain'

const schema = z.object({
  laboratorio: z.string().trim().min(1, 'Indica el laboratorio o proveedor'),
  fecha: z.string().min(1, 'Indica la fecha'),
  importe: z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number(v.replace(',', '.')) > 0,
      'Importe mayor que 0',
    ),
  notas: z.string(),
})
type FormValues = z.infer<typeof schema>

function emptyForm(): FormValues {
  return {
    laboratorio: '',
    fecha: new Date().toISOString().slice(0, 10),
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
}: {
  open: boolean
  onClose: () => void
  abono: Factura | null
}) {
  const createFactura = useCreateFactura()
  const updateFactura = useUpdateFactura()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm() })

  useEffect(() => {
    if (open) reset(abono ? toForm(abono) : emptyForm())
  }, [open, abono, reset])

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
      setServerError(e instanceof Error ? e.message : 'Error al guardar')
    }
  })

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={abono ? 'Editar abono' : 'Nuevo abono'}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">
            Laboratorio / Proveedor
          </label>
          <input type="text" {...register('laboratorio')} className={inputCls} />
          {errors.laboratorio && (
            <p className="mt-1 text-xs text-red-400">{errors.laboratorio.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              Fecha
            </label>
            <input type="date" {...register('fecha')} className={inputCls} />
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
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando…' : abono ? 'Guardar cambios' : 'Crear abono'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
