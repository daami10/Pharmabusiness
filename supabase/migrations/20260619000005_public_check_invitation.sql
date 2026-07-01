-- Migration: Public helper to check if email has pending invitation without auth
-- Path: supabase/migrations/20260619000005_public_check_invitation.sql

CREATE OR REPLACE FUNCTION public.is_email_invited(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invitations
    WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;
