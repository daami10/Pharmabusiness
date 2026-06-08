import { create } from 'zustand'
import { getWholesalers, KEY } from '@/lib/config/wholesalers'

interface WholesalersState {
  wholesalers: string[]
  setWholesalers: (list: string[]) => void
}

/** Mayoristas activos (reactivo). Persiste en localStorage; los consumidores reaccionan al cambio. */
export const useWholesalersStore = create<WholesalersState>((set) => ({
  wholesalers: getWholesalers(),
  setWholesalers: (list) => {
    localStorage.setItem(KEY, JSON.stringify(list))
    set({ wholesalers: list })
  },
}))
