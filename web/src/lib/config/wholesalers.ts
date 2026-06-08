// Mayoristas configurables. Parity con el legacy: leídos de localStorage `pb_wholesalers`.
// TODO (Hito 5 / multi-tenant): mover esta config a Supabase por organización.
const KEY = 'pb_wholesalers'
const DEFAULT = ['FedeFarma']

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
