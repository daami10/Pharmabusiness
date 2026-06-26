-- Migration: Phase 5 - Super Admin Access and Control Dashboard
-- Path: supabase/migrations/20260626000000_super_admin.sql

-- 1. Create super_admins table
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS on super_admins
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy for super_admins (users can only check their own admin status)
DO $$
BEGIN
  DROP POLICY IF EXISTS "select_own_super_admin" ON public.super_admins;
END $$;

CREATE POLICY "select_own_super_admin" ON public.super_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4. Helper function to check if the current user is a super-admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  );
$$;

-- 5. Update RLS policies for organizations to allow super-admins full read access
DO $$
BEGIN
  DROP POLICY IF EXISTS "select_org" ON public.organizations;
END $$;

CREATE POLICY "select_org" ON public.organizations 
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_org_member(id));

-- 6. Update RLS policies for memberships to allow super-admins full read access
DO $$
BEGIN
  DROP POLICY IF EXISTS "select_memberships" ON public.memberships;
END $$;

CREATE POLICY "select_memberships" ON public.memberships 
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_org_member(org_id) OR user_id = auth.uid());

-- 7. Modify handle_new_user trigger to auto-assign super-admin role to damianrossy@gfarma.app
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

  -- Auto-promote to super admin if the email is damianrossy@gfarma.app
  IF LOWER(new.email) = 'damianrossy@gfarma.app' THEN
    INSERT INTO public.super_admins (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- 8. Seeding/Fixing the existing user: damianrossy@gfarma.app if already registered
DO $$
DECLARE
  target_user_id UUID;
  new_org_id UUID;
BEGIN
  -- Get user ID for damianrossy@gfarma.app
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'damianrossy@gfarma.app';

  IF target_user_id IS NOT NULL THEN
    -- A. Remove existing memberships (unlinking the test guest link)
    DELETE FROM public.memberships WHERE user_id = target_user_id;

    -- B. Ensure they own their own organization "GFarma Admin"
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE owner_id = target_user_id) THEN
      INSERT INTO public.organizations (nombre, owner_id, plan, subscription_status, wholesalers)
      VALUES ('GFarma Admin', target_user_id, 'premium', 'active', ARRAY['FedeFarma']::TEXT[])
      RETURNING id INTO new_org_id;

      INSERT INTO public.memberships (org_id, user_id, role, status, custom_name, email, permissions)
      VALUES (
        new_org_id, 
        target_user_id, 
        'titular', 
        'active', 
        'Administrador', 
        'damianrossy@gfarma.app', 
        '{"facturas_read": true, "facturas_write": true, "abonos_read": true, "abonos_write": true, "analisis_read": true, "fiscalidad_read": true, "trabajadores_read": true}'::jsonb
      );
    ELSE
      -- If they already had an organization, make sure it is linked back in memberships
      SELECT id INTO new_org_id FROM public.organizations WHERE owner_id = target_user_id LIMIT 1;
      INSERT INTO public.memberships (org_id, user_id, role, status, custom_name, email, permissions)
      VALUES (
        new_org_id, 
        target_user_id, 
        'titular', 
        'active', 
        'Administrador', 
        'damianrossy@gfarma.app', 
        '{"facturas_read": true, "facturas_write": true, "abonos_read": true, "abonos_write": true, "analisis_read": true, "fiscalidad_read": true, "trabajadores_read": true}'::jsonb
      )
      ON CONFLICT DO NOTHING;
    END IF;

    -- C. Insert into super_admins
    INSERT INTO public.super_admins (user_id)
    VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
