import { Chart, registerables } from 'chart.js'

// Registro global de Chart.js (importar una vez antes de usar react-chartjs-2).
Chart.register(...registerables)

Chart.defaults.color = 'rgba(255,255,255,0.55)'
Chart.defaults.font.family = "'Outfit', 'Inter', sans-serif"
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)'

/** Paleta de colores estable para series. */
export function palette(n: number): string[] {
  const base = [
    '#2563EB',
    '#00f2fe',
    '#10b981',
    '#7C3AED',
    '#EA580C',
    '#0891B2',
    '#DC2626',
    '#CA8A04',
    '#9333EA',
    '#BE185D',
  ]
  return Array.from({ length: n }, (_, i) =>
    i < base.length ? base[i] : `hsl(${(i * 137.5) % 360}, 65%, 55%)`,
  )
}
