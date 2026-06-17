-- Migration: Phase 4.5 - Paid Basic plan + 14-day free trial (no card)
-- Path: supabase/migrations/20260616000002_trial.sql
--
-- Decision: BOTH plans (basico/premium) are paid. New organizations start in a
-- 14-day free trial (managed in our DB, NOT in Stripe, because no card is taken
-- up front). Stripe only enters when the titular actually subscribes.
--
-- Access resolution (computed in the app, see AuthProvider):
--   hasAccess = subscription_status = 'active'
--             OR (subscription_status = 'trialing' AND trial_ends_at > now())
--
-- Grandfathering: existing organizations already have subscription_status = 'active'
-- (changing a column DEFAULT never rewrites existing rows) and will get
-- trial_ends_at = NULL (ADD COLUMN without backfill), so they keep full access.

-- 1. Add trial expiry column (existing rows stay NULL → irrelevant while 'active')
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2. New organizations default to a 14-day trial.
--    These defaults only affect FUTURE inserts (the handle_new_user trigger does
--    not set these columns explicitly, so it inherits them automatically).
ALTER TABLE public.organizations
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '14 days');

ALTER TABLE public.organizations
  ALTER COLUMN subscription_status SET DEFAULT 'trialing';

-- NOTE: existing rows are intentionally left untouched (grandfathered as 'active').
-- If you ever want to reset your own test orgs to trial to test the paywall, run
-- manually (NOT part of this migration):
--   UPDATE public.organizations
--     SET subscription_status = 'trialing', trial_ends_at = now() + interval '14 days'
--     WHERE id = '<org-id>';
