import type { PoolClient } from "pg";
import { pool } from "./db.js";

export interface AccountRow {
  id: string;
  household_id: string;
  name: string;
  type: string;
  currency: string;
  is_personal: boolean;
  owner_user_id: string | null;
}

export interface BalanceRow {
  account_id: string;
  balance_minor: number;
  currency: string;
}

export async function getAccounts(
  client: PoolClient,
  householdId: string,
  ownerUserId?: string
): Promise<AccountRow[]> {
  let query =
    "SELECT id, household_id, name, type, currency, is_personal, owner_user_id FROM app.accounts WHERE household_id = $1";
  const params: string[] = [householdId];
  if (ownerUserId !== undefined) {
    params.push(ownerUserId);
    query += " AND owner_user_id = $2";
  }
  query += " ORDER BY name";
  const res = await client.query(query, params);
  return res.rows as AccountRow[];
}

export async function getBalances(
  client: PoolClient,
  householdId: string
): Promise<BalanceRow[]> {
  const res = await client.query(
    "SELECT account_id, balance_minor::bigint AS balance_minor, currency FROM app.get_balances($1)",
    [householdId]
  );
  return res.rows.map((r: { account_id: string; balance_minor: string | number; currency: string }) => ({
    account_id: r.account_id,
    balance_minor: typeof r.balance_minor === "string" ? Number(r.balance_minor) : r.balance_minor,
    currency: r.currency,
  })) as BalanceRow[];
}

export interface LedgerEntryInput {
  account_id: string;
  user_id?: string | null;
  category?: string | null;
  direction: "debit" | "credit";
  amount_minor: number;
  currency: string;
}

export interface CreateTransactionInput {
  household_id: string;
  occurred_at: string;
  description: string;
  external_ref?: string | null;
  created_by: string | null;
  entries: LedgerEntryInput[];
}

function assertBalance(entries: LedgerEntryInput[]): void {
  let sum = 0;
  for (const e of entries) {
    if (e.amount_minor <= 0) throw new Error("amount_minor must be positive");
    sum += e.direction === "debit" ? e.amount_minor : -e.amount_minor;
  }
  if (sum !== 0)
    throw new Error("Transaction entries must balance (debits = credits)");
}

export async function createTransaction(
  client: PoolClient,
  input: CreateTransactionInput
): Promise<{ id: string }> {
  assertBalance(input.entries);
  const txnRes = await client.query(
    `INSERT INTO app.transactions (household_id, occurred_at, description, external_ref, created_by, status)
     VALUES ($1, $2, $3, $4, $5, 'posted')
     RETURNING id`,
    [
      input.household_id,
      input.occurred_at,
      input.description,
      input.external_ref ?? null,
      input.created_by,
    ]
  );
  const txn = txnRes.rows[0];
  if (!txn?.id) throw new Error("Failed to create transaction");
  const txnId = txn.id as string;

  for (const e of input.entries) {
    await client.query(
      `INSERT INTO app.ledger_entries (transaction_id, account_id, user_id, category, direction, amount_minor, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        txnId,
        e.account_id,
        e.user_id ?? null,
        e.category ?? null,
        e.direction,
        e.amount_minor,
        e.currency,
      ]
    );
  }
  return { id: txnId };
}

export async function isMember(
  client: PoolClient,
  householdId: string,
  userId: string
): Promise<boolean> {
  const res = await client.query(
    "SELECT id FROM app.household_members WHERE household_id = $1 AND user_id = $2",
    [householdId, userId]
  );
  return res.rowCount !== null && res.rowCount > 0;
}

export async function logBlockedLedgerWrite(params: {
  household_id: string;
  user_id: string;
  request_id: string;
  path: string;
  reason: string;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO app.audit_log (entity_type, entity_id, action, payload, performed_by)
       VALUES ('blocked_write', $1, 'blocked', $2::jsonb, $3)`,
      [
        crypto.randomUUID(),
        JSON.stringify({
          household_id: params.household_id,
          user_id: params.user_id,
          request_id: params.request_id,
          path: params.path,
          reason: params.reason,
        }),
        params.user_id,
      ]
    );
  } catch (err) {
    console.error("[logBlockedLedgerWrite]", err);
  } finally {
    client.release();
  }
}
