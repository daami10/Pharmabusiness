import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import {
  useCreateTrabajador,
  useTrabajadores,
  useUpdateTrabajador,
} from '@/lib/queries/trabajadores'

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
  const updateTrabajador = useUpdateTrabajador()
  const [serverError, setServerError] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const activeWorkers = useMemo(() => {
    return (trabajadores ?? []).filter((t) => t.activo !== false)
  }, [trabajadores])

  const inactiveWorkers = useMemo(() => {
    return (trabajadores ?? []).filter((t) => t.activo === false)
  }, [trabajadores])

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
    if (open) {
      reset({ nombre: '' })
    }
  }, [open, reset])

  function handleClose() {
    setShowInactive(false)
    onClose()
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError('')
    try {
      await createTrabajador.mutateAsync(v.nombre.trim())
      reset({ nombre: '' })
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Error al guardar')
    }
  })

  async function handleToggleActivo(id: string, activo: boolean) {
    try {
      await updateTrabajador.mutateAsync({ id, activo })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar estado')
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Trabajadores">
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
          Plantilla ({activeWorkers.length})
        </p>
        {!activeWorkers.length && (
          <p className="text-sm text-slate-500">Aún no hay trabajadores activos.</p>
        )}
        <ul className="space-y-1.5">
          {activeWorkers.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              <span>{t.nombre}</span>
              <button
                type="button"
                onClick={() => handleToggleActivo(t.id, false)}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-2xs font-extrabold uppercase text-red-400 transition-all hover:bg-red-500/10 active:scale-95"
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>

        {inactiveWorkers.length > 0 && (
          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={() => setShowInactive((s) => !s)}
              className="text-xs font-semibold text-[#00f2fe] hover:underline"
            >
              {showInactive
                ? 'Ocultar trabajadores de baja'
                : `Ver trabajadores de baja (${inactiveWorkers.length})`}
            </button>
          </div>
        )}

        {showInactive && inactiveWorkers.length > 0 && (
          <div className="mt-3 border-t border-white/5 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trabajadores de baja ({inactiveWorkers.length})
            </p>
            <ul className="space-y-1.5">
              {inactiveWorkers.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/20 px-4 py-2 text-sm font-semibold text-slate-400"
                >
                  <span className="line-through">{t.nombre}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleActivo(t.id, true)}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-2xs font-extrabold uppercase text-emerald-400 transition-all hover:bg-emerald-500/10 active:scale-95"
                  >
                    Reactivar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="mt-5 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
      >
        Cerrar
      </button>
    </Dialog>
  )
}
