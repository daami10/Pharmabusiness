import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { WholesalersEditor } from '@/components/WholesalersEditor'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  User,
  ShieldAlert,
  Edit2,
  RefreshCw,
  X
} from 'lucide-react'

interface Member {
  user_id: string
  role: 'titular' | 'empleado'
  custom_name: string | null
  email: string | null
  permissions: Record<string, boolean>
  created_at: string
}

interface Invitation {
  id: string
  email: string
  custom_name: string
  role: 'titular' | 'empleado'
  permissions: Record<string, boolean>
  created_at: string
}

const DEFAULT_PERMISSIONS = {
  facturas_read: true,
  facturas_write: true,
  abonos_read: true,
  abonos_write: false,
  analisis_read: false,
  fiscalidad_read: false,
  trabajadores_read: false,
}

const PERMISSION_LABELS: Record<string, string> = {
  facturas_read: 'Ver Facturas',
  facturas_write: 'Subir/Editar Facturas',
  abonos_read: 'Ver Abonos',
  abonos_write: 'Gestionar Abonos',
  analisis_read: 'Ver Análisis y Gráficos',
  fiscalidad_read: 'Ver Fiscalidad',
  trabajadores_read: 'Ver Trabajadores y Nóminas',
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wholesalers = useWholesalersStore((s) => s.wholesalers)
  const setWholesalers = useWholesalersStore((s) => s.setWholesalers)
  const { subscriptionTier, activeOrgId, userRole, session } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'wholesalers' | 'users'>('wholesalers')
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')

  // Wholesalers draft state
  const [draft, setDraft] = useState<string[]>(wholesalers)
  const [wholesalerError, setWholesalerError] = useState('')

  // Users Management states
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePermissions, setInvitePermissions] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS)
  const [submittingInvite, setSubmittingInvite] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [editingPermissionsUserId, setEditingPermissionsUserId] = useState<string | null>(null)
  const [editPermissionsDraft, setEditPermissionsDraft] = useState<Record<string, boolean>>({})

  // Load members and invitations when users tab is active
  useEffect(() => {
    if (open && activeTab === 'users' && subscriptionTier === 'premium' && activeOrgId) {
      loadUsersData()
    }
  }, [open, activeTab, subscriptionTier, activeOrgId])

  async function loadUsersData() {
    setLoadingUsers(true)
    try {
      // 1. Fetch active memberships
      const { data: mems, error: memsError } = await supabase
        .from('memberships')
        .select('user_id, role, custom_name, email, permissions, created_at')
        .eq('org_id', activeOrgId)
      
      if (memsError) throw memsError
      setMembers((mems as unknown as Member[]) || [])

      // 2. Fetch pending invitations
      const { data: invs, error: invsError } = await supabase
        .from('invitations')
        .select('id, email, custom_name, role, permissions, created_at')
        .eq('org_id', activeOrgId)

      if (invsError) throw invsError
      setInvitations((invs as unknown as Invitation[]) || [])
    } catch (err) {
      console.error('Error fetching users and invitations:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const seatsUsed = members.length + invitations.length

  function saveWholesalers() {
    if (draft.length === 0) {
      setWholesalerError('Selecciona al menos un mayorista.')
      return
    }
    setWholesalers(draft, activeOrgId)
    onClose()
  }

  async function handleManageBilling() {
    setBillingLoading(true)
    setBillingError('')
    try {
      const token = session?.access_token
      if (!token) throw new Error('No se encontró sesión de usuario.')

      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al conectar con la gestión de facturación.')
      }

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No se recibió la URL de facturación.')
      }
    } catch (err) {
      console.error(err)
      setBillingError(
        err instanceof Error ? err.message : 'Error al conectar con Stripe.',
      )
      setBillingLoading(false)
    }
  }

  // Invite worker submission
  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (seatsUsed >= 3) {
      setInviteError('Límite de 3 usuarios alcanzado.')
      return
    }
    if (!inviteEmail || !inviteName) {
      setInviteError('Por favor introduce email y nombre.')
      return
    }

    setSubmittingInvite(true)
    setInviteError('')
    try {
      const { error } = await supabase.from('invitations').insert({
        org_id: activeOrgId,
        email: inviteEmail.trim(),
        custom_name: inviteName.trim(),
        permissions: invitePermissions,
        role: 'empleado',
      })

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe una invitación pendiente para este correo.')
        }
        throw error
      }

      // Reset invite form
      setInviteEmail('')
      setInviteName('')
      setInvitePermissions(DEFAULT_PERMISSIONS)
      setInviting(false)

      await loadUsersData()
    } catch (err: any) {
      console.error(err)
      setInviteError(err.message || 'Error al crear la invitación.')
    } finally {
      setSubmittingInvite(false)
    }
  }

  // Revoke active user access
  async function handleRevokeMember(userId: string, name: string) {
    if (!confirm(`¿Estás seguro de que deseas dar de baja a ${name || 'este trabajador'}? Perderá acceso inmediato.`)) return
    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('org_id', activeOrgId)
        .eq('user_id', userId)

      if (error) throw error
      await loadUsersData()
    } catch (err) {
      console.error('Error revoking member access:', err)
    }
  }

  // Cancel pending invitation
  async function handleCancelInvitation(invId: string, email: string) {
    if (!confirm(`¿Cancelar la invitación enviada a ${email}?`)) return
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('org_id', activeOrgId)
        .eq('id', invId)

      if (error) throw error
      await loadUsersData()
    } catch (err) {
      console.error('Error canceling invitation:', err)
    }
  }

  // Save modified permissions for active user
  async function handleSavePermissions(userId: string) {
    try {
      const { error } = await supabase
        .from('memberships')
        .update({ permissions: editPermissionsDraft })
        .eq('org_id', activeOrgId)
        .eq('user_id', userId)

      if (error) throw error
      setEditingPermissionsUserId(null)
      await loadUsersData()
    } catch (err) {
      console.error('Error updating member permissions:', err)
    }
  }

  function handlePermissionToggle(key: string, isDraft: boolean) {
    if (isDraft) {
      setEditPermissionsDraft(prev => ({ ...prev, [key]: !prev[key] }))
    } else {
      setInvitePermissions(prev => ({ ...prev, [key]: !prev[key] }))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Configuración" size="2xl">
      {/* Tab Navigation headers */}
      <div className="flex border-b border-white/5 mb-5 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('wholesalers')}
          className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'wholesalers'
              ? 'border-[#00f2fe] text-[#00f2fe]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Mayoristas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-[#00f2fe] text-[#00f2fe]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Gestión de Usuarios
        </button>
      </div>

      {activeTab === 'wholesalers' ? (
        // Wholesalers Tab Panel
        <>
          <p className="mb-4 text-sm text-slate-400">
            Mayoristas / distribuidores que utilizas. Se usan en filtros, categorías y análisis.
          </p>
          <WholesalersEditor value={draft} onChange={setDraft} />
          {wholesalerError && <p className="mt-3 text-xs text-red-400">{wholesalerError}</p>}

          {/* Licenciamiento y Planes (Stripe panel) */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <h3 className="text-sm font-semibold text-slate-200">Suscripción y Licencia</h3>
            <p className="mt-1 mb-3 text-xs text-slate-400">
              Gestiona el nivel de acceso asignado a esta farmacia.
            </p>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/50 p-4 border border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-300">Plan de Acceso</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Control de módulos de GFarma</span>
              </div>
              <span
                className={`font-black uppercase tracking-wider px-2.5 py-1 rounded-md text-[9px] ${
                  subscriptionTier === 'premium'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                    : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                }`}
              >
                {subscriptionTier === 'premium' ? '✨ Premium' : 'Básico'}
              </span>
            </div>
            {userRole === 'titular' && (
              <button
                type="button"
                disabled={billingLoading}
                onClick={handleManageBilling}
                className="mt-3 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-slate-200 border border-white/10 hover:bg-slate-800 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
              >
                {billingLoading ? 'Cargando portal...' : 'Gestión del Plan (Stripe)'}
              </button>
            )}
            {billingError && (
              <p className="mt-2 text-center text-[10px] text-red-400 font-semibold">{billingError}</p>
            )}
          </div>

          {/* Action buttons for Wholesalers save */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveWholesalers}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-400 hover:to-indigo-500"
            >
              Guardar
            </button>
          </div>
        </>
      ) : (
        // Users Management Tab Panel
        <div className="space-y-4">
          {userRole !== 'titular' ? (
            // Non-owners (employees) are blocked
            <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-red-400 mb-3" />
              <h3 className="text-sm font-black text-white">Acceso Denegado</h3>
              <p className="mt-1 text-xs text-slate-400 leading-normal">
                Solo el propietario (Titular) puede gestionar usuarios e invitaciones en esta farmacia.
              </p>
            </div>
          ) : subscriptionTier !== 'premium' ? (
            // Basic plan has a lock banner
            <div className="rounded-2xl border border-[#bf953f]/30 bg-slate-950/80 p-6 text-center shadow-[0_0_30px_rgba(212,175,55,0.06)] hover:border-[#fcf6ba]/40 transition-all duration-300">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#bf953f]/35 bg-[#bf953f]/10 text-[#fcf6ba] shadow-[0_0_20px_rgba(212,175,55,0.15)] mb-4 animate-pulse">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-black text-white tracking-tight">Gestión de Usuarios Premium</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Invita hasta a 2 trabajadores de tu farmacia y controla de forma granular qué módulos pueden ver y editar.
              </p>
              <button
                type="button"
                disabled={billingLoading}
                onClick={handleManageBilling}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] text-[#3c2a05] py-3 text-xs font-black uppercase tracking-wider cursor-pointer border border-[#fcf6ba]/30 shadow-md hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(252,246,186,0.3)] transition-all disabled:opacity-50"
              >
                {billingLoading ? 'Cargando pasarela...' : 'Mejorar a Plan Premium'}
              </button>
            </div>
          ) : (
            // Premium content: Seats lists & invites
            <div className="space-y-5">
              {/* Header and counter */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Usuarios y Accesos</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Asientos de tu suscripción: {seatsUsed} de 3 utilizados.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void loadUsersData()}
                    disabled={loadingUsers}
                    className="p-2 text-slate-400 hover:text-white rounded-xl border border-white/5 hover:bg-white/5 transition-all"
                    aria-label="Refrescar lista"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                  </button>
                  {seatsUsed < 3 && !inviting && (
                    <button
                      type="button"
                      onClick={() => setInviting(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3.5 py-1.5 text-xs font-bold hover:bg-cyan-500/20 transition-all cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Invitar trabajador
                    </button>
                  )}
                </div>
              </div>

              {/* Form to Invite Worker */}
              {inviting && (
                <form onSubmit={handleInviteSubmit} className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider">Nueva Invitación</h4>
                    <button type="button" onClick={() => setInviting(false)} className="text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre</label>
                      <input
                        type="text"
                        placeholder="Juan Pérez"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                      <input
                        type="email"
                        placeholder="juan@farmacia.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                        required
                      />
                    </div>
                  </div>

                  {/* Configurar Permisos */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Permisos del trabajador</label>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 bg-slate-900/20 p-3 rounded-xl border border-white/5">
                      {Object.keys(DEFAULT_PERMISSIONS).map((key) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={invitePermissions[key] || false}
                            onChange={() => handlePermissionToggle(key, false)}
                            className="rounded border-white/10 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                          />
                          <span className="text-xs text-slate-300 font-semibold">{PERMISSION_LABELS[key]}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {inviteError && <p className="text-[10px] font-bold text-red-400">{inviteError}</p>}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setInviting(false)}
                      className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingInvite}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50"
                    >
                      {submittingInvite ? 'Enviando...' : 'Enviar Invitación'}
                    </button>
                  </div>
                </form>
              )}

              {/* Members and invitations lists */}
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                {loadingUsers ? (
                  <p className="text-xs text-slate-400 text-center py-6">Cargando lista de accesos…</p>
                ) : (
                  <>
                    {/* List Active Members */}
                    {members.map((m) => {
                      const isOwner = m.role === 'titular'
                      const isEditing = editingPermissionsUserId === m.user_id
                      const displayName = isOwner ? 'Propietario (Tú)' : (m.custom_name || 'Trabajador')
                      
                      return (
                        <div key={m.user_id} className="rounded-2xl border border-white/5 bg-slate-950/20 p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-xl border shrink-0 ${isOwner ? 'border-[#bf953f]/30 bg-[#bf953f]/10 text-[#fcf6ba]' : 'border-white/5 bg-white/5 text-slate-400'}`}>
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white leading-normal">{displayName}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">{m.email}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isOwner ? (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black tracking-wider text-[8px] uppercase px-2 py-0.5 rounded">Propietario</span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingPermissionsUserId(null)
                                      } else {
                                        setEditingPermissionsUserId(m.user_id)
                                        setEditPermissionsDraft(m.permissions || {})
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-xl border border-white/5 hover:bg-white/5 transition-all"
                                    title="Editar permisos"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeMember(m.user_id, displayName)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-xl border border-white/5 hover:bg-white/5 transition-all"
                                    title="Dar de baja"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Editable/Viewable Permissions block */}
                          {!isOwner && (
                            <div className="mt-3.5 border-t border-white/5 pt-3">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Modificar Permisos</span>
                                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                                    {Object.keys(DEFAULT_PERMISSIONS).map((key) => (
                                      <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={editPermissionsDraft[key] || false}
                                          onChange={() => handlePermissionToggle(key, true)}
                                          className="rounded border-white/10 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span className="text-xs text-slate-300 font-semibold">{PERMISSION_LABELS[key]}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPermissionsUserId(null)}
                                      className="flex-1 rounded-xl border border-white/10 py-1.5 text-[10px] font-semibold text-slate-400 hover:bg-white/5"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSavePermissions(m.user_id)}
                                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-1.5 text-[10px] font-black text-white shadow-sm"
                                    >
                                      Guardar Cambios
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(m.permissions || {}).map(([key, val]) => {
                                    if (!val) return null
                                    return (
                                      <span key={key} className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[8px] font-bold text-slate-400 border border-white/5 uppercase tracking-wider">
                                        {PERMISSION_LABELS[key]}
                                      </span>
                                    )
                                  })}
                                  {Object.values(m.permissions || {}).every(v => !v) && (
                                    <span className="text-[10px] text-slate-500 font-semibold italic">Sin accesos configurados.</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* List Pending Invitations */}
                    {invitations.map((i) => (
                      <div key={i.id} className="rounded-2xl border border-cyan-500/10 bg-slate-950/10 p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/10 bg-cyan-500/5 text-cyan-400 shrink-0">
                              <Mail className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-white leading-normal">{i.custom_name}</h4>
                                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-black tracking-wider text-[7px] uppercase px-1.5 py-0.5 rounded">Pendiente</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{i.email}</p>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleCancelInvitation(i.id, i.email)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-xl border border-white/5 hover:bg-white/5 transition-all"
                            title="Cancelar invitación"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-3.5 border-t border-white/5 pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(i.permissions || {}).map(([key, val]) => {
                              if (!val) return null
                              return (
                                <span key={key} className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[8px] font-bold text-slate-500 border border-white/5 uppercase tracking-wider">
                                  {PERMISSION_LABELS[key]}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Back button/action for users panel */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl border border-white/10 px-8 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
