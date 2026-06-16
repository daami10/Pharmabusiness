-- Migration: Phase 3 - Role-based permissions (titular only for payroll & tax)
-- Path: supabase/migrations/20260616000001_role_permissions.sql

-- Drop existing organization member policies for fiscalidad, trabajadores, nominas, seguros_sociales
DO $$
BEGIN
  DROP POLICY IF EXISTS "org_member_select" ON public.fiscalidad;
  DROP POLICY IF EXISTS "org_member_insert" ON public.fiscalidad;
  DROP POLICY IF EXISTS "org_member_update" ON public.fiscalidad;
  DROP POLICY IF EXISTS "org_member_delete" ON public.fiscalidad;

  DROP POLICY IF EXISTS "org_member_select" ON public.trabajadores;
  DROP POLICY IF EXISTS "org_member_insert" ON public.trabajadores;
  DROP POLICY IF EXISTS "org_member_update" ON public.trabajadores;
  DROP POLICY IF EXISTS "org_member_delete" ON public.trabajadores;

  DROP POLICY IF EXISTS "org_member_select" ON public.nominas;
  DROP POLICY IF EXISTS "org_member_insert" ON public.nominas;
  DROP POLICY IF EXISTS "org_member_update" ON public.nominas;
  DROP POLICY IF EXISTS "org_member_delete" ON public.nominas;

  DROP POLICY IF EXISTS "org_member_select" ON public.seguros_sociales;
  DROP POLICY IF EXISTS "org_member_insert" ON public.seguros_sociales;
  DROP POLICY IF EXISTS "org_member_update" ON public.seguros_sociales;
  DROP POLICY IF EXISTS "org_member_delete" ON public.seguros_sociales;
END $$;

-- Create new policies restricting access to organization owners (role = 'titular')
CREATE POLICY "org_titular_select" ON public.fiscalidad FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_insert" ON public.fiscalidad FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_update" ON public.fiscalidad FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[])) 
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_delete" ON public.fiscalidad FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

CREATE POLICY "org_titular_select" ON public.trabajadores FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_insert" ON public.trabajadores FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_update" ON public.trabajadores FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[])) 
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_delete" ON public.trabajadores FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

CREATE POLICY "org_titular_select" ON public.nominas FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_insert" ON public.nominas FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_update" ON public.nominas FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[])) 
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_delete" ON public.nominas FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

CREATE POLICY "org_titular_select" ON public.seguros_sociales FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_insert" ON public.seguros_sociales FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_update" ON public.seguros_sociales FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[])) 
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
CREATE POLICY "org_titular_delete" ON public.seguros_sociales FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));
