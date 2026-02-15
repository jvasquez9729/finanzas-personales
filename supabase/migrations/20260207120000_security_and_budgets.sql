-- Migration: Políticas RLS completas, tabla de presupuestos y mejoras de seguridad
-- Ejecutar después de las migraciones anteriores

-- ============================================
-- 1. POLÍTICAS RLS ADICIONALES
-- ============================================

-- Política UPDATE para transacciones (solo creador o admin)
CREATE POLICY transactions_member_update ON app.transactions
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = transactions.household_id 
        AND hm.user_id = auth.uid()
        AND hm.role = 'admin'
    )
  );

-- Política DELETE para transacciones (solo si no está reconciliada y es creador)
CREATE POLICY transactions_member_delete ON app.transactions
  FOR DELETE USING (
    created_by = auth.uid() AND
    status != 'reconciled' AND
    NOT EXISTS (
      SELECT 1 FROM app.ledger_entries le
      WHERE le.transaction_id = transactions.id
    )
  );

-- Política mejorada para accounts (filtrar cuentas personales)
DROP POLICY IF EXISTS accounts_member_read ON app.accounts;
CREATE POLICY accounts_member_read ON app.accounts
  FOR SELECT USING (
    -- Cuentas familiares: visibles a todos los miembros
    (is_personal = false AND EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = accounts.household_id AND hm.user_id = auth.uid()
    ))
    OR
    -- Cuentas personales: solo al owner
    (is_personal = true AND owner_user_id = auth.uid())
  );

-- ============================================
-- 2. TABLA DE PRESUPUESTOS (BUDGETS)
-- ============================================

CREATE TABLE IF NOT EXISTS app.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES app.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  limit_minor BIGINT NOT NULL CHECK (limit_minor > 0),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  alert_threshold INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold BETWEEN 1 AND 100),
  rollover BOOLEAN NOT NULL DEFAULT false,
  rollover_amount BIGINT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES app.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, category, period)
);

-- Índices para budgets
CREATE INDEX idx_budgets_household ON app.budgets(household_id);
CREATE INDEX idx_budgets_category ON app.budgets(category);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_budgets_updated_at
  BEFORE UPDATE ON app.budgets
  FOR EACH ROW
  EXECUTE FUNCTION app.update_updated_at_column();

-- RLS para budgets
ALTER TABLE app.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_member_read ON app.budgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = budgets.household_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY budgets_member_insert ON app.budgets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = budgets.household_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY budgets_member_update ON app.budgets
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = budgets.household_id 
        AND hm.user_id = auth.uid()
        AND hm.role = 'admin'
    )
  );

CREATE POLICY budgets_member_delete ON app.budgets
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = budgets.household_id 
        AND hm.user_id = auth.uid()
        AND hm.role = 'admin'
    )
  );

-- ============================================
-- 3. ÍNDICES ADICIONALES OPTIMIZADOS
-- ============================================

-- Índice para ledger entries por cuenta y fecha
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created 
ON app.ledger_entries(account_id, created_at DESC);

-- Índice para transacciones con campos incluidos
CREATE INDEX IF NOT EXISTS idx_transactions_household_occurred_include 
ON app.transactions(household_id, occurred_at DESC) 
INCLUDE (description, status, external_ref, created_by);

-- Índice para búsqueda por external_ref
CREATE INDEX IF NOT EXISTS idx_transactions_external_ref 
ON app.transactions(external_ref) 
WHERE external_ref IS NOT NULL;

-- ============================================
-- 4. FUNCIÓN RPC ATÓMICA PARA CREAR TRANSACCIONES
-- ============================================

CREATE OR REPLACE FUNCTION app.create_transaction_atomic(
  p_household_id UUID,
  p_occurred_at TIMESTAMPTZ,
  p_description TEXT,
  p_external_ref TEXT,
  p_created_by UUID,
  p_entries JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
  v_transaction_id UUID;
  entry JSONB;
BEGIN
  -- Verificar que el usuario es miembro del household
  IF NOT EXISTS (
    SELECT 1 FROM app.household_members 
    WHERE household_id = p_household_id AND user_id = p_created_by
  ) THEN
    RAISE EXCEPTION 'Usuario no es miembro del household';
  END IF;

  -- Insertar transacción
  INSERT INTO app.transactions (
    household_id, 
    occurred_at, 
    description, 
    external_ref, 
    created_by, 
    status
  ) VALUES (
    p_household_id, 
    p_occurred_at, 
    p_description, 
    p_external_ref, 
    p_created_by, 
    'posted'
  )
  RETURNING id INTO v_transaction_id;
  
  -- Insertar entries
  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO app.ledger_entries (
      transaction_id, 
      account_id, 
      user_id, 
      category,
      direction, 
      amount_minor, 
      currency
    ) VALUES (
      v_transaction_id,
      (entry->>'account_id')::UUID,
      (entry->>'user_id')::UUID,
      entry->>'category',
      entry->>'direction',
      (entry->>'amount_minor')::BIGINT,
      COALESCE(entry->>'currency', 'MXN')
    );
  END LOOP;
  
  RETURN v_transaction_id;
END;
$$;

-- ============================================
-- 5. FUNCIÓN PARA CALCULAR GASTO VS PRESUPUESTO
-- ============================================

CREATE OR REPLACE FUNCTION app.get_budget_vs_actual(
  p_household_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  budget_id UUID,
  budget_name TEXT,
  category TEXT,
  budget_limit BIGINT,
  actual_spent BIGINT,
  percentage_used NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = app
STABLE
AS $$
  SELECT 
    b.id as budget_id,
    b.name as budget_name,
    b.category,
    b.limit_minor + b.rollover_amount as budget_limit,
    COALESCE(SUM(CASE 
      WHEN le.direction = 'credit' THEN le.amount_minor 
      ELSE -le.amount_minor 
    END), 0) as actual_spent,
    CASE 
      WHEN b.limit_minor + b.rollover_amount > 0 
      THEN ROUND(
        (COALESCE(SUM(CASE 
          WHEN le.direction = 'credit' THEN le.amount_minor 
          ELSE -le.amount_minor 
        END), 0)::NUMERIC / (b.limit_minor + b.rollover_amount)) * 100, 
        2
      )
      ELSE 0
    END as percentage_used
  FROM app.budgets b
  LEFT JOIN app.ledger_entries le ON le.category = b.category
  LEFT JOIN app.transactions t ON t.id = le.transaction_id
    AND t.occurred_at >= p_period_start
    AND t.occurred_at <= p_period_end
  WHERE b.household_id = p_household_id
  GROUP BY b.id, b.name, b.category, b.limit_minor, b.rollover_amount;
$$;

-- ============================================
-- 6. TABLA DE LOGS DE SEGURIDAD
-- ============================================

CREATE TABLE IF NOT EXISTS app.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  user_id UUID REFERENCES app.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_logs_event ON app.security_logs(event);
CREATE INDEX idx_security_logs_created ON app.security_logs(created_at DESC);
CREATE INDEX idx_security_logs_user ON app.security_logs(user_id);

-- RLS para security_logs (solo admins pueden leer)
ALTER TABLE app.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_logs_admin_read ON app.security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.user_id = auth.uid() AND hm.role = 'admin'
    )
  );

COMMENT ON TABLE app.budgets IS 'Presupuestos familiares por categoría y período';
COMMENT ON TABLE app.security_logs IS 'Logs de eventos de seguridad para auditoría';
