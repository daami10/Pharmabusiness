import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import { getRemainingMonths } from '@/lib/utils/dates'
import {
  useCreateNominas,
  useUpdateNomina,
  useTrabajadores,
} from '@/lib/queries/trabajadores'
import type { Nomina, NominaInput } from '@/types/domain'

const schema = z.object({
  trabajador_id: z.string().min(1, 'Selecciona un trabajador'),
  mes: z.string().min(1, 'Indica el mes'),
  importe: z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number(v.replace(',', '.')) > 0,
      'Importe mayor que 0',
    ),
  concepto: z.string(),
  repetir: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

export function NominaModal({
  open,
  onClose,
  nomina,
}: {
  open: boolean
  onClose: () => void
  nomina: Nomina | null
}) {
  const { data: trabajadores } = useTrabajadores()

  const selectOptions = useMemo(() => {
    return (trabajadores ?? []).filter(
      (t) => t.activo !== false || t.id === nomina?.trabajador_id,
    )
  }, [trabajadores, nomina])
  const createNominas = useCreateNominas()
  const updateNomina = useUpdateNomina()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      trabajador_id: '',
      mes: '',
      importe: '',
      concepto: '',
      repetir: false,
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      trabajador_id: nomina?.trabajador_id ?? '',
      mes: nomina ? nomina.fecha.slice(0, 7) : new Date().toISOString().slice(0, 7),
      importe: nomina ? String(nomina.importe) : '',
      concepto: nomina?.concepto ?? '',
      repetir: false,
    })
  }, [open, nomina, reset])

  function handleClose() {
    setServerError('')
    onClose()
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError('')
    const nombre =
      (trabajadores ?? []).find((t) => t.id === v.trabajador_id)?.nombre ?? ''
    const importe = Number(v.importe.replace(',', '.'))
    const concepto = v.concepto.trim() || null
    try {
      if (nomina) {
        const input: NominaInput = {
          trabajador_id: v.trabajador_id,
          trabajador_nombre: nombre,
          fecha: `${v.mes}-01`,
          importe,
          concepto,
        }
        await updateNomina.mutateAsync({ id: nomina.id, input })
      } else {
        const [y, m] = v.mes.split('-')
        const fechas = v.repetir
          ? getRemainingMonths(Number(y), Number(m))
          : [`${v.mes}-01`]
        await createNominas.mutateAsync(
          fechas.map((fecha) => ({
            trabajador_id: v.trabajador_id,
            trabajador_nombre: nombre,
            fecha,
            importe,
            concepto,
          })),
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
      title={nomina ? 'Editar nómina' : 'Nueva nómina'}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">
            Trabajador
          </label>
          <select {...register('trabajador_id')} className={inputCls}>
            <option value="">Seleccionar trabajador…</option>
            {selectOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          {errors.trabajador_id && (
            <p className="mt-1 text-xs text-red-400">{errors.trabajador_id.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">Mes</label>
            <input type="month" {...register('mes')} className={inputCls} />
            {errors.mes && (
              <p className="mt-1 text-xs text-red-400">{errors.mes.message}</p>
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
          <label className="mb-1 block text-xs font-semibold text-slate-400">
            Concepto
          </label>
          <input
            type="text"
            placeholder="Nómina ordinaria, paga extra…"
            {...register('concepto')}
            className={inputCls}
          />
        </div>

        {!nomina && (
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
            {isSubmitting ? 'Guardando…' : nomina ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
