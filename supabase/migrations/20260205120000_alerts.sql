-- PASO 4 — Alertas automáticas.
-- Detección de anomalías financieras SIN modificar el ledger. Registro de alertas y hook para notificación futura.

CREATE TYPE app.alert_type AS ENUM (
  'anomalous_expense',
  'savings_drift',
  'cashflow_spike'
);

CREATE TYPE app.alert_severity AS ENUM ('low', 'medium', 'high');

-- Tabla de alertas (solo INSERT; lectura para UI/notificaciones).
CREATE TABLE app.financial_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES app.households(id) ON DELETE CASCADE,
  alert_type app.alert_type NOT NULL,
  severity app.alert_severity NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  payload JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  notification_hook_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_alerts_household ON app.financial_alerts(household_id);
CREATE INDEX idx_financial_alerts_detected ON app.financial_alerts(detected_at DESC);
CREATE INDEX idx_financial_alerts_type ON app.financial_alerts(alert_type);

COMMENT ON TABLE app.financial_alerts IS 'PASO 4: Alertas detectadas; no modifica ledger; hook para notificación futura';

-- Detección: gasto anómalo (mes actual > 150% del promedio de los 3 meses anteriores en expense).
-- Usa analytics.monthly_household_summary si existe y está refrescada; si no, se puede llamar con datos ya agregados.
CREATE OR REPLACE FUNCTION app.detect_anomalous_expense(
  p_household_id UUID,
  p_current_month_expense_minor BIGINT,
  p_avg_previous_months_expense_minor NUMERIC
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_avg_previous_months_expense_minor > 0)
     AND (p_current_month_expense_minor::NUMERIC >= 1.5 * p_avg_previous_months_expense_minor);
$$;

-- Detección: drift de ahorro (tasa actual < tasa_anterior - 10 puntos porcentuales).
CREATE OR REPLACE FUNCTION app.detect_savings_drift(
  p_current_savings_rate NUMERIC,
  p_previous_savings_rate NUMERIC
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_previous_savings_rate - p_current_savings_rate) >= 10;
$$;

-- Detección: variación brusca de cashflow (caída > 30% vs mes anterior).
CREATE OR REPLACE FUNCTION app.detect_cashflow_spike(
  p_current_cashflow_minor BIGINT,
  p_previous_cashflow_minor BIGINT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_previous_cashflow_minor > 0)
     AND (p_current_cashflow_minor::NUMERIC <= 0.7 * p_previous_cashflow_minor);
$$;

-- Función principal: evaluar reglas e insertar alertas (solo INSERT en financial_alerts; no toca ledger).
-- Parámetros: household, métricas del mes actual y del anterior (desde analytics o desde app).
CREATE OR REPLACE FUNCTION app.run_alert_detection(
  p_household_id UUID,
  p_current_income_minor BIGINT,
  p_current_expense_minor BIGINT,
  p_previous_income_minor BIGINT,
  p_previous_expense_minor BIGINT,
  p_avg_previous_expense_minor NUMERIC DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
  v_alert_count INT := 0;
  v_curr_cashflow BIGINT;
  v_prev_cashflow BIGINT;
  v_curr_savings NUMERIC;
  v_prev_savings NUMERIC;
  v_avg_exp NUMERIC;
BEGIN
  v_curr_cashflow := p_current_income_minor - p_current_expense_minor;
  v_prev_cashflow := p_previous_income_minor - p_previous_expense_minor;
  v_curr_savings := CASE WHEN p_current_income_minor > 0
    THEN 100.0 * (p_current_income_minor - p_current_expense_minor) / p_current_income_minor ELSE 0 END;
  v_prev_savings := CASE WHEN p_previous_income_minor > 0
    THEN 100.0 * (p_previous_income_minor - p_previous_expense_minor) / p_previous_income_minor ELSE 0 END;
  v_avg_exp := COALESCE(p_avg_previous_expense_minor, p_previous_expense_minor::NUMERIC);

  IF app.detect_anomalous_expense(p_household_id, p_current_expense_minor, v_avg_exp) THEN
    INSERT INTO app.financial_alerts (household_id, alert_type, severity, message, payload)
    VALUES (
      p_household_id,
      'anomalous_expense',
      'high',
      'Gasto anómalo: mes actual >= 150% del promedio anterior.',
      jsonb_build_object(
        'current_expense_minor', p_current_expense_minor,
        'avg_previous_expense_minor', v_avg_exp
      )
    );
    v_alert_count := v_alert_count + 1;
  END IF;

  IF app.detect_savings_drift(v_curr_savings, v_prev_savings) THEN
    INSERT INTO app.financial_alerts (household_id, alert_type, severity, message, payload)
    VALUES (
      p_household_id,
      'savings_drift',
      'medium',
      'Drift de ahorro: tasa actual cayó >= 10 puntos vs mes anterior.',
      jsonb_build_object(
        'current_savings_rate', v_curr_savings,
        'previous_savings_rate', v_prev_savings
      )
    );
    v_alert_count := v_alert_count + 1;
  END IF;

  IF app.detect_cashflow_spike(v_curr_cashflow, v_prev_cashflow) THEN
    INSERT INTO app.financial_alerts (household_id, alert_type, severity, message, payload)
    VALUES (
      p_household_id,
      'cashflow_spike',
      'high',
      'Variación brusca de cashflow: caída >= 30% vs mes anterior.',
      jsonb_build_object(
        'current_cashflow_minor', v_curr_cashflow,
        'previous_cashflow_minor', v_prev_cashflow
      )
    );
    v_alert_count := v_alert_count + 1;
  END IF;

  RETURN v_alert_count;
END;
$$;

COMMENT ON FUNCTION app.run_alert_detection IS 'PASO 4: Evalúa reglas de alerta e inserta en financial_alerts; no modifica ledger';

-- RLS
ALTER TABLE app.financial_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_alerts_read ON app.financial_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = financial_alerts.household_id AND hm.user_id = auth.uid()
    )
  );

-- Inserts solo vía service role o función run_alert_detection (SECURITY DEFINER).
CREATE POLICY financial_alerts_insert ON app.financial_alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = financial_alerts.household_id AND hm.user_id = auth.uid()
    )
  );
