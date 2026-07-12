import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import {
  useNominas,
  useSeguros,
  useDeleteNomina,
  useDeleteSeguro,
} from '@/lib/queries/trabajadores'
import { useYearStore } from '@/stores/yearStore'
import { useLocation } from 'react-router-dom'
import { formatMoney } from '@/lib/utils/money'
import { formatDate } from '@/lib/utils/dates'
import { buildMonthSections } from '@/lib/utils/monthGroups'
import { MonthGroupAccordion } from '@/components/MonthGroupAccordion'
import type { Nomina, Seguro } from '@/types/domain'
import { NominaModal } from './NominaModal'
import { SeguroModal } from './SeguroModal'
import { TrabajadorModal } from './TrabajadorModal'
import { useTranslation } from '@/lib/i18n'

function badge(isFuture: boolean, future: string, past: string) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
        isFuture ? 'bg-orange-500/10 text-orange-400' : 'bg-white/5 text-slate-400'
      }`}
    >
      {isFuture ? future : past}
    </span>
  )
}

const actionsCls = 'rounded-xl p-1.5 text-slate-400 transition-all hover:bg-white/5'

export function TrabajadoresPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const showCurrentMonth = location.state?.fromHome
  const year = useYearStore((s) => s.year)
  const nominas = useNominas()
  const seguros = useSeguros()
  const deleteNomina = useDeleteNomina()
  const deleteSeguro = useDeleteSeguro()
  const currentMonthKey = useMemo(() => {
    const now = new Date()
    return `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [year])

  const [nominaModal, setNominaModal] = useState(false)
  const [editNomina, setEditNomina] = useState<Nomina | null>(null)
  const [seguroModal, setSeguroModal] = useState(false)
  const [editSeguro, setEditSeguro] = useState<Seguro | null>(null)
  const [trabModal, setTrabModal] = useState(false)

  const yearStr = String(year)
  const nominasYear = useMemo(
    () => (nominas.data ?? []).filter((n) => (n.fecha ?? '').slice(0, 4) === yearStr),
    [nominas.data, yearStr],
  )
  const segurosYear = useMemo(
    () => (seguros.data ?? []).filter((s) => (s.fecha ?? '').slice(0, 4) === yearStr),
    [seguros.data, yearStr],
  )

  const nominaGroups = useMemo(
    () =>
      buildMonthSections(nominasYear, {
        getFecha: (n) => n.fecha,
        getImporte: (n) => n.importe,
        nounPast: 'nómina',
        nounFuture: 'prevista',
      }),
    [nominasYear],
  )
  const seguroGroups = useMemo(
    () =>
      buildMonthSections(segurosYear, {
        getFecha: (s) => s.fecha,
        getImporte: (s) => s.importe,
        nounPast: 'entrada',
        nounFuture: 'previsto',
      }),
    [segurosYear],
  )

  const nominaTotal = nominasYear.reduce((s, n) => s + n.importe, 0)
  const seguroTotal = segurosYear.reduce((s, n) => s + n.importe, 0)

  const renderNomina = (n: Nomina, isFuture: boolean) => (
    <tr key={n.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
      <td className="px-6 py-4 text-sm font-extrabold text-white">
        {n.trabajador_nombre || '—'}
        <span className="mt-0.5 block text-2xs font-normal text-slate-500">{formatDate(n.fecha)}</span>
      </td>
      <td className="px-6 py-4">{badge(isFuture, t('trabajadores.badge.prevista', 'Prevista'), t('trabajadores.badge.registrada', 'Registrada'))}</td>
      <td className="px-6 py-4 text-right text-sm font-extrabold text-white">
        {formatMoney(n.importe)}
      </td>
      <td className="px-6 py-4 text-sm text-slate-400">{n.concepto ?? ''}</td>
      <td className="px-6 py-4 text-right">
        <span className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditNomina(n)
              setNominaModal(true)
            }}
            className={`${actionsCls} hover:text-white`}
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => confirm(t('trabajadores.confirm_delete_nomina', '¿Eliminar esta nómina?')) && deleteNomina.mutate(n.id)}
            className={`${actionsCls} hover:text-red-400`}
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </td>
    </tr>
  )

  const renderSeguro = (s: Seguro, isFuture: boolean) => (
    <tr key={s.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
      <td className="px-6 py-4">
        <span className="flex items-center gap-2">
          {badge(isFuture, t('trabajadores.badge.previsto', 'Previsto'), t('trabajadores.badge.registrado', 'Registrado'))}
          <span className="text-2xs text-slate-500">{formatDate(s.fecha)}</span>
        </span>
      </td>
      <td className="px-6 py-4 text-right text-sm font-extrabold text-white">
        {formatMoney(s.importe)}
      </td>
      <td className="px-6 py-4 text-sm text-slate-400">{s.notas ?? ''}</td>
      <td className="px-6 py-4 text-right">
        <span className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditSeguro(s)
              setSeguroModal(true)
            }}
            className={`${actionsCls} hover:text-white`}
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              confirm(t('trabajadores.confirm_delete_seguro', '¿Eliminar esta entrada?')) && deleteSeguro.mutate(s.id)
            }
            className={`${actionsCls} hover:text-red-400`}
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </td>
    </tr>
  )

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {t('trabajadores.title', 'Gestión de Trabajadores')}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {t('trabajadores.subtitle', 'Control de nóminas, cotizaciones y permisos de acceso del equipo')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTrabModal(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/5"
        >
          <Users className="h-4 w-4" />
          {t('trabajadores.button.nuevo', 'Nuevo trabajador')}
        </button>
      </div>

      {/* Nóminas */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">{t('inicio.nominas', 'Nóminas')}</h2>
          <button
            type="button"
            onClick={() => {
              setEditNomina(null)
              setNominaModal(true)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-accent-blue px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t('trabajadores.new_nomina', 'Nueva nómina')}
          </button>
        </div>
        {nominaGroups.length ? (
          <>
            <MonthGroupAccordion
              groups={nominaGroups}
              colSpan={5}
              renderRow={renderNomina}
              defaultExpandedKey={showCurrentMonth ? currentMonthKey : undefined}
            />
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('trabajadores.total_nominas', 'Total nóminas')} {year}
              </span>
              <span className="text-base font-black text-accent-blue">
                {formatMoney(nominaTotal)}
              </span>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            {t('trabajadores.no_nominas', 'No hay nóminas registradas en este periodo.')}
          </p>
        )}
      </section>

      {/* Seguros */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">{t('trabajadores.seguros_sociales', 'Seguros Sociales')}</h2>
          <button
            type="button"
            onClick={() => {
              setEditSeguro(null)
              setSeguroModal(true)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-accent-blue px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t('trabajadores.button.nuevo_seguro', 'Nuevo seguro')}
          </button>
        </div>
        {seguroGroups.length ? (
          <>
            <MonthGroupAccordion
              groups={seguroGroups}
              colSpan={4}
              renderRow={renderSeguro}
              defaultExpandedKey={showCurrentMonth ? currentMonthKey : undefined}
            />
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('trabajadores.total_seguros', 'Total seguros')} {year}
              </span>
              <span className="text-base font-black text-accent-blue">
                {formatMoney(seguroTotal)}
              </span>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            {t('trabajadores.no_seguros', 'No hay seguros sociales registrados en este periodo.')}
          </p>
        )}
      </section>

      <NominaModal
        open={nominaModal}
        onClose={() => setNominaModal(false)}
        nomina={editNomina}
      />
      <SeguroModal
        open={seguroModal}
        onClose={() => setSeguroModal(false)}
        seguro={editSeguro}
      />
      <TrabajadorModal open={trabModal} onClose={() => setTrabModal(false)} />
    </div>
  )
}
