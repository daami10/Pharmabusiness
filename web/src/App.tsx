import { Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<InicioPage />} />
          <Route path="facturas" element={<FacturasPage />} />
          <Route
            path="analisis"
            element={
              <PremiumGate>
                <RoleGate>
                  <AnalisisPage />
                </RoleGate>
              </PremiumGate>
            }
          />
          <Route path="abonos" element={<AbonosPage />} />
          <Route
            path="fiscalidad"
            element={
              <PremiumGate>
                <RoleGate>
                  <FiscalidadPage />
                </RoleGate>
              </PremiumGate>
            }
          />
          <Route
            path="trabajadores"
            element={
              <PremiumGate>
                <RoleGate>
                  <TrabajadoresPage />
                </RoleGate>
              </PremiumGate>
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}
