-- Mini-ledger: double-entry, immutable, personal + household context
-- Run in Supabase SQL Editor or via supabase db push

CREATE SCHEMA IF NOT EXISTS app;

-- Enums
CREATE TYPE app.account_type AS ENUM (
  'cash', 'bank', 'cc', 'investment', 'asset', 'liability', 'equity', 'income', 'expense'
);

CREATE TYPE app.txn_status AS ENUM ('pending', 'posted', 'reconciled');

CREATE TYPE app.entry_dir AS ENUM ('debit', 'credit');

-- Users (sync from auth.users or populate via API)
CREATE TABLE app.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

-- Households
CREATE TABLE app.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Membership: who belongs to which household (both admins in this app)
CREATE TABLE app.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES app.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

CREATE INDEX idx_household_members_household ON app.household_members(household_id);
CREATE INDEX idx_household_members_user ON app.household_members(user_id);

-- Accounts (personal or shared)
CREATE TABLE app.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES app.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type app.account_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  is_personal BOOLEAN NOT NULL DEFAULT false,
  owner_user_id UUID REFERENCES app.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, name),
  CONSTRAINT chk_personal_owner CHECK (
    (is_personal = false) OR (is_personal = true AND owner_user_id IS NOT NULL)
  )
);

CREATE INDEX idx_accounts_household ON app.accounts(household_id);
CREATE INDEX idx_accounts_owner ON app.accounts(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Transactions (header)
CREATE TABLE app.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES app.households(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  status app.txn_status NOT NULL DEFAULT 'posted',
  external_ref TEXT,
  created_by UUID REFERENCES app.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (household_id, external_ref)
);

CREATE INDEX idx_transactions_household_occurred ON app.transactions(household_id, occurred_at DESC);

-- Ledger entries (double-entry, immutable)
CREATE TABLE app.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES app.transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES app.accounts(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES app.users(id) ON DELETE SET NULL,
  category TEXT,
  direction app.entry_dir NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_amount_positive CHECK (amount_minor > 0)
);

CREATE INDEX idx_ledger_entries_txn ON app.ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account ON app.ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_created ON app.ledger_entries(created_at);

-- Balance constraint: sum of debits = sum of credits per transaction
CREATE OR REPLACE FUNCTION app.check_transaction_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
  bal BIGINT;
BEGIN
  SELECT SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE -amount_minor END)
  INTO bal
  FROM app.ledger_entries
  WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  IF bal IS NOT NULL AND bal != 0 THEN
    RAISE EXCEPTION 'Transaction balance must be zero, got %', bal;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE CONSTRAINT TRIGGER trigger_transaction_balance
  AFTER INSERT OR DELETE ON app.ledger_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION app.check_transaction_balance();

-- Same currency per transaction
CREATE OR REPLACE FUNCTION app.check_transaction_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
  first_currency TEXT;
BEGIN
  SELECT currency INTO first_currency
  FROM app.ledger_entries
  WHERE transaction_id = NEW.transaction_id
  LIMIT 1;
  IF first_currency IS NOT NULL AND first_currency != NEW.currency THEN
    RAISE EXCEPTION 'All entries in a transaction must use the same currency';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_transaction_currency
  BEFORE INSERT ON app.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION app.check_transaction_currency();

-- Immutability: no UPDATE/DELETE on ledger_entries (only INSERT; reversals = new transaction)
CREATE OR REPLACE FUNCTION app.reject_ledger_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable';
END;
$$;

CREATE TRIGGER trigger_ledger_no_update
  BEFORE UPDATE ON app.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION app.reject_ledger_mutations();

CREATE TRIGGER trigger_ledger_no_delete
  BEFORE DELETE ON app.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION app.reject_ledger_mutations();

-- RLS
ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Users: own row only
CREATE POLICY users_own ON app.users
  FOR ALL USING (auth.uid() = id);

-- Households: members can read
CREATE POLICY households_member_read ON app.households
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = households.id AND hm.user_id = auth.uid()
    )
  );

-- Household members: members can read
CREATE POLICY household_members_read ON app.household_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app.household_members hm2
      WHERE hm2.household_id = household_members.household_id AND hm2.user_id = auth.uid()
    )
  );

-- Accounts: members of household can read; personal accounts visible to owner
CREATE POLICY accounts_member_read ON app.accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = accounts.household_id AND hm.user_id = auth.uid()
    )
  );

-- Transactions: same household membership
CREATE POLICY transactions_member_read ON app.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = transactions.household_id AND hm.user_id = auth.uid()
    )
  );

-- Ledger entries: read via transaction -> household
CREATE POLICY ledger_entries_read ON app.ledger_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.transactions t
      JOIN app.household_members hm ON hm.household_id = t.household_id AND hm.user_id = auth.uid()
      WHERE t.id = ledger_entries.transaction_id
    )
  );

-- Members can insert transactions for their household
CREATE POLICY transactions_member_insert ON app.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.household_members hm
      WHERE hm.household_id = transactions.household_id AND hm.user_id = auth.uid()
    )
  );

-- Members can insert ledger entries for transactions in their household
CREATE POLICY ledger_entries_insert ON app.ledger_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.transactions t
      JOIN app.household_members hm ON hm.household_id = t.household_id AND hm.user_id = auth.uid()
      WHERE t.id = ledger_entries.transaction_id
    )
  );

COMMENT ON TABLE app.ledger_entries IS 'Immutable double-entry lines; balance enforced per transaction';

-- RPC: balances by account for a household (for API)
CREATE OR REPLACE FUNCTION app.get_balances(p_household_id UUID)
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
  GROUP BY le.account_id, le.currency;
$$;
