import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useWholesalersStore } from '@/stores/wholesalersStore'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  activeOrgId: string | null
  activeOrgName: string | null
  userRole: 'titular' | 'empleado' | null
  subscriptionTier: 'basic' | 'premium'
  signOut: () => Promise<void>
  updateSubscriptionTier: (tier: 'basic' | 'premium') => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [activeOrgName, setActiveOrgName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'titular' | 'empleado' | null>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<'basic' | 'premium'>('basic')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrgData = async (user: User | null) => {
      if (!user) {
        setActiveOrgId(null)
        setActiveOrgName(null)
        setUserRole(null)
        setSubscriptionTier('basic')
        return
      }

      try {
        // Query memberships to resolve organization details
        const { data: membership, error } = await supabase
          .from('memberships')
          .select('org_id, role, organizations(nombre, plan, wholesalers)')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error

        if (membership) {
          setActiveOrgId(membership.org_id)
          setUserRole(membership.role)

          const org = membership.organizations as unknown as {
            nombre: string | null
            plan: string | null
            wholesalers: string[] | null
          } | null
          if (org) {
            setActiveOrgName(org.nombre || 'Farmacia')
            setSubscriptionTier(org.plan === 'premium' ? 'premium' : 'basic')

            // Sync wholesalers reactively to store
            if (Array.isArray(org.wholesalers)) {
              useWholesalersStore.getState().initWholesalers(org.wholesalers)
            }
          }
        }
      } catch (err) {
        console.error('Error loading organization metadata:', err)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        loadOrgData(data.session.user).then(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadOrgData(newSession.user)
      } else {
        loadOrgData(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const updateSubscriptionTier = async (newTier: 'basic' | 'premium') => {
    // Stub for now. Will be updated by Stripe webhook (service_role) in Fase 4.
    // Client-side is restricted to read-only for security (P1).
    console.warn(
      'Subscription updates are handled by Stripe webhook on the server side. Attempted:',
      newTier,
    )
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    activeOrgId,
    activeOrgName,
    userRole,
    subscriptionTier,
    signOut: async () => {
      await supabase.auth.signOut()
    },
    updateSubscriptionTier,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
