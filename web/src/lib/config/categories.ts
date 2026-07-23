// Categorías personalizadas por organización. Paralelo a config/wholesalers.ts:
// se cachean en localStorage y se sincronizan en `organizations.categories`.
// A diferencia de los mayoristas, no hay predefinidas: cada farmacia crea las suyas.
export const KEY = 'pb_categories'

/** Categorías de sistema que NO pueden usarse como nombre de una personalizada. */
export const RESERVED_CATEGORIES = ['Laboratorio', 'Mayorista', 'Otro', 'Abono']

export function getCategories(): string[] {
  const stored = localStorage.getItem(KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return stored
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
}

/** True si `name` colisiona con una categoría de sistema o un mayorista. */
export function isReservedCategory(name: string, wholesalers: string[]): boolean {
  const v = name.trim().toLowerCase()
  return (
    RESERVED_CATEGORIES.some((r) => r.toLowerCase() === v) ||
    wholesalers.some((w) => w.toLowerCase() === v)
  )
}
