-- Migration: categorías personalizadas por organización
-- Path: supabase/migrations/20260723000000_org_categories.sql
--
-- Permite que cada organización defina sus propias categorías de factura (además
-- de las de sistema: Laboratorio / Mayorista / Otro / Abono). Mismo patrón que
-- `wholesalers` (array de texto en la fila de la organización).

-- 1. Columna nueva (los array vacíos son el default; las orgs existentes quedan '{}').
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

-- 2. Ampliar el GRANT por columnas del lockdown (20260708000000) para incluir
--    `categories`. La RLS `update_org` (has_org_role titular) sigue vigente, así que
--    solo el titular puede editar sus categorías (igual que los mayoristas).
--    Las columnas de facturación siguen siendo solo del service_role.
GRANT UPDATE (nombre, wholesalers, categories) ON public.organizations TO authenticated;
