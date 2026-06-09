import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { getWholesalers, KEY } from '@/lib/config/wholesalers'

interface WholesalersState {
  wholesalers: string[]
  setWholesalers: (list: string[]) => Promise<void>
  initWholesalers: (list: string[]) => void
}

/** Mayoristas activos (reactivo). Persiste en localStorage y se sincroniza en Supabase. */
export const useWholesalersStore = create<WholesalersState>((set) => ({
  wholesalers: getWholesalers(),
  initWholesalers: (list) => {
    localStorage.setItem(KEY, JSON.stringify(list))
    set({ wholesalers: list })
  },
  setWholesalers: async (list) => {
    localStorage.setItem(KEY, JSON.stringify(list))
    set({ wholesalers: list })
    try {
      await supabase.auth.updateUser({ data: { wholesalers: list } })
    } catch (err) {
      console.error('Error syncing wholesalers to Supabase:', err)
    }
  },
}))
