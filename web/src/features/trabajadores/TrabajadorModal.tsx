import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import { useCreateTrabajador, useTrabajadores } from '@/lib/queries/trabajadores'

const schema = z.object({ nombre: z.string().trim().min(1, 'Indica el nombre') })
type FormValues = z.infer<typeof schema>

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

export function TrabajadorModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: trabajadores } = useTrabajadores()
  const createTrabajador = useCreateTrabajador()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '' },
  })

  useEffect(() => {
    if (open) reset({ nombre: '' })
  }, [open, reset])

  const onSubmit = handleSubmit(async (v) => {
    setServerError('')
    try {
      await createTrabajador.mutateAsync(v.nombre.trim())
      reset({ nombre: '' })
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Error al guardar')
    }
  })

  return (
    <Dialog open={open} onClose={onClose} title="Trabajadores">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <label className="block text-xs font-semibold text-slate-400">
          Añadir trabajador
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nombre completo"
            {...register('nombre')}
            className={inputCls}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-accent-blue px-4 text-sm font-bold text-slate-950 transition-all hover:opacity-90 disabled:opacity-60"
          >
            Añadir
          </button>
        </div>
        {errors.nombre && <p className="text-xs text-red-400">{errors.nombre.message}</p>}
        {serverError && <p className="text-xs text-red-400">{serverError}</p>}
      </form>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Plantilla ({(trabajadores ?? []).length})
        </p>
        {!trabajadores?.length && (
          <p className="text-sm text-slate-500">Aún no hay trabajadores.</p>
        )}
        <ul className="space-y-1.5">
          {(trabajadores ?? []).map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200"
            >
              {t.nombre}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
      >
        Cerrar
      </button>
    </Dialog>
  )
}
