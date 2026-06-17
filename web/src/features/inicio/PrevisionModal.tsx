import { useMemo, useState } from 'react'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useFacturas, useDeleteFactura } from '@/lib/queries/facturas'
import { useFiscalidad } from '@/lib/queries/fiscalidad'
import { useNominas, useSeguros } from '@/lib/queries/trabajadores'
import { formatMoney } from '@/lib/utils/money'
import { buildPrevision } from './lib/inicio-view'
import type { PrevisionSection } from './lib/inicio-view'
import type { Factura } from '@/types/domain'
import { useYearStore } from '@/stores/yearStore'
import { FacturaModal } from '../facturas/FacturaModal'

function InvoiceSubList({
  invoices,
  onEdit,
  onDelete,
}: {
  invoices: Factura[]
  onEdit: (f: Factura) => void
  onDelete: (f: Factura) => void
}) {
  if (!invoices.length) return null
  return (
    <div className="mb-3">
      <h4 className="mb-1.5 text-2xs font-extrabold uppercase tracking-wider text-blue-400">
        Facturas proveedores
      </h4>
      <div className="space-y-1.5">
        {invoices.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3.5 py-2 text-xs"
          >
            <span className="truncate text-slate-300 flex-1 mr-2">
              {f.laboratorio || 'Proveedor'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-white mr-1.5">
                {formatMoney(f.importe)}
              </span>
              <button
                type="button"
                onClick={() => onEdit(f)}
                className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
                aria-label="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(f)}
                className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/5 hover:text-red-400"
                aria-label="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubList({
  title,
  color,
  rows,
}: {
  title: string
  color: string
  rows: { label: string; importe: number }[]
}) {
  if (!rows.length) return null
  return (
    <div className="mb-3">
      <h4 className={`mb-1.5 text-2xs font-extrabold uppercase tracking-wider ${color}`}>
        {title}
      </h4>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={`${r.label}-${i}`}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3.5 py-2.5 text-xs"
          >
            <span className="truncate text-slate-300">{r.label}</span>
            <span className="shrink-0 font-bold text-white">
              {formatMoney(r.importe)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthCard({
  section,
  defaultOpen,
  onEditInvoice,
  onDeleteInvoice,
}: {
  section: PrevisionSection
  defaultOpen: boolean
  onEditInvoice: (f: Factura) => void
  onDeleteInvoice: (f: Factura) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
      >
        <span className="flex items-center gap-3">
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <span className="text-sm font-extrabold capitalize text-slate-100">
            {section.label}
          </span>
        </span>
        <span className="text-sm font-black text-accent-blue">
          {formatMoney(section.total)}
        </span>
      </button>
      {open && (
        <div className="border-t border-white/5 px-5 pb-5 pt-3">
          <InvoiceSubList
            invoices={section.invoices}
            onEdit={onEditInvoice}
            onDelete={onDeleteInvoice}
          />
          <SubList
            title="Impuestos y fiscalidad"
            color="text-emerald-400"
            rows={section.taxes.map((t) => ({ label: t.concepto, importe: t.importe }))}
          />
          <SubList
            title="Nóminas"
            color="text-orange-400"
            rows={section.payrolls.map((n) => ({
              label: n.trabajador_nombre || 'Trabajador',
              importe: n.importe,
            }))}
          />
          <SubList
            title="Seguros sociales"
            color="text-indigo-400"
            rows={section.seguros.map((s) => ({
              label: 'Seguridad Social',
              importe: s.importe,
            }))}
          />
        </div>
      )}
    </div>
  )
}

export function PrevisionModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const facturas = useFacturas()
  const fiscal = useFiscalidad()
  const nominas = useNominas()
  const seguros = useSeguros()

  const year = useYearStore((s) => s.year)
  const [editing, setEditing] = useState<Factura | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const deleteFactura = useDeleteFactura()

  function handleEditInvoice(f: Factura) {
    setEditing(f)
    setModalOpen(true)
  }

  function handleDeleteInvoice(f: Factura) {
    if (!confirm(`¿Eliminar la factura de ${f.laboratorio}?`)) return
    deleteFactura.mutate(f.id)
  }

  const sections = useMemo(() => {
    const now = new Date()
    return buildPrevision(
      {
        facturas: facturas.data ?? [],
        fiscal: fiscal.data ?? [],
        nominas: nominas.data ?? [],
        seguros: seguros.data ?? [],
      },
      now.getFullYear(),
      now.getMonth() + 1,
    )
  }, [facturas.data, fiscal.data, nominas.data, seguros.data])

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Previsión de gasto">
        {!sections.length ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No hay gastos previstos para los próximos meses.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {sections.map((s, idx) => (
              <MonthCard
                key={s.key}
                section={s}
                defaultOpen={idx === 0}
                onEditInvoice={handleEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
              />
            ))}
          </div>
        )}
      </Dialog>

      <FacturaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        factura={editing}
        activeYear={year}
      />
    </>
  )
}
