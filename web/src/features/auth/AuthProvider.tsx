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
  /** Effective tier for feature-gating: during an active trial it is 'premium'. */
  subscriptionTier: 'basic' | 'premium'
  /** Raw subscription status from the organization (Stripe status or 'trialing'). */
  subscriptionStatus: string | null
  /** Trial expiry timestamp (ISO), or null if not on trial / grandfathered. */
  trialEndsAt: string | null
  /** True while the org is on a non-expired trial. */
  isTrialActive: boolean
  /** Whole days left in the trial (>= 0), or null if not on an active trial. */
  trialDaysLeft: number | null
  /** Whether the org currently has access to the app (paid or trialing). */
  hasAccess: boolean
  signOut: () => Promise<void>
  updateSubscriptionTier: (tier: 'basic' | 'premium') => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [activeOrgName, setActiveOrgName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'titular' | 'empleado' | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  // Derived access state, computed when org data loads (Date.now() must not run during render).
  const [subscriptionTier, setSubscriptionTier] = useState<'basic' | 'premium'>('basic')
  const [isTrialActive, setIsTrialActive] = useState(false)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let currentUserId: string | null = null

    const resetAccess = () => {
      setSubscriptionTier('basic')
      setIsTrialActive(false)
      setTrialDaysLeft(null)
      setHasAccess(false)
    }

    const loadOrgData = async (user: User | null): Promise<boolean> => {
      if (!user) {
        const changed = currentUserId !== null
        currentUserId = null
        setActiveOrgId(null)
        setActiveOrgName(null)
        setUserRole(null)
        setSubscriptionStatus(null)
        setTrialEndsAt(null)
        resetAccess()
        return changed
      }

      if (user.id === currentUserId) return false
      currentUserId = user.id

      try {
        // Query memberships to resolve organization details
        const { data: membership, error } = await supabase
          .from('memberships')
          .select(
            'org_id, role, organizations(nombre, plan, subscription_status, trial_ends_at, wholesalers)',
          )
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error

        if (membership) {
          setActiveOrgId(membership.org_id)
          setUserRole(membership.role)

          const org = membership.organizations as unknown as {
            nombre: string | null
            plan: string | null
            subscription_status: string | null
            trial_ends_at: string | null
            wholesalers: string[] | null
          } | null
          if (org) {
            const plan: 'basic' | 'premium' = org.plan === 'premium' ? 'premium' : 'basic'
            const status = org.subscription_status ?? null
            setActiveOrgName(org.nombre || 'Farmacia')
            setSubscriptionStatus(status)
            setTrialEndsAt(org.trial_ends_at ?? null)

            // Derive access/trial state here (effect context) — never during render.
            const trialEndMs = org.trial_ends_at
              ? new Date(org.trial_ends_at).getTime()
              : null
            const trialing =
              status === 'trialing' && trialEndMs !== null && trialEndMs > Date.now()
            setIsTrialActive(trialing)
            setTrialDaysLeft(
              trialing && trialEndMs !== null
                ? Math.max(0, Math.ceil((trialEndMs - Date.now()) / 86_400_000))
                : null,
            )
            setHasAccess(status === 'active' || trialing)
            // During an active trial the org gets full premium access (to showcase it).
            setSubscriptionTier(status === 'active' ? plan : trialing ? 'premium' : 'basic')

            // Sync wholesalers reactively to store
            if (Array.isArray(org.wholesalers)) {
              useWholesalersStore.getState().initWholesalers(org.wholesalers)
            }
          }
        }
        return true
      } catch (err) {
        console.error('Error loading organization metadata:', err)
        return true
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
        const isNewUser = newSession.user.id !== currentUserId
        if (isNewUser) {
          setLoading(true)
        }
        loadOrgData(newSession.user).then((loaded) => {
          if (loaded || isNewUser) {
            setLoading(false)
          }
        })
      } else {
        loadOrgData(null).then(() => {
          setLoading(false)
        })
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
    subscriptionStatus,
    trialEndsAt,
    isTrialActive,
    trialDaysLeft,
    hasAccess,
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
