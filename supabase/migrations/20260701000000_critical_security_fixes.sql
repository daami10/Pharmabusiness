-- Migration: Critical security fixes (server-side enforcement)
-- Path: supabase/migrations/20260701000000_critical_security_fixes.sql
--
-- Resuelve 3 fallos críticos detectados en auditoría, moviendo la autorización
-- del cliente (React) al servidor (RLS / triggers), que es la única frontera real:
--
--   CRÍTICO 1  El paywall era solo visual: ninguna policy miraba la suscripción.
--              -> función has_active_access() + gate en las 5 tablas de negocio.
--   CRÍTICO 3  Invitaciones sin secreto (bastaba conocer el email) + RPC pública
--              de enumeración. -> token secreto + caducidad + REVOKE + trigger por token.
--   CRÍTICO 2  (parte de BD) el trigger creaba titular para cualquier alta; ahora el
--              alta pasa siempre por /api/register (signup público desactivado en Supabase).
--
-- Decisiones aplicadas: bloqueo TOTAL al caducar el trial (ni lectura ni escritura).

-- =====================================================================
-- CRÍTICO 1 — Aplicar el pago en la base de datos, no en el cliente
-- =====================================================================

-- Misma regla que AuthProvider, pero imposible de manipular desde el navegador.
-- SECURITY DEFINER para poder leer organizations saltándose su RLS.
CREATE OR REPLACE FUNCTION public.has_active_access(target_org uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = target_org
      AND (
        o.subscription_status = 'active'
        OR (o.subscription_status = 'trialing' AND o.trial_ends_at > now())
      )
  );
$$;

-- Reescribir las policies de las 5 tablas de negocio añadiendo el gate de pago.
-- Se preserva la lógica de permisos granulares existente (has_org_permission / titular)
-- y se le exige ADEMÁS has_active_access (AND). Bloqueo total = se gatea también SELECT.
DO $$
BEGIN
  -- --- FACTURAS (facturas + abonos) ---
  DROP POLICY IF EXISTS "org_member_select_facturas" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_insert_facturas" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_update_facturas" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_delete_facturas" ON public.facturas;

  -- --- FISCALIDAD ---
  DROP POLICY IF EXISTS "org_member_select_fiscalidad" ON public.fiscalidad;
  DROP POLICY IF EXISTS "org_titular_modify_fiscalidad" ON public.fiscalidad;

  -- --- TRABAJADORES ---
  DROP POLICY IF EXISTS "org_member_select_trabajadores" ON public.trabajadores;
  DROP POLICY IF EXISTS "org_titular_modify_trabajadores" ON public.trabajadores;

  -- --- NOMINAS ---
  DROP POLICY IF EXISTS "org_member_select_nominas" ON public.nominas;
  DROP POLICY IF EXISTS "org_titular_modify_nominas" ON public.nominas;

  -- --- SEGUROS SOCIALES ---
  DROP POLICY IF EXISTS "org_member_select_seguros_sociales" ON public.seguros_sociales;
  DROP POLICY IF EXISTS "org_titular_modify_seguros_sociales" ON public.seguros_sociales;
END $$;

-- FACTURAS
CREATE POLICY "org_member_select_facturas" ON public.facturas FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'facturas_read') AND public.has_active_access(org_id));
CREATE POLICY "org_member_insert_facturas" ON public.facturas FOR INSERT TO authenticated
  WITH CHECK (public.has_org_permission(org_id, 'facturas_write') AND public.has_active_access(org_id));
CREATE POLICY "org_member_update_facturas" ON public.facturas FOR UPDATE TO authenticated
  USING (public.has_org_permission(org_id, 'facturas_write') AND public.has_active_access(org_id))
  WITH CHECK (public.has_org_permission(org_id, 'facturas_write') AND public.has_active_access(org_id));
CREATE POLICY "org_member_delete_facturas" ON public.facturas FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id));

-- FISCALIDAD
CREATE POLICY "org_member_select_fiscalidad" ON public.fiscalidad FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'fiscalidad_read') AND public.has_active_access(org_id));
CREATE POLICY "org_titular_modify_fiscalidad" ON public.fiscalidad FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id));

-- TRABAJADORES
CREATE POLICY "org_member_select_trabajadores" ON public.trabajadores FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read') AND public.has_active_access(org_id));
CREATE POLICY "org_titular_modify_trabajadores" ON public.trabajadores FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id));

-- NOMINAS
CREATE POLICY "org_member_select_nominas" ON public.nominas FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read') AND public.has_active_access(org_id));
CREATE POLICY "org_titular_modify_nominas" ON public.nominas FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id));

-- SEGUROS SOCIALES
CREATE POLICY "org_member_select_seguros_sociales" ON public.seguros_sociales FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read') AND public.has_active_access(org_id));
CREATE POLICY "org_titular_modify_seguros_sociales" ON public.seguros_sociales FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]) AND public.has_active_access(org_id));

-- NOTA: la tabla organizations NO se gatea: la pantalla de pago necesita leer
-- subscription_status para pintarse y para que el botón "Suscríbete" funcione.

-- =====================================================================
-- CRÍTICO 3 — Invitaciones con token secreto + cerrar la enumeración
-- =====================================================================

-- (a) Cerrar el oráculo de enumeración público.
--     is_email_invited NO se usa en ninguna policy RLS y ya no lo llama el cliente
--     (el endpoint valida con service_role), así que puede revocarse por completo.
REVOKE ALL ON FUNCTION public.is_email_invited(text) FROM PUBLIC, anon;

-- has_org_permission SÍ se usa dentro de policies RLS: el rol 'authenticated' DEBE
-- conservar EXECUTE o las policies fallarían. Se quita solo a 'anon'.
REVOKE EXECUTE ON FUNCTION public.has_org_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid, text) TO authenticated;

-- (b) Token secreto + caducidad en la invitación.
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations (token);

-- =====================================================================
-- CRÍTICO 2 + 3 — Trigger de alta: unir por TOKEN, no por email
-- =====================================================================
-- Reescribe handle_new_user. IMPORTANTE: esta versión sustituye a la de
-- 20260626000000_super_admin.sql, por lo que PRESERVA la promoción de super-admin.
-- Además añade SET search_path (endurecimiento recomendado por Supabase).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id UUID;
  inv_record RECORD;
  inv_token UUID;
BEGIN
  -- Leer el token de invitación de la metadata (lo inyecta /api/register tras validarlo).
  BEGIN
    inv_token := (new.raw_user_meta_data->>'invite_token')::uuid;
  EXCEPTION WHEN others THEN
    inv_token := NULL;
  END;

  -- Solo se une a una org ajena si trae el token correcto, coincide el email y no ha caducado.
  IF inv_token IS NOT NULL THEN
    SELECT * INTO inv_record
    FROM public.invitations
    WHERE token = inv_token
      AND LOWER(email) = LOWER(new.email)
      AND expires_at > now()
    LIMIT 1;
  END IF;

  IF inv_record.id IS NOT NULL THEN
    -- Trabajador invitado: se une a la organización del titular con sus permisos.
    INSERT INTO public.memberships (org_id, user_id, role, status, custom_name, email, permissions)
    VALUES (
      inv_record.org_id,
      new.id,
      inv_record.role,
      'active',
      inv_record.custom_name,
      new.email,
      inv_record.permissions
    );
    -- Consumir la invitación para que no pueda reutilizarse.
    DELETE FROM public.invitations WHERE id = inv_record.id;
  ELSE
    -- Alta estándar: crea organización y asigna titular.
    INSERT INTO public.organizations (nombre, owner_id, wholesalers)
    VALUES (
      COALESCE(new.raw_user_meta_data->>'organization_name', 'Farmacia de ' || COALESCE(new.email, new.id::text)),
      new.id,
      ARRAY['FedeFarma']::TEXT[]
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.memberships (org_id, user_id, role, status, custom_name, email, permissions)
    VALUES (
      new_org_id,
      new.id,
      'titular',
      'active',
      COALESCE(new.raw_user_meta_data->>'display_name', 'Propietario'),
      new.email,
      '{"facturas_read": true, "facturas_write": true, "abonos_read": true, "abonos_write": true, "analisis_read": true, "fiscalidad_read": true, "trabajadores_read": true}'::jsonb
    );
  END IF;

  -- Preservado de 20260626000000: auto-promoción de super-admin.
  IF LOWER(new.email) = 'damianrossy@gfarma.app' THEN
    INSERT INTO public.super_admins (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- Endurecer también is_email_invited (SECURITY DEFINER sin search_path).
ALTER FUNCTION public.is_email_invited(text) SET search_path = public, pg_temp;
