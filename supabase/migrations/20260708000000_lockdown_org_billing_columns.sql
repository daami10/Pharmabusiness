-- Migration: bloquear que el titular reescriba sus columnas de facturación
-- Path: supabase/migrations/20260708000000_lockdown_org_billing_columns.sql
--
-- Contexto (CRÍTICO): la policy RLS `update_org` (20260616000000) da al titular
-- UPDATE sobre TODA su fila de `organizations`, sin restricción de columnas. Como
-- has_active_access (0701) y org_is_premium (0707) LEEN plan/subscription_status/
-- trial_ends_at de esa fila, un titular podía auto-concederse premium y acceso
-- ilimitado desde el cliente:
--   supabase.from('organizations').update({plan:'premium', subscription_status:'active',
--     trial_ends_at:'2099-01-01'}).eq('id', <su_org>)
-- ...anulando el paywall y la separación básico/premium.
--
-- Fix: privilegios a NIVEL DE COLUMNA. La RLS de Postgres es por fila, no por
-- columna, así que hay que quitar el UPDATE de tabla a `authenticated` y volver a
-- conceder UPDATE solo sobre las columnas que el titular sí edita (nombre,
-- wholesalers, vía SettingsModal). Las columnas de facturación pasan a escribirlas
-- únicamente el service_role (webhook de Stripe / endpoints), que ignora estos grants.

-- 1. Quitar el UPDATE amplio a authenticated y anon.
REVOKE UPDATE ON public.organizations FROM authenticated;
REVOKE UPDATE ON public.organizations FROM anon;

-- 2. Reconceder UPDATE SOLO sobre las columnas editables por el titular.
--    (Cualquier intento de UPDATE sobre plan/subscription_status/trial_ends_at/
--     current_period_end/stripe_* devolverá "permission denied for column".)
GRANT UPDATE (nombre, wholesalers) ON public.organizations TO authenticated;

-- Nota: la policy RLS `update_org` (has_org_role titular) sigue vigente y se combina
-- con esto: el titular solo puede actualizar nombre/wholesalers de SU propia org.
-- SELECT/INSERT no se tocan; el trigger (SECURITY DEFINER) y el service_role tampoco.
