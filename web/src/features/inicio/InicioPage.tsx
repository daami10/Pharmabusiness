import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, FileText, Landmark, TrendingUp, Users } from 'lucide-react'
import { useFacturas } from '@/lib/queries/facturas'
import { useFiscalidad } from '@/lib/queries/fiscalidad'
import { useNominas, useSeguros } from '@/lib/queries/trabajadores'
import { useYearStore } from '@/stores/yearStore'
import { formatMoney } from '@/lib/utils/money'
import { monthLabel } from '@/lib/utils/dates'
import { computeInicioKpis } from './lib/inicio-view'
import { PrevisionModal } from './PrevisionModal'

export function InicioPage() {
  const navigate = useNavigate()
  const year = useYearStore((s) => s.year)
  const facturas = useFacturas()
  const fiscal = useFiscalidad()
  const nominas = useNominas()
  const seguros = useSeguros()
  const [previsionOpen, setPrevisionOpen] = useState(false)

  const monthKey = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const kpis = useMemo(
    () =>
      computeInicioKpis(
        {
          facturas: facturas.data ?? [],
          fiscal: fiscal.data ?? [],
          nominas: nominas.data ?? [],
          seguros: seguros.data ?? [],
        },
        monthKey,
      ),
    [facturas.data, fiscal.data, nominas.data, seguros.data, monthKey],
  )

  const cards = [
    {
      to: '/facturas',
      icon: FileText,
      color: 'text-blue-400',
      label: 'Facturas',
      amount: kpis.facturas.total,
      desc: `${kpis.facturas.count} factura${kpis.facturas.count !== 1 ? 's' : ''} este mes`,
    },
    {
      to: '/abonos',
      icon: BarChart3,
      color: 'text-emerald-400',
      label: 'Abonos',
      amount: kpis.abonos.total,
      desc: `${kpis.abonos.count} abono${kpis.abonos.count !== 1 ? 's' : ''} recibido${kpis.abonos.count !== 1 ? 's' : ''}`,
    },
    {
      to: '/fiscalidad',
      icon: Landmark,
      color: 'text-purple-400',
      label: 'Fiscalidad',
      amount: kpis.fiscal.total,
      desc: `${kpis.fiscal.count} impuesto${kpis.fiscal.count !== 1 ? 's' : ''} / tasa${kpis.fiscal.count !== 1 ? 's' : ''}`,
    },
    {
      to: '/trabajadores',
      icon: Users,
      color: 'text-orange-400',
      label: 'Trabajadores',
      amount: kpis.trabajadores.total,
      desc: `${kpis.trabajadores.nominas} nómina${kpis.trabajadores.nominas !== 1 ? 's' : ''} y ${kpis.trabajadores.seguros} seguro${kpis.trabajadores.seguros !== 1 ? 's' : ''}`,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Inicio</h1>
          <p className="mt-1 text-sm capitalize text-slate-400">
            Resumen de {monthLabel(monthKey)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPrevisionOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition-all hover:opacity-90"
        >
          <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
          Previsión de gasto
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.to}
            type="button"
            onClick={() => navigate(c.to)}
            className="rounded-2xl border border-white/5 bg-white/5 p-5 text-left shadow-xl transition-all hover:bg-white/10"
          >
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <p className="mt-4 text-2xl font-black leading-none text-white">
              {formatMoney(c.amount)}
            </p>
            <p className="mt-2 text-xs text-slate-400">{c.desc}</p>
            <p className="mt-1 text-2xs font-bold uppercase tracking-wider text-slate-500">
              {c.label}
            </p>
          </button>
        ))}
      </div>

      <PrevisionModal open={previsionOpen} onClose={() => setPrevisionOpen(false)} />
    </div>
  )
}
