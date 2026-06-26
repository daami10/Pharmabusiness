import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldCheck, Store, Award, Sparkles, Clock, Search, RefreshCw } from 'lucide-react'

interface AdminOrg {
  id: string
  nombre: string
  plan: 'basico' | 'premium'
  subscription_status: string
  created_at: string
  trial_ends_at: string | null
  memberships: {
    email: string | null
    role: string
  }[]
}

export function AdminDashboardPage() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [now, setNow] = useState(() => Date.now())

  async function fetchOrgs() {
    setNow(Date.now())
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('organizations')
        .select(`
          id,
          nombre,
          plan,
          subscription_status,
          created_at,
          trial_ends_at,
          memberships (
            email,
            role
          )
        `)
      if (err) throw err
      setOrgs((data as unknown as AdminOrg[]) || [])
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Error al cargar los datos del panel.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    const init = async () => {
      await Promise.resolve()
      if (!ignore) {
        fetchOrgs()
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

  // Calculate KPIs
  const kpis = {
    total: orgs.length,
    basic: orgs.filter(o => o.plan === 'basico' && o.subscription_status === 'active').length,
    premium: orgs.filter(o => o.plan === 'premium' && o.subscription_status === 'active').length,
    trial: orgs.filter(o => o.subscription_status === 'trialing').length,
  }

  // Filter organizations by search term
  const filteredOrgs = orgs.filter((org) => {
    const ownerEmail = org.memberships.find(m => m.role === 'titular')?.email || ''
    const matchName = org.nombre.toLowerCase().includes(search.toLowerCase())
    const matchEmail = ownerEmail.toLowerCase().includes(search.toLowerCase())
    return matchName || matchEmail
  })

  function formatDateString(dateStr: string) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  function getTrialDaysLeft(trialEndsAt: string | null) {
    if (!trialEndsAt) return 0
    const diff = new Date(trialEndsAt).getTime() - now
    return Math.max(0, Math.ceil(diff / 86_400_000))
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-6 w-6 text-[#00f2fe]" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Panel de Control Admin
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Monitorización y estado de licencias de farmacias en tiempo real
          </p>
        </div>
        <button
          type="button"
          onClick={fetchOrgs}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar datos
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* KPI: Total Farmacias */}
        <div className="rounded-2xl border border-white/5 bg-[#0b121f]/60 p-6 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Farmacias</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{kpis.total}</div>
          <p className="text-2xs text-slate-500 mt-2">Farmacias registradas en el sistema</p>
        </div>

        {/* KPI: Plan Básico Activo */}
        <div className="rounded-2xl border border-white/5 bg-[#0b121f]/60 p-6 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Básico Activo</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-300">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{kpis.basic}</div>
          <p className="text-2xs text-slate-500 mt-2">Planes básicos con facturación activa</p>
        </div>

        {/* KPI: Plan Premium Activo */}
        <div className="rounded-2xl border border-white/5 bg-[#0b121f]/60 p-6 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Premium Activo</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{kpis.premium}</div>
          <p className="text-2xs text-slate-500 mt-2">Suscripciones premium activas</p>
        </div>

        {/* KPI: Periodo de Prueba */}
        <div className="rounded-2xl border border-white/5 bg-[#0b121f]/60 p-6 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Periodo de Prueba</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{kpis.trial}</div>
          <p className="text-2xs text-slate-500 mt-2">Farmacias evaluando la app (14 días)</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-2xl border border-white/5 bg-[#0a111c]/50 backdrop-blur-md overflow-hidden">
        {/* Search Bar */}
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por farmacia o correo del dueño..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-400 font-semibold">
            Mostrando {filteredOrgs.length} de {orgs.length} farmacias
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="py-24 text-center text-sm text-slate-400">
            Cargando farmacias...
          </div>
        ) : error ? (
          <div className="py-24 text-center text-sm text-red-400">
            ⚠️ {error}
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="py-24 text-center text-sm text-slate-500">
            No se encontraron farmacias con los filtros especificados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/20 text-2xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Farmacia</th>
                  <th className="px-6 py-4">Titular (Dueño)</th>
                  <th className="px-6 py-4">Fecha Registro</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Límite Prueba / Fin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrgs.map((org) => {
                  const owner = org.memberships.find(m => m.role === 'titular');
                  const daysLeft = getTrialDaysLeft(org.trial_ends_at);
                  const isTrial = org.subscription_status === 'trialing';

                  return (
                    <tr key={org.id} className="hover:bg-white/[0.02] transition-colors text-sm text-slate-300">
                      <td className="px-6 py-4 font-bold text-white">{org.nombre}</td>
                      <td className="px-6 py-4 font-mono text-xs">{owner?.email || '-'}</td>
                      <td className="px-6 py-4">{formatDateString(org.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                          org.plan === 'premium'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                        }`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                          org.subscription_status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isTrial
                              ? daysLeft > 0 
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {org.subscription_status === 'active'
                            ? 'Activo'
                            : isTrial
                              ? daysLeft > 0 ? 'En Prueba' : 'Prueba Expirada'
                              : 'Cancelado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">
                        {isTrial ? (
                          daysLeft > 0 ? (
                            <span className="text-teal-400">{daysLeft} días restantes</span>
                          ) : (
                            <span className="text-red-400">Caducada</span>
                          )
                        ) : (
                          <span className="text-slate-500">No aplica (De pago)</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
