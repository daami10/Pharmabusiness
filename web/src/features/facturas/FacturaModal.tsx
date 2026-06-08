import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { getWholesalers } from '@/lib/config/wholesalers'
import { useCreateFactura, useUpdateFactura } from '@/lib/queries/facturas'
import { scanInvoice } from './lib/ocr'
import type { Factura, FacturaInput } from '@/types/domain'

const schema = z.object({
  tipo: z.string().min(1, 'Selecciona una categoría'),
  laboratorio: z.string().trim().min(1, 'Indica el laboratorio o proveedor'),
  num_factura: z.string(),
  fecha: z.string().min(1, 'Indica la fecha'),
  importe: z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number(v.replace(',', '.')) > 0,
      'Importe mayor que 0',
    ),
  fecha_vencimiento: z.string(),
  notas: z.string(),
  pagada: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function emptyForm(): FormValues {
  return {
    tipo: '',
    laboratorio: '',
    num_factura: '',
    fecha: new Date().toISOString().slice(0, 10),
    importe: '',
    fecha_vencimiento: '',
    notas: '',
    pagada: false,
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
  }
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none'

export function FacturaModal({
  open,
  onClose,
  factura,
}: {
  open: boolean
  onClose: () => void
  factura: Factura | null
}) {
  const wholesalers = useMemo(() => getWholesalers(), [])
  const createFactura = useCreateFactura()
  const updateFactura = useUpdateFactura()
  const [serverError, setServerError] = useState('')
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'loading' | 'ok'>('idle')
  const [ocrError, setOcrError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm() })

  useEffect(() => {
    if (open) reset(factura ? toForm(factura) : emptyForm())
  }, [open, factura, reset])

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
      setOcrError(err instanceof Error ? err.message : 'Error al analizar la imagen')
    }
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError('')
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
    try {
      if (factura) await updateFactura.mutateAsync({ id: factura.id, input })
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
      title={factura ? 'Editar factura' : 'Nueva factura'}
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
            {ocrStatus === 'loading' ? 'Analizando imagen…' : 'Escanear factura con IA'}
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
              ✓ Datos extraídos. Revísalos antes de guardar.
            </p>
          )}
          {ocrError && (
            <p className="mt-2 text-center text-xs text-red-400">{ocrError}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">
            Categoría
          </label>
          <select
            {...register('tipo', {
              onChange: (e) => {
                const v = e.target.value
                if (wholesalers.includes(v)) setValue('laboratorio', v)
              },
            })}
            className={inputCls}
          >
            <option value="">Seleccionar categoría…</option>
            <option value="Laboratorio">Laboratorio</option>
            {wholesalers.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
            <option value="Otro">Otro</option>
          </select>
          {errors.tipo && (
            <p className="mt-1 text-xs text-red-400">{errors.tipo.message}</p>
          )}
        </div>

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
              Nº factura
            </label>
            <input type="text" {...register('num_factura')} className={inputCls} />
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
              Vencimiento
            </label>
            <input type="date" {...register('fecha_vencimiento')} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Notas</label>
          <input type="text" {...register('notas')} className={inputCls} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" {...register('pagada')} className="h-4 w-4 rounded" />
          Marcar como pagada
        </label>

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
            {isSubmitting ? 'Guardando…' : factura ? 'Guardar cambios' : 'Crear factura'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
