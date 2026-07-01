-- Migration: Add active status to trabajadores table
-- Path: supabase/migrations/20260616000003_trabajadores_activo.sql

ALTER TABLE public.trabajadores
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
