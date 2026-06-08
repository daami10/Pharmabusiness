import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useFacturas, useDeleteFactura } from '@/lib/queries/facturas'
import { useYearStore } from '@/stores/yearStore'
import { formatMoney } from '@/lib/utils/money'
import { formatDate } from '@/lib/utils/dates'
import type { Factura } from '@/types/domain'
import { AbonoModal } from './AbonoModal'

export function AbonosPage() {
  const { data, isLoading, isError, error } = useFacturas()
  const deleteFactura = useDeleteFactura()
  const year = useYearStore((s) => s.year)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Factura | null>(null)

  const abonos = useMemo(() => {
    return (data ?? [])
      .filter((f) => f.tipo === 'Abono' && (f.fecha ?? '').slice(0, 4) === String(year))
      .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  }, [data, year])

  const total = abonos.reduce((sum, a) => sum + a.importe, 0)

  function onDelete(a: Factura) {
    if (!confirm(`¿Eliminar el abono de ${a.laboratorio}?`)) return
    deleteFactura.mutate(a.id)
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Abonos</h1>
          <p className="mt-1 text-sm text-slate-400">Devoluciones y abonos de {year}.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition-all hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Nuevo abono
        </button>
      </div>

      {isLoading && (
        <p className="py-12 text-center text-sm text-slate-400">Cargando abonos…</p>
      )}
      {isError && (
        <p className="py-12 text-center text-sm text-red-400">
          Error al cargar: {error instanceof Error ? error.message : 'desconocido'}
        </p>
      )}
      {!isLoading && !isError && !abonos.length && (
        <p className="py-12 text-center text-sm text-slate-400">
          No hay abonos registrados en {year}.
        </p>
      )}

      {!isLoading && !isError && abonos.length > 0 && (
        <>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/5">
                {abonos.map((a) => (
                  <tr
                    key={a.id}
                    className="bg-emerald-500/5 transition-colors hover:bg-white/5"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                      {formatDate(a.fecha)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white">
                      {a.laboratorio || '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-extrabold text-emerald-400">
                      + {formatMoney(a.importe)}
                    </td>
                    <td className="hidden max-w-xs truncate px-6 py-4 text-sm text-slate-500 lg:table-cell">
                      {a.notas ?? ''}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(a)
                            setModalOpen(true)
                          }}
                          className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(a)}
                          className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-red-400"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-6 py-4">
            <span className="text-sm text-slate-400">
              {abonos.length} abono{abonos.length !== 1 ? 's' : ''}
            </span>
            <span className="text-lg font-black text-emerald-400">
              + {formatMoney(total)}
            </span>
          </div>
        </>
      )}

      <AbonoModal open={modalOpen} onClose={() => setModalOpen(false)} abono={editing} />
    </div>
  )
}
