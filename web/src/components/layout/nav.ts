import { BarChart3, FileText, Home, Landmark, RefreshCcw, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/facturas', label: 'Facturas', icon: FileText },
  { to: '/analisis', label: 'Análisis', icon: BarChart3 },
  { to: '/abonos', label: 'Abonos', icon: RefreshCcw },
  { to: '/fiscalidad', label: 'Fiscalidad', icon: Landmark },
  { to: '/trabajadores', label: 'Trabajadores', icon: Users },
]
