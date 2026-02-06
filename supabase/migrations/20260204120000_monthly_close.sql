-- PASO 1 — Cierre mensual (soft close).
-- Snapshot mensual de saldos SIN modificar el ledger. No bloquea nuevas transacciones.

-- Cabecera del cierre: una fila por household por periodo (mes).
CREATE TABLE app.monthly_close_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES app.households(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  cutoff_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES app.users(id) ON DELETE SET NULL,
  UNIQUE (household_id, period_date)
);

COMMENT ON TABLE app.monthly_close_snapshot IS 'Soft close: snapshot header per household per month; does not modify ledger';

CREATE INDEX idx_monthly_close_household_period ON app.monthly_close_snapshot(household_id, period_date DESC);

-- Líneas del cierre: saldo por cuenta en ese corte.
CREATE TABLE app.monthly_close_snapshot_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES app.monthly_close_snapshot(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  balance_minor BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  UNIQUE (snapshot_id, account_id)
);

CREATE INDEX idx_monthly_close_lines_snapshot ON app.monthly_close_snapshot_lines(snapshot_id);

-- Función: ejecutar cierre para un household y un mes (solo LECTURA del ledger + INSERT en snapshot).
CREATE OR REPLACE FUNCTION app.run_monthly_close(
  p_household_id UUID,
  p_period_date DATE,
  p_cutoff_at TIMESTAMPTZ DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_snapshot_id UUID;
BEGIN
  v_cutoff := COALESCE(p_cutoff_at, (p_period_date + INTERVAL '1 month')::date - INTERVAL '1 second');
  INSERT INTO app.monthly_close_snapshot (household_id, period_date, cutoff_at, created_by)
  VALUES (p_household_id, p_period_date, v_cutoff, p_created_by)
  ON CONFLICT (household_id, period_date) DO UPDATE SET
    cutoff_at = EXCLUDED.cutoff_at,
    created_by = EXCLUDED.created_by
  RETURNING id INTO v_snapshot_id;
  DELETE FROM app.monthly_close_snapshot_lines WHERE snapshot_id = v_snapshot_id;
  INSERT INTO app.monthly_close_snapshot_lines (snapshot_id, account_id, balance_minor, currency)
  SELECT v_snapshot_id, b.account_id, b.balance_minor, b.currency
  FROM app.get_balances_as_of(p_household_id, v_cutoff) b;
  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION app.run_monthly_close IS 'Soft close: persists balances at cutoff; does not modify ledger; new transactions after cutoff are allowed';

-- Función: obtener saldos "al cierre" de un mes (desde snapshot o calculado).
CREATE OR REPLACE FUNCTION app.get_balances_at_close(
  p_household_id UUID,
  p_period_date DATE
)
RETURNS TABLE (account_id UUID, balance_minor BIGINT, currency TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = app
STABLE
AS $$
  SELECT msl.account_id, msl.balance_minor, msl.currency
  FROM app.monthly_close_snapshot mcs
  JOIN app.monthly_close_snapshot_lines msl ON msl.snapshot_id = mcs.id
  WHERE mcs.household_id = p_household_id
    AND mcs.period_date = p_period_date;
$$;

-- Si no existe snapshot, devolver saldos calculados al último instante del mes (fallback).
CREATE OR REPLACE FUNCTION app.get_balances_at_close_or_calc(
  p_household_id UUID,
  p_period_date DATE
)
RETURNS TABLE (account_id UUID, balance_minor BIGINT, currency TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = app
STABLE
AS $$
  SELECT b.account_id, b.balance_minor, b.currency
  FROM app.get_balances_at_close(p_household_id, p_period_date) b
  UNION ALL
  SELECT b.account_id, b.balance_minor, b.currency
  FROM app.get_balances_as_of(p_household_id, (p_period_date + INTERVAL '1 month')::date - INTERVAL '1 second') b
  WHERE NOT EXISTS (
    SELECT 1 FROM app.get_balances_at_close(p_household_id, p_period_date) LIMIT 1
  );
$$;

-- Vista: balances por contexto (personal vs familiar) al cierre.
-- "Contexto familiar" = suma de todas las cuentas del household en el snapshot.
-- "Contexto personal" = suma de cuentas con is_personal = true y mismo owner_user_id.
CREATE OR REPLACE FUNCTION app.get_balances_at_close_by_context(
  p_household_id UUID,
  p_period_date DATE
)
RETURNS TABLE (
  context_type TEXT,
  owner_user_id UUID,
  total_balance_minor BIGINT,
  currency TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = app
STABLE
AS $$
  SELECT
    CASE WHEN a.is_personal THEN 'personal' ELSE 'family' END,
    a.owner_user_id,
    SUM(msl.balance_minor),
    msl.currency
  FROM app.monthly_close_snapshot mcs
  JOIN app.monthly_close_snapshot_lines msl ON msl.snapshot_id = mcs.id
  JOIN app.accounts a ON a.id = msl.account_id
  WHERE mcs.household_id = p_household_id
    AND mcs.period_date = p_period_date
  GROUP BY (a.is_personal, a.owner_user_id, msl.currency);
$$;

-- RLS
ALTER TABLE app.monthly_close_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.monthly_close_snapshot_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY monthly_close_snapshot_read ON app.monthly_close_snapshot
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = monthly_close_snapshot.household_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY monthly_close_snapshot_insert ON app.monthly_close_snapshot
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = monthly_close_snapshot.household_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY monthly_close_lines_read ON app.monthly_close_snapshot_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.monthly_close_snapshot mcs
      JOIN app.household_members hm ON hm.household_id = mcs.household_id AND hm.user_id = auth.uid()
      WHERE mcs.id = monthly_close_snapshot_lines.snapshot_id
    )
  );

CREATE POLICY monthly_close_lines_insert ON app.monthly_close_snapshot_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.monthly_close_snapshot mcs
      JOIN app.household_members hm ON hm.household_id = mcs.household_id AND hm.user_id = auth.uid()
      WHERE mcs.id = monthly_close_snapshot_lines.snapshot_id
    )
  );
