import { create } from 'zustand'

const currentYear = new Date().getFullYear()

interface YearState {
  year: number
  availableYears: number[]
  setYear: (year: number) => void
}

/** Año contable activo. Sustituye al `activeYear` global del legacy (años dinámicos, no fijos). */
export const useYearStore = create<YearState>((set) => ({
  year: currentYear,
  availableYears: [currentYear - 1, currentYear, currentYear + 1],
  setYear: (year) => set({ year }),
}))
