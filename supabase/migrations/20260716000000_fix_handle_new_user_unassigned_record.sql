-- Migration: arreglar "Database error creating new user" en el alta de titulares
-- Path: supabase/migrations/20260716000000_fix_handle_new_user_unassigned_record.sql
--
-- BUG: en 20260701000000 el `SELECT ... INTO inv_record` se movió DENTRO del
-- `IF inv_token IS NOT NULL`. En el alta estándar (titular, sin invite_token) ese
-- SELECT nunca corre, así que `inv_record` queda SIN ASIGNAR, y al leer
-- `inv_record.id` PL/pgSQL lanza:
--     ERROR: record "inv_record" is not assigned yet
-- Eso aborta el INSERT en auth.users y Supabase Auth devuelve el mensaje genérico
-- "Database error creating new user".
--
-- FIX: usar una bandera `is_invited` que solo se pone a true cuando inv_record SÍ
-- está asignado (dentro del bloque donde el SELECT ya corrió). Se preserva la lógica
-- de invitación por token y la auto-promoción de super-admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id UUID;
  inv_record RECORD;
  inv_token  UUID;
  is_invited BOOLEAN := false;
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

    -- Dentro de este bloque inv_record YA está asignado (aunque sea a NULLs).
    IF inv_record.id IS NOT NULL THEN
      is_invited := true;
    END IF;
  END IF;

  IF is_invited THEN
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
