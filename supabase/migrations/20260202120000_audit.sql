-- Modo auditoría: registro inmutable de cambios, quién creó cada asiento, fecha/hora exacta.
-- Correcciones mediante asientos reversos (nueva transacción), no UPDATE/DELETE en ledger.

-- Tabla de auditoría (append-only, inmutable)
CREATE TABLE app.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'insert',
  payload JSONB,
  performed_by UUID REFERENCES app.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON app.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_performed_at ON app.audit_log(performed_at DESC);
CREATE INDEX idx_audit_log_performed_by ON app.audit_log(performed_by) WHERE performed_by IS NOT NULL;

-- Inmutabilidad: no UPDATE/DELETE en audit_log
CREATE OR REPLACE FUNCTION app.reject_audit_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is immutable';
END;
$$;

CREATE TRIGGER trigger_audit_no_update
  BEFORE UPDATE ON app.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION app.reject_audit_mutations();

CREATE TRIGGER trigger_audit_no_delete
  BEFORE DELETE ON app.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION app.reject_audit_mutations();

-- Registrar creación de transacciones
CREATE OR REPLACE FUNCTION app.audit_transaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
BEGIN
  INSERT INTO app.audit_log (entity_type, entity_id, action, payload, performed_by, performed_at)
  VALUES (
    'transaction',
    NEW.id,
    'insert',
    jsonb_build_object(
      'household_id', NEW.household_id,
      'occurred_at', NEW.occurred_at,
      'description', NEW.description,
      'status', NEW.status,
      'external_ref', NEW.external_ref
    ),
    NEW.created_by,
    NEW.created_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_transaction_insert
  AFTER INSERT ON app.transactions
  FOR EACH ROW
  EXECUTE FUNCTION app.audit_transaction_insert();

-- Registrar creación de asientos (ledger_entries)
CREATE OR REPLACE FUNCTION app.audit_ledger_entry_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
BEGIN
  INSERT INTO app.audit_log (entity_type, entity_id, action, payload, performed_by, performed_at)
  VALUES (
    'ledger_entry',
    NEW.id,
    'insert',
    jsonb_build_object(
      'transaction_id', NEW.transaction_id,
      'account_id', NEW.account_id,
      'user_id', NEW.user_id,
      'category', NEW.category,
      'direction', NEW.direction,
      'amount_minor', NEW.amount_minor,
      'currency', NEW.currency
    ),
    NULL,
    NEW.created_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_ledger_entry_insert
  AFTER INSERT ON app.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION app.audit_ledger_entry_insert();

ALTER TABLE app.audit_log ENABLE ROW LEVEL SECURITY;

-- Solo miembros del household pueden leer audit (vía entity_id -> transaction -> household)
CREATE POLICY audit_log_read ON app.audit_log
  FOR SELECT USING (
    (entity_type = 'transaction' AND EXISTS (
      SELECT 1 FROM app.transactions t
      JOIN app.household_members hm ON hm.household_id = t.household_id AND hm.user_id = auth.uid()
      WHERE t.id = audit_log.entity_id
    ))
    OR
    (entity_type = 'ledger_entry' AND EXISTS (
      SELECT 1 FROM app.ledger_entries le
      JOIN app.transactions t ON t.id = le.transaction_id
      JOIN app.household_members hm ON hm.household_id = t.household_id AND hm.user_id = auth.uid()
      WHERE le.id = audit_log.entity_id
    ))
  );

COMMENT ON TABLE app.audit_log IS 'Immutable audit trail; corrections via reversal transactions only';

-- Vista histórica: saldos por cuenta a una fecha/hora
CREATE OR REPLACE FUNCTION app.get_balances_as_of(p_household_id UUID, p_as_of TIMESTAMPTZ)
RETURNS TABLE (account_id UUID, balance_minor BIGINT, currency TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = app
STABLE
AS $$
  SELECT le.account_id,
         SUM(CASE WHEN le.direction = 'debit' THEN le.amount_minor ELSE -le.amount_minor END),
         le.currency
  FROM app.ledger_entries le
  JOIN app.transactions t ON t.id = le.transaction_id
  WHERE t.household_id = p_household_id
    AND t.occurred_at <= p_as_of
    AND (t.status = 'posted' OR t.status = 'reconciled')
  GROUP BY le.account_id, le.currency;
$$;

COMMENT ON FUNCTION app.get_balances_as_of IS 'Reconstruct account balances as of a given timestamp for audit/historical view';
