import { useMemo, useState, useRef } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, FileText, Landmark, TrendingUp, Users, Plus, Sparkles, ChevronRight, FileUp } from 'lucide-react'
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
  const [fastActionOpen, setFastActionOpen] = useState(false)
  const [dragging, setDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

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
      bgIcon: 'bg-blue-500/10 hover:bg-blue-500/20',
      label: 'Facturas',
      amount: kpis.facturas.total,
      desc: `${kpis.facturas.count} factura${kpis.facturas.count !== 1 ? 's' : ''} este mes`,
      hoverCls: 'glow-blue glow-blue-hover',
    },
    {
      to: '/abonos',
      icon: BarChart3,
      color: 'text-emerald-400',
      bgIcon: 'bg-emerald-500/10 hover:bg-emerald-500/20',
      label: 'Abonos',
      amount: kpis.abonos.total,
      desc: `${kpis.abonos.count} abono${kpis.abonos.count !== 1 ? 's' : ''} recibido${kpis.abonos.count !== 1 ? 's' : ''}`,
      hoverCls: 'glow-emerald glow-emerald-hover',
    },
    {
      to: '/fiscalidad',
      icon: Landmark,
      color: 'text-purple-400',
      bgIcon: 'bg-purple-500/10 hover:bg-purple-500/20',
      label: 'Fiscalidad',
      amount: kpis.fiscal.total,
      desc: `${kpis.fiscal.count} impuesto${kpis.fiscal.count !== 1 ? 's' : ''} / tasa${kpis.fiscal.count !== 1 ? 's' : ''}`,
      hoverCls: 'glow-purple glow-purple-hover',
    },
    {
      to: '/trabajadores',
      icon: Users,
      color: 'text-teal-400',
      bgIcon: 'bg-teal-500/10 hover:bg-teal-500/20',
      label: 'Personal',
      amount: kpis.trabajadores.total,
      desc: `${kpis.trabajadores.nominas} nómina${kpis.trabajadores.nominas !== 1 ? 's' : ''} y ${kpis.trabajadores.seguros} seguro${kpis.trabajadores.seguros !== 1 ? 's' : ''}`,
      hoverCls: 'glow-teal glow-teal-hover',
    },
  ]

  // Lanza el escaneo IA: navega a Facturas abriendo el modal con el archivo.
  const scanFile = (file: File | undefined) => {
    if (file) navigate('/facturas', { state: { openCreate: true, scanFile: file } })
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    scanFile(e.target.files?.[0])
  }

  // Drag & drop: la zona resalta al arrastrar; además se acepta soltar el archivo
  // en cualquier punto de Inicio (paridad con el drop global del legacy).
  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setDragging(true)
    }
  }
  const onDragLeave = (e: DragEvent) => {
    // Solo desactivar al salir del contenedor, no al pasar entre hijos.
    if (e.currentTarget === e.target) setDragging(false)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    scanFile(e.dataTransfer.files?.[0])
  }

  const triggerFastAction = (action: string) => {
    setFastActionOpen(false)
    if (action === 'scan-factura') {
      navigate('/facturas', { state: { openCreate: true, triggerOcr: true } })
    } else if (action === 'add-factura') {
      navigate('/facturas', { state: { openCreate: true } })
    } else if (action === 'add-nomina') {
      navigate('/trabajadores', { state: { openNomina: true } })
    } else if (action === 'add-seguro') {
      navigate('/trabajadores', { state: { openSeguro: true } })
    } else if (action === 'add-fiscal') {
      navigate('/fiscalidad', { state: { openFiscal: true } })
    }
  }

  return (
    <div
      className="mx-auto max-w-7xl px-6 py-8 fade-in"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Inicio</h1>
          <p className="mt-1 text-sm text-slate-400">
            Resumen general de tu farmacia para{' '}
            <span className="font-semibold text-slate-200 capitalize">
              {monthLabel(monthKey)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPrevisionOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <TrendingUp className="h-4.5 w-4.5 text-slate-950" strokeWidth={2.5} />
            Previsión de gasto
          </button>

          {/* Nuevo Registro Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setFastActionOpen((o) => !o)
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-[#00f2fe] px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4 text-slate-950" strokeWidth={2.5} />
              Nuevo Registro
            </button>
            {fastActionOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setFastActionOpen(false)}
                />
                <div className="absolute right-0 mt-2.5 w-56 rounded-xl bg-slate-900/95 border border-white/10 backdrop-blur-md shadow-2xl py-2 z-50 text-slate-300">
                  <button
                    type="button"
                    onClick={() => triggerFastAction('scan-factura')}
                    className="w-full text-left px-4 py-2.5 text-xs hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-[#00f2fe]" />
                    Escanear Factura con IA
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFastAction('add-factura')}
                    className="w-full text-left px-4 py-2.5 text-xs hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 text-blue-400" />
                    Nueva Factura (Manual)
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFastAction('add-nomina')}
                    className="w-full text-left px-4 py-2.5 text-xs hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Users className="h-4 w-4 text-teal-400" />
                    Registrar Nómina
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFastAction('add-seguro')}
                    className="w-full text-left px-4 py-2.5 text-xs hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Landmark className="h-4 w-4 text-orange-400" />
                    Registrar Seguro Social
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFastAction('add-fiscal')}
                    className="w-full text-left px-4 py-2.5 text-xs hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Landmark className="h-4 w-4 text-purple-400" />
                    Añadir Impuesto / Tasa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {cards.map((c) => (
          <button
            key={c.to}
            type="button"
            onClick={() => navigate(c.to)}
            className={`glass-card rounded-2xl p-5 transition-all duration-300 text-left group ${c.hoverCls}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`p-2.5 rounded-xl ${c.bgIcon} ${c.color} transition-all`}>
                <c.icon className="h-5 w-5" />
              </span>
              <span className={`text-2xs font-bold text-slate-500 group-hover:${c.color} transition-colors uppercase tracking-wider`}>
                {c.label}
              </span>
            </div>
            <p className="text-2xl font-black leading-none text-white mb-1">
              {formatMoney(c.amount)}
            </p>
            <p className="text-xs text-slate-400">{c.desc}</p>
          </button>
        ))}
      </div>

      {/* Quick Actions & Drag-and-drop zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drag and drop card */}
        <div className="lg:col-span-2 bg-[#0d1b32]/40 backdrop-blur-md border border-[#00f2fe]/10 rounded-2xl p-6 shadow-2xl flex flex-col justify-between min-h-[250px] glass-card">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-6 bg-gradient-to-b from-[#00f2fe] to-blue-500 rounded-full"></span>
              <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">Carga Rápida con IA</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              ¿Tienes una factura a mano? Arrástrala directamente aquí o haz clic abajo para subir una foto.
              Gemini leerá el importe, el laboratorio y el vencimiento automáticamente por ti.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 py-8 group ${
              dragging
                ? 'border-[#00f2fe]/60 bg-[#00f2fe]/10'
                : 'border-white/10 hover:border-[#00f2fe]/40 hover:bg-[#00f2fe]/5'
            }`}
          >
            <FileUp
              className={`h-8 w-8 transition-colors ${
                dragging ? 'text-[#00f2fe]' : 'text-slate-500 group-hover:text-[#00f2fe]'
              }`}
            />
            <span className="text-xs text-slate-300 group-hover:text-white transition-colors font-bold">
              {dragging ? 'Suelta la factura para escanearla' : 'Arrastra o haz clic para escanear factura'}
            </span>
            <span className="text-3xs text-slate-500">Soporta imágenes de facturas (Gemini IA)</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Quick actions list card */}
        <div className="glass-card border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-6 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full"></span>
              <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">Acciones Rápidas</h3>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => triggerFastAction('scan-factura')}
                className="w-full flex items-center justify-between p-3.5 bg-white/3 hover:bg-white/8 rounded-xl border border-white/5 transition-all text-left text-sm font-semibold text-slate-200 hover:text-white group"
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="h-4.5 w-4.5 text-[#00f2fe]" />
                  Escanear Factura con IA
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => triggerFastAction('add-factura')}
                className="w-full flex items-center justify-between p-3.5 bg-white/3 hover:bg-white/8 rounded-xl border border-white/5 transition-all text-left text-sm font-semibold text-slate-200 hover:text-white group"
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="h-4.5 w-4.5 text-blue-400" />
                  Nueva Factura Manual
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => triggerFastAction('add-nomina')}
                className="w-full flex items-center justify-between p-3.5 bg-white/3 hover:bg-white/8 rounded-xl border border-white/5 transition-all text-left text-sm font-semibold text-slate-200 hover:text-white group"
              >
                <span className="flex items-center gap-2.5">
                  <Users className="h-4.5 w-4.5 text-teal-400" />
                  Registrar Nómina
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => triggerFastAction('add-seguro')}
                className="w-full flex items-center justify-between p-3.5 bg-white/3 hover:bg-white/8 rounded-xl border border-white/5 transition-all text-left text-sm font-semibold text-slate-200 hover:text-white group"
              >
                <span className="flex items-center gap-2.5">
                  <Landmark className="h-4.5 w-4.5 text-orange-400" />
                  Registrar Seguro Social
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>
              
              <button
                type="button"
                onClick={() => triggerFastAction('add-fiscal')}
                className="w-full flex items-center justify-between p-3.5 bg-white/3 hover:bg-white/8 rounded-xl border border-white/5 transition-all text-left text-sm font-semibold text-slate-200 hover:text-white group"
              >
                <span className="flex items-center gap-2.5">
                  <Landmark className="h-4.5 w-4.5 text-purple-400" />
                  Añadir Impuesto / Tasa
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
          <p className="text-3xs text-slate-500 text-center mt-4">
            Usa el menú superior o estos enlaces para añadir información.
          </p>
        </div>
      </div>

      <PrevisionModal open={previsionOpen} onClose={() => setPrevisionOpen(false)} />
    </div>
  )
}
