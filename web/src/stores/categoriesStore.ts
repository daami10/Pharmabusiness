import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { getCategories, KEY } from '@/lib/config/categories'

interface CategoriesState {
  categories: string[]
  /** Reemplaza la lista y sincroniza (localStorage + Supabase si hay orgId). */
  setCategories: (list: string[], orgId?: string | null) => Promise<void>
  /** Inicializa desde la org al cargar sesión (solo local, sin re-escribir en BD). */
  initCategories: (list: string[]) => void
  /** Añade una categoría si no existe ya (case-insensitive). */
  addCategory: (name: string, orgId?: string | null) => Promise<void>
  /** Elimina una categoría de la lista. */
  removeCategory: (name: string, orgId?: string | null) => Promise<void>
}

/** Categorías personalizadas activas (reactivo). Espejo de wholesalersStore. */
export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: getCategories(),
  initCategories: (list) => {
    localStorage.setItem(KEY, JSON.stringify(list))
    set({ categories: list })
  },
  setCategories: async (list, orgId) => {
    localStorage.setItem(KEY, JSON.stringify(list))
    set({ categories: list })
    if (orgId) {
      try {
        const { error } = await supabase
          .from('organizations')
          .update({ categories: list })
          .eq('id', orgId)
        if (error) throw error
      } catch (err) {
        console.error('Error syncing categories to Supabase:', err)
      }
    }
  },
  addCategory: async (name, orgId) => {
    const v = name.trim()
    if (!v) return
    const cur = get().categories
    if (cur.some((c) => c.toLowerCase() === v.toLowerCase())) return
    await get().setCategories([...cur, v], orgId)
  },
  removeCategory: async (name, orgId) => {
    const cur = get().categories
    await get().setCategories(
      cur.filter((c) => c !== name),
      orgId,
    )
  },
}))
