-- Preparación para AI insights: tablas/vistas derivadas, separación OLTP vs analytics.
-- La AI solo LEE de analytics; NUNCA escribe en app.transactions ni app.ledger_entries.

CREATE SCHEMA IF NOT EXISTS analytics;

-- Vista de eventos financieros (input para patrones, anomalías, proyección).
-- Derivada de ledger + transactions; solo lectura.
CREATE OR REPLACE VIEW analytics.financial_events AS
SELECT
  t.household_id,
  t.id AS transaction_id,
  t.occurred_at,
  t.description,
  le.account_id,
  a.name AS account_name,
  a.type AS account_type,
  a.is_personal,
  a.owner_user_id,
  le.user_id AS entry_user_id,
  le.category,
  le.direction,
  le.amount_minor,
  le.currency,
  CASE
    WHEN le.direction = 'debit' AND a.type IN ('income', 'asset', 'expense') THEN le.amount_minor
    WHEN le.direction = 'credit' AND a.type IN ('income', 'asset', 'expense') THEN -le.amount_minor
    ELSE 0
  END AS signed_amount_minor
FROM app.transactions t
JOIN app.ledger_entries le ON le.transaction_id = t.id
JOIN app.accounts a ON a.id = le.account_id
WHERE t.status IN ('posted', 'reconciled');

COMMENT ON VIEW analytics.financial_events IS 'Read-only view for analytics/AI; do not write to ledger from AI';

-- Vista materializada opcional para agregados por período (evitar consultas pesadas sobre OLTP).
-- Refrescar periódicamente (cron o job), no en cada transacción.
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.monthly_household_summary AS
SELECT
  t.household_id,
  date_trunc('month', t.occurred_at AT TIME ZONE 'UTC') AS month_utc,
  COUNT(DISTINCT t.id) AS transaction_count,
  SUM(CASE WHEN a.type = 'income' THEN (CASE WHEN le.direction = 'debit' THEN le.amount_minor ELSE -le.amount_minor END) ELSE 0 END) AS income_minor,
  SUM(CASE WHEN a.type = 'expense' THEN (CASE WHEN le.direction = 'credit' THEN le.amount_minor ELSE -le.amount_minor END) ELSE 0 END) AS expense_minor
FROM app.transactions t
JOIN app.ledger_entries le ON le.transaction_id = t.id
JOIN app.accounts a ON a.id = le.account_id
WHERE t.status IN ('posted', 'reconciled')
GROUP BY t.household_id, date_trunc('month', t.occurred_at AT TIME ZONE 'UTC');

CREATE UNIQUE INDEX ON analytics.monthly_household_summary (household_id, month_utc);

COMMENT ON MATERIALIZED VIEW analytics.monthly_household_summary IS 'Refresh periodically; for AI/analytics only, not for ledger correctness';

-- RLS: solo miembros del household pueden leer analytics
ALTER VIEW analytics.financial_events SET (security_invoker = on);

-- Política para la vista: se accede vía app.transactions/app.ledger_entries, RLS de app aplica en las tablas subyacentes.
-- La materializada no tiene RLS por defecto; acceso vía servicio con household_id filtrado en la app.
