// Mayoristas configurables. Parity con el legacy: leídos de localStorage `pb_wholesalers`.
// TODO (multi-tenant): mover esta config a Supabase por organización.
export const KEY = 'pb_wholesalers'
const DEFAULT = ['FedeFarma']

/** Mayoristas predefinidos que se ofrecen en el onboarding/ajustes. */
export const PREDEFINED_WHOLESALERS = [
  'FedeFarma',
  'Cofares',
  'Bidafarma',
  'Hefame',
  'Alliance Healthcare',
]

/** True si el usuario aún no ha configurado sus mayoristas (primer uso). */
export function isOnboardingPending(): boolean {
  return localStorage.getItem(KEY) === null
}

export function getWholesalers(): string[] {
  const stored = localStorage.getItem(KEY)
  if (!stored) return DEFAULT
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT
  } catch {
    return stored
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
}

export function isWholesaler(
  tipo: string,
  wholesalers: string[] = getWholesalers(),
): boolean {
  return wholesalers.includes(tipo)
}
