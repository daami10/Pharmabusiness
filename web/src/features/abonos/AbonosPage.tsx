import { useMemo, useState } from 'react'
import { ChevronDown, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useFacturas, useDeleteFactura } from '@/lib/queries/facturas'
import { useYearStore } from '@/stores/yearStore'
import { formatMoney } from '@/lib/utils/money'
import { formatDate, monthLabel } from '@/lib/utils/dates'
import type { Factura } from '@/types/domain'
import { AbonoModal } from './AbonoModal'

export function AbonosPage() {
  const { data, isLoading, isError, error, refetch } = useFacturas()
  const deleteFactura = useDeleteFactura()
  const year = useYearStore((s) => s.year)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Factura | null>(null)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const abonos = useMemo(() => {
    return (data ?? [])
      .filter((f) => f.tipo === 'Abono' && (f.fecha ?? '').slice(0, 4) === String(year))
      .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  }, [data, year])

  const groups = useMemo(() => {
    const map = new Map<string, Factura[]>()
    for (const a of abonos) {
      const key = (a.fecha ?? '0000-00').slice(0, 7)
      const bucket = map.get(key)
      if (bucket) {
        bucket.push(a)
      } else {
        map.set(key, [a])
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => {
        const total = items.reduce((sum, item) => sum + item.importe, 0)
        return {
          key,
          label: key === '0000-00' ? 'Sin fecha' : monthLabel(key),
          items,
          total,
        }
      })
  }, [abonos])

  const total = abonos.reduce((sum, a) => sum + a.importe, 0)

  const isOpen = (key: string) => overrides[key] ?? false

  function toggle(key: string) {
    setOverrides((prev) => ({ ...prev, [key]: !isOpen(key) }))
  }

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-xl border border-purple-500/30 px-4 py-2.5 text-sm font-bold text-slate-200 transition-all hover:bg-white/5 shadow-lg glow-purple glow-purple-hover"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] shrink-0 animate-pulse"></span>
            <RefreshCw className="h-4 w-4 text-purple-400" />
            Actualizar
          </button>
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
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 glass-card">
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/5">
                {groups.map((g) => (
                  <AbonoGroupRow
                    key={g.key}
                    groupKey={g.key}
                    label={g.label}
                    count={g.items.length}
                    total={g.total}
                    open={isOpen(g.key)}
                    onToggle={() => toggle(g.key)}
                    items={g.items}
                    onEdit={(a) => {
                      setEditing(a)
                      setModalOpen(true)
                    }}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/5 glass-card px-6 py-4">
            <span className="text-sm text-slate-400">
              {abonos.length} abono{abonos.length !== 1 ? 's' : ''}
            </span>
            <span className="text-lg font-black text-emerald-400">
              + {formatMoney(total)}
            </span>
          </div>
        </>
      )}

      {modalOpen && (
        <AbonoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          abono={editing}
          activeYear={year}
        />
      )}
    </div>
  )
}

function AbonoGroupRow({
  groupKey,
  label,
  count,
  total,
  open,
  onToggle,
  items,
  onEdit,
  onDelete,
}: {
  groupKey: string
  label: string
  count: number
  total: number
  open: boolean
  onToggle: () => void
  items: Factura[]
  onEdit: (a: Factura) => void
  onDelete: (a: Factura) => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer select-none bg-white/5 transition-colors hover:bg-white/10"
        onClick={onToggle}
      >
        <td colSpan={5} className="px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
              />
              <span className="text-sm font-bold capitalize text-slate-200">{label}</span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-xs font-bold text-slate-500">
                {count} abono{count !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-sm font-extrabold text-emerald-400">
              + {formatMoney(total)}
            </span>
          </div>
        </td>
      </tr>
      {open &&
        items.map((a) => (
          <tr
            key={`${groupKey}-${a.id}`}
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
                  onClick={() => onEdit(a)}
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
    </>
  )
}
