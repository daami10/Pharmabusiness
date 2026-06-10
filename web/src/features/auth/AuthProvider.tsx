import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

import { useWholesalersStore } from '@/stores/wholesalersStore'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  subscriptionTier: 'basic' | 'premium'
  signOut: () => Promise<void>
  updateSubscriptionTier: (tier: 'basic' | 'premium') => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getTierForUser(user: User | null): 'basic' | 'premium' {
  if (!user) return 'basic'
  const email = user.email || ''
  if (email === 'damianrossy10@gmail.com' || email.includes('test')) {
    return 'premium'
  }
  return user.user_metadata?.subscription_tier ?? 'basic'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<'basic' | 'premium'>('basic')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const syncWholesalers = async (user: User | null) => {
      if (!user) return
      const store = useWholesalersStore.getState()
      const metaWholesalers = user.user_metadata?.wholesalers
      if (Array.isArray(metaWholesalers)) {
        store.initWholesalers(metaWholesalers)
      } else {
        const local = store.wholesalers
        if (local && local.length > 0) {
          try {
            await supabase.auth.updateUser({ data: { wholesalers: local } })
          } catch (err) {
            console.error('Error syncing local wholesalers to Supabase on init:', err)
          }
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        syncWholesalers(data.session.user)
        setSubscriptionTier(getTierForUser(data.session.user))
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        syncWholesalers(newSession.user)
        setSubscriptionTier(getTierForUser(newSession.user))
      } else {
        setSubscriptionTier('basic')
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const updateSubscriptionTier = async (newTier: 'basic' | 'premium') => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { subscription_tier: newTier },
      })
      if (error) throw error
      if (data.user) {
        setSubscriptionTier(getTierForUser(data.user))
      }
    } catch (err) {
      console.error('Error updating subscription tier:', err)
    }
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
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
