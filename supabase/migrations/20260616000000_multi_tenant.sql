-- Migration: multi-tenant data model ("org de uno")
-- Path: supabase/migrations/20260616000000_multi_tenant.sql

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'basico',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  wholesalers TEXT[] NOT NULL DEFAULT ARRAY['FedeFarma'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create public.org_role enum type (check if exists first)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE public.org_role AS ENUM ('titular', 'empleado');
  END IF;
END $$;

-- 3. Create memberships table
CREATE TABLE IF NOT EXISTS public.memberships (
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'empleado',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships (user_id);

-- 4. Create security helpers
CREATE OR REPLACE FUNCTION public.is_org_member(target_org UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = target_org AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(target_org UUID, target_roles public.org_role[])
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE org_id = target_org AND user_id = auth.uid() AND role = ANY(target_roles)
  );
$$;

-- 5. Enable RLS on core tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "select_org" ON public.organizations;
  DROP POLICY IF EXISTS "update_org" ON public.organizations;
END $$;

CREATE POLICY "select_org" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));

CREATE POLICY "update_org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(id, ARRAY['titular']::public.org_role[]))
  WITH CHECK (public.has_org_role(id, ARRAY['titular']::public.org_role[]));

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "select_memberships" ON public.memberships;
  DROP POLICY IF EXISTS "all_memberships_owner" ON public.memberships;
END $$;

CREATE POLICY "select_memberships" ON public.memberships FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR user_id = auth.uid());

CREATE POLICY "all_memberships_owner" ON public.memberships FOR ALL TO authenticated
  USING (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, ARRAY['titular']::public.org_role[]));

-- 6. Add nullable org_id columns to domain tables
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.fiscalidad ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.trabajadores ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.nominas ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.seguros_sociales ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_facturas_org_id ON public.facturas (org_id);
CREATE INDEX IF NOT EXISTS idx_fiscalidad_org_id ON public.fiscalidad (org_id);
CREATE INDEX IF NOT EXISTS idx_trabajadores_org_id ON public.trabajadores (org_id);
CREATE INDEX IF NOT EXISTS idx_nominas_org_id ON public.nominas (org_id);
CREATE INDEX IF NOT EXISTS idx_seguros_sociales_org_id ON public.seguros_sociales (org_id);

-- 7. Execute PL/pgSQL Backfill script
DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
  meta_wholesalers JSONB;
  wholesalers_arr TEXT[];
BEGIN
  FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    -- If user already has a membership, skip (idempotency)
    IF NOT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = user_record.id) THEN
      
      -- Parse wholesalers from user metadata if it is a JSON array
      meta_wholesalers := user_record.raw_user_meta_data->'wholesalers';
      wholesalers_arr := ARRAY[]::TEXT[];
      IF meta_wholesalers IS NOT NULL AND jsonb_typeof(meta_wholesalers) = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(meta_wholesalers)) INTO wholesalers_arr;
      END IF;
      
      -- Fallback to default FedeFarma if empty
      IF wholesalers_arr IS NULL OR array_length(wholesalers_arr, 1) IS NULL THEN
        wholesalers_arr := ARRAY['FedeFarma']::TEXT[];
      END IF;

      -- Create organization
      INSERT INTO public.organizations (nombre, owner_id, wholesalers)
      VALUES (
        COALESCE(user_record.raw_user_meta_data->>'organization_name', 'Farmacia de ' || COALESCE(user_record.email, user_record.id::text)),
        user_record.id,
        wholesalers_arr
      )
      RETURNING id INTO new_org_id;

      -- Create membership as owner (titular)
      INSERT INTO public.memberships (org_id, user_id, role, status)
      VALUES (new_org_id, user_record.id, 'titular', 'active');

      -- Associate existing records of this user to the new org_id
      UPDATE public.facturas SET org_id = new_org_id WHERE user_id = user_record.id;
      UPDATE public.fiscalidad SET org_id = new_org_id WHERE user_id = user_record.id;
      UPDATE public.trabajadores SET org_id = new_org_id WHERE user_id = user_record.id;
      UPDATE public.nominas SET org_id = new_org_id WHERE user_id = user_record.id;
      UPDATE public.seguros_sociales SET org_id = new_org_id WHERE user_id = user_record.id;

    END IF;
  END LOOP;
END $$;

-- 8. Clean up orphaned rows (rows with null org_id since their user no longer exists)
DELETE FROM public.facturas WHERE org_id IS NULL;
DELETE FROM public.fiscalidad WHERE org_id IS NULL;
DELETE FROM public.trabajadores WHERE org_id IS NULL;
DELETE FROM public.nominas WHERE org_id IS NULL;
DELETE FROM public.seguros_sociales WHERE org_id IS NULL;

-- 9. Alter columns to enforce NOT NULL constraints
ALTER TABLE public.facturas ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.fiscalidad ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.trabajadores ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.nominas ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.seguros_sociales ALTER COLUMN org_id SET NOT NULL;

-- 10. Update RLS policies for domain tables (Drop old policies and create org policies)
DO $$
BEGIN
  -- Drop old own_data policies
  DROP POLICY IF EXISTS "own_data" ON public.facturas;
  DROP POLICY IF EXISTS "own_data" ON public.fiscalidad;
  DROP POLICY IF EXISTS "own_data" ON public.trabajadores;
  DROP POLICY IF EXISTS "own_data" ON public.nominas;
  DROP POLICY IF EXISTS "own_data" ON public.seguros_sociales;

  -- Drop existing org policies if run before
  DROP POLICY IF EXISTS "org_member_select" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_insert" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_update" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_delete" ON public.facturas;

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

-- 11. Create new org RLS policies for domain tables
CREATE POLICY "org_member_select" ON public.facturas FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org_member_insert" ON public.facturas FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_update" ON public.facturas FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_delete" ON public.facturas FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org_member_select" ON public.fiscalidad FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org_member_insert" ON public.fiscalidad FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_update" ON public.fiscalidad FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_delete" ON public.fiscalidad FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org_member_select" ON public.trabajadores FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org_member_insert" ON public.trabajadores FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_update" ON public.trabajadores FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_delete" ON public.trabajadores FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org_member_select" ON public.nominas FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org_member_insert" ON public.nominas FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_update" ON public.nominas FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_delete" ON public.nominas FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org_member_select" ON public.seguros_sociales FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org_member_insert" ON public.seguros_sociales FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_update" ON public.seguros_sociales FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "org_member_delete" ON public.seguros_sociales FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- 12. Create trigger to automatically assign organization on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create default organization for the user
  INSERT INTO public.organizations (nombre, owner_id, wholesalers)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'organization_name', 'Farmacia de ' || COALESCE(new.email, new.id::text)),
    new.id,
    ARRAY['FedeFarma']::TEXT[]
  )
  RETURNING id INTO new_org_id;

  -- Assign the user as owner (titular) of the organization
  INSERT INTO public.memberships (org_id, user_id, role, status)
  VALUES (new_org_id, new.id, 'titular', 'active');

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
