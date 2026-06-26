import { Route, Routes, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { InicioPage } from '@/features/inicio/InicioPage'
import { FacturasPage } from '@/features/facturas/FacturasPage'
import { AnalisisPage } from '@/features/analisis/AnalisisPage'
import { AbonosPage } from '@/features/abonos/AbonosPage'
import { FiscalidadPage } from '@/features/fiscalidad/FiscalidadPage'
import { TrabajadoresPage } from '@/features/trabajadores/TrabajadoresPage'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { RoleGate } from '@/components/ui/RoleGate'
import { SubscriptionGate } from '@/components/ui/SubscriptionGate'
import { useAuth } from '@/features/auth/AuthProvider'
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage'

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400 bg-[#090d16]">
        Cargando…
      </div>
    )
  }
  return isSuperAdmin ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <SubscriptionGate>
              <AppShell />
            </SubscriptionGate>
          }
        >
          <Route index element={<InicioPage />} />
          <Route path="facturas" element={<RoleGate permission="facturas_read"><FacturasPage /></RoleGate>} />
          <Route
            path="analisis"
            element={
              <PremiumGate>
                <RoleGate permission="analisis_read">
                  <AnalisisPage />
                </RoleGate>
              </PremiumGate>
            }
          />
          <Route path="abonos" element={<RoleGate permission="abonos_read"><AbonosPage /></RoleGate>} />
          <Route
            path="fiscalidad"
            element={
              <PremiumGate>
                <RoleGate permission="fiscalidad_read">
                  <FiscalidadPage />
                </RoleGate>
              </PremiumGate>
            }
          />
          <Route
            path="trabajadores"
            element={
              <PremiumGate>
                <RoleGate permission="trabajadores_read">
                  <TrabajadoresPage />
                </RoleGate>
              </PremiumGate>
            }
          />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}
