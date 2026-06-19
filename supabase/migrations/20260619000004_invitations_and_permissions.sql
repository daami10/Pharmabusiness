-- Migration: System of User Invitations and Toggled Granular Permissions
-- Path: supabase/migrations/20260619000004_invitations_and_permissions.sql

-- 1. Add custom_name, email and permissions columns to memberships
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS custom_name TEXT;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill email from auth.users for existing members
UPDATE public.memberships m
SET email = u.email
FROM auth.users u
WHERE m.user_id = u.id AND m.email IS NULL;

-- 2. Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  custom_name TEXT NOT NULL,
  role public.org_role NOT NULL DEFAULT 'empleado',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);

-- 3. Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy for invitations (only owners/titulares can manage)
DO $$
BEGIN
  DROP POLICY IF EXISTS "titular_manage_invitations" ON public.invitations;
END $$;

CREATE POLICY "titular_manage_invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

-- 5. Recreate handle_new_user trigger function to match pending invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  inv_record RECORD;
BEGIN
  -- Check if there is an active invitation for this email (case-insensitive)
  SELECT * INTO inv_record
  FROM public.invitations
  WHERE LOWER(email) = LOWER(new.email)
  LIMIT 1;

  IF inv_record.id IS NOT NULL THEN
    -- Link user to the invited organization as employee
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

    -- Delete the invitation so it cannot be reused
    DELETE FROM public.invitations WHERE id = inv_record.id;
  ELSE
    -- Standard signup flow: create organization and set as owner (titular)
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

  RETURN new;
END;
$$;

-- 6. Helper function to check granular organization permissions
CREATE OR REPLACE FUNCTION public.has_org_permission(target_org UUID, req_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = target_org 
      AND user_id = auth.uid() 
      AND (
        role = 'titular' 
        OR (permissions->>req_permission)::boolean = true
      )
  );
$$;

-- 7. Update Row-Level Security Policies for Domain Tables to respect granular permissions
DO $$
BEGIN
  -- A. Fiscalidad
  DROP POLICY IF EXISTS "org_titular_select" ON public.fiscalidad;
  DROP POLICY IF EXISTS "org_member_select" ON public.fiscalidad;
  
  -- B. Trabajadores
  DROP POLICY IF EXISTS "org_titular_select" ON public.trabajadores;
  DROP POLICY IF EXISTS "org_member_select" ON public.trabajadores;

  -- C. Nominas
  DROP POLICY IF EXISTS "org_titular_select" ON public.nominas;
  DROP POLICY IF EXISTS "org_member_select" ON public.nominas;

  -- D. Seguros Sociales
  DROP POLICY IF EXISTS "org_titular_select" ON public.seguros_sociales;
  DROP POLICY IF EXISTS "org_member_select" ON public.seguros_sociales;

  -- E. Facturas (Facturas & Abonos)
  DROP POLICY IF EXISTS "org_member_select" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_insert" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_update" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_delete" ON public.facturas;
END $$;

-- A. Create new granular RLS policies for Fiscalidad
CREATE POLICY "org_member_select_fiscalidad" ON public.fiscalidad FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'fiscalidad_read'));
CREATE POLICY "org_titular_modify_fiscalidad" ON public.fiscalidad FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

-- B. Create new granular RLS policies for Trabajadores
CREATE POLICY "org_member_select_trabajadores" ON public.trabajadores FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read'));
CREATE POLICY "org_titular_modify_trabajadores" ON public.trabajadores FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

-- C. Create new granular RLS policies for Nominas
CREATE POLICY "org_member_select_nominas" ON public.nominas FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read'));
CREATE POLICY "org_titular_modify_nominas" ON public.nominas FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

-- D. Create new granular RLS policies for Seguros Sociales
CREATE POLICY "org_member_select_seguros_sociales" ON public.seguros_sociales FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'trabajadores_read'));
CREATE POLICY "org_titular_modify_seguros_sociales" ON public.seguros_sociales FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

-- E. Create new granular RLS policies for Facturas (covers both invoices and credit notes/abonos)
CREATE POLICY "org_member_select_facturas" ON public.facturas FOR SELECT TO authenticated
  USING (public.has_org_permission(org_id, 'facturas_read'));
CREATE POLICY "org_member_insert_facturas" ON public.facturas FOR INSERT TO authenticated
  WITH CHECK (
    -- Permite inserciones si el usuario tiene permiso facturas_write o es titular
    public.has_org_permission(org_id, 'facturas_write')
  );
CREATE POLICY "org_member_update_facturas" ON public.facturas FOR UPDATE TO authenticated
  USING (public.has_org_permission(org_id, 'facturas_write'))
  WITH CHECK (public.has_org_permission(org_id, 'facturas_write'));
CREATE POLICY "org_member_delete_facturas" ON public.facturas FOR DELETE TO authenticated
  USING (
    -- Solo el titular o un empleado con permiso explícito puede borrar
    public.has_org_role(org_id, ARRAY['titular']::public.org_role[])
  );
