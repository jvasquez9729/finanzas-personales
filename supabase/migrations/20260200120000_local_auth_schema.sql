-- Run this migration FIRST when using local PostgreSQL (without Supabase).
-- It creates the auth schema and minimal auth.users so app migrations can reference them.
-- After this, run the rest of the migrations in order (ledger, audit, analytics, monthly_close, alerts).

CREATE SCHEMA IF NOT EXISTS auth;

-- Minimal auth.users so app.users FK and RLS references work.
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY
);

COMMENT ON TABLE auth.users IS 'Local stub for Supabase auth.users; populate with app user ids.';

-- Función auth.uid() que simula la de Supabase.
-- Devuelve el user_id de la sesión actual (set via SET LOCAL request.jwt.claim.sub = 'uuid').
-- Si no está configurado, devuelve NULL.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
$$;

COMMENT ON FUNCTION auth.uid() IS 'Returns current user UUID from session variable (Supabase compatibility)';
