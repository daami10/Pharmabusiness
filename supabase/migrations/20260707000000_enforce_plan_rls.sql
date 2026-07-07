-- Migration: enforce basic/premium plan server-side (RLS)
-- Path: supabase/migrations/20260707000000_enforce_plan_rls.sql
--
-- Contexto: la separación básico/premium estaba SOLO en el cliente (PremiumGate +
-- subscriptionTier). La RLS gateaba por permiso (has_org_permission) + pago
-- (has_active_access), pero NUNCA por plan. Como has_org_permission da vía libre a
-- cualquier titular (cláusula role='titular'), un titular de plan BÁSICO podía leer
-- y escribir datos de módulos PREMIUM (fiscalidad, trabajadores, nóminas, seguros)
-- directamente por la API, saltándose el PremiumGate del cliente.
--
-- Fix: función org_is_premium(org) + exigirla en las policies de los módulos premium.
-- Módulos según la tabla de planes (PlanSelectionModal):
--   Básico  : Inicio, Facturas, Abonos            -> NO se gatea por plan.
--   Premium : + Análisis, Fiscalidad, Trabajadores/Seguros -> SÍ se gatea por plan.
-- (Análisis no tiene tabla propia: es una vista de facturas/fiscalidad/nóminas/seguros,
--  así que gatear esas tablas fuente ya lo cubre.)

-- Devuelve true si la org tiene acceso a módulos PREMIUM:
--   - suscripción activa Y plan premium, o
--   - prueba (trial) todavía válida -> se muestran las features premium (showcase),
--     igual que hace AuthProvider (trialing => subscriptionTier 'premium').
-- Es más estricto que has_active_access (excluye el activo+básico), así que en las
-- tablas premium sustituye a has_active_access (ya implica pago/trial válido).
CREATE OR REPLACE FUNCTION public.org_is_premium(target_org uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = target_org
      AND (
        (o.subscription_status = 'active' AND o.plan = 'premium')
        OR (o.subscription_status = 'trialing' AND o.trial_ends_at > now())
      )
  );
$$;

-- Reescribir las policies de los 4 módulos premium: se cambia has_active_access
-- por org_is_premium (que ya exige pago/trial válido Y plan premium).
DO $$
BEGIN
  DROP POLICY IF EXISTS "org_member_select_fiscalidad" ON public.fiscalidad;
  DROP POLICY IF EXISTS "org_titular_modify_fiscalidad" ON public.fiscalidad;
  DROP POLICY IF EXISTS "org_member_select_trabajadores" ON public.trabajadores;
  DROP POLICY IF EXISTS "org_titular_modify_trabajadores" ON public.trabajadores;
  DROP POLICY IF EXISTS "org_member_select_nominas" ON public.nominas;
  DROP POLICY IF EXISTS "org_titular_modify_nominas" ON public.nominas;
  DROP POLICY IF EXISTS "org_member_select_seguros_sociales" ON public.seguros_sociales;
  DROP POLICY IF EXISTS "org_titular_modify_seguros_sociales" ON public.seguros_sociales;
END $$;

-- FISCALIDAD (premium)
CREATE POLICY "org_member_select_fiscalidad" ON public.fiscalidad FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'fiscalidad_read') AND public.org_is_premium(org_id));
CREATE POLICY "org_titular_modify_fiscalidad" ON public.fiscalidad FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.org_is_premium(org_id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.org_is_premium(org_id));

-- TRABAJADORES (premium)
CREATE POLICY "org_member_select_trabajadores" ON public.trabajadores FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read') AND public.org_is_premium(org_id));
CREATE POLICY "org_titular_modify_trabajadores" ON public.trabajadores FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.org_is_premium(org_id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.org_is_premium(org_id));

-- NOMINAS (premium)
CREATE POLICY "org_member_select_nominas" ON public.nominas FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read') AND public.org_is_premium(org_id));
CREATE POLICY "org_titular_modify_nominas" ON public.nominas FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.org_is_premium(org_id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.org_is_premium(org_id));

-- SEGUROS SOCIALES (premium)
CREATE POLICY "org_member_select_seguros_sociales" ON public.seguros_sociales FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read') AND public.org_is_premium(org_id));
CREATE POLICY "org_titular_modify_seguros_sociales" ON public.seguros_sociales FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.org_is_premium(org_id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.org_is_premium(org_id));

-- NOTA: facturas se deja con has_active_access (es un módulo BÁSICO, disponible en
-- ambos planes). El plan solo restringe los módulos premium de arriba.
