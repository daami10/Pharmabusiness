const eur = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formatea un número como importe en euros estilo es-ES, p.ej. `1.234,50 €`. */
export function formatMoney(value: number | null | undefined): string {
  return `${eur.format(value ?? 0)} €`
}
