import { BarChart3, FileText, Home, Landmark, RefreshCcw, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  requiredTier: 'basic' | 'premium'
  requiredRole?: 'titular' | 'empleado'
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home, end: true, requiredTier: 'basic' },
  { to: '/facturas', label: 'Facturas', icon: FileText, requiredTier: 'basic' },
  {
    to: '/analisis',
    label: 'Análisis',
    icon: BarChart3,
    requiredTier: 'premium',
    requiredRole: 'titular',
  },
  { to: '/abonos', label: 'Abonos', icon: RefreshCcw, requiredTier: 'basic' },
  {
    to: '/fiscalidad',
    label: 'Fiscalidad',
    icon: Landmark,
    requiredTier: 'premium',
    requiredRole: 'titular',
  },
  {
    to: '/trabajadores',
    label: 'Trabajadores',
    icon: Users,
    requiredTier: 'premium',
    requiredRole: 'titular',
  },
]
