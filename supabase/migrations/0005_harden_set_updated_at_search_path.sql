-- Security hardening for the set_updated_at() trigger function added in 0004.
--
-- Supabase's security advisor (lint 0011, function_search_path_mutable) flags
-- functions without a pinned search_path. now() lives in pg_catalog and is
-- always resolvable, so an empty search_path is safe and closes the warning.
--
-- Pending application — not yet applied to the cloud DB (the WS1 sign-off
-- covered migration 0004 only). Apply with `pnpm supabase:push` or have it
-- applied via the Supabase MCP after review.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
