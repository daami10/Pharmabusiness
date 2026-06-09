import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

import { useWholesalersStore } from '@/stores/wholesalersStore'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
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
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        syncWholesalers(newSession.user)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
