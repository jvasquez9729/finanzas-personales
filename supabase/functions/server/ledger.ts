import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function ledgerClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "app" },
  });
}

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
  householdId: string,
  ownerUserId?: string
): Promise<AccountRow[]> {
  const q = ledgerClient()
    .from("accounts")
    .select("id, household_id, name, type, currency, is_personal, owner_user_id")
    .eq("household_id", householdId)
    .order("name");
  if (ownerUserId !== undefined) {
    q.eq("owner_user_id", ownerUserId);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as AccountRow[];
}

export async function getBalances(householdId: string): Promise<BalanceRow[]> {
  const { data, error } = await ledgerClient().rpc("get_balances", {
    p_household_id: householdId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as BalanceRow[];
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
  if (sum !== 0) throw new Error("Transaction entries must balance (debits = credits)");
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<{ id: string }> {
  assertBalance(input.entries);
  const client = ledgerClient();
  const { data: txn, error: txnError } = await client
    .from("transactions")
    .insert({
      household_id: input.household_id,
      occurred_at: input.occurred_at,
      description: input.description,
      external_ref: input.external_ref ?? null,
      created_by: input.created_by,
      status: "posted",
    })
    .select("id")
    .single();
  if (txnError || !txn) throw new Error(txnError?.message ?? "Failed to create transaction");
  const entries = input.entries.map((e) => ({
    transaction_id: txn.id,
    account_id: e.account_id,
    user_id: e.user_id ?? null,
    category: e.category ?? null,
    direction: e.direction,
    amount_minor: e.amount_minor,
    currency: e.currency,
  }));
  const { error: entriesError } = await client.from("ledger_entries").insert(entries);
  if (entriesError) throw new Error(entriesError.message);
  return { id: txn.id };
}

export async function isMember(
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await ledgerClient()
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data != null;
}

/** PASO 2: registra en audit_log un intento de escritura bloqueado por feature flag. */
export async function logBlockedLedgerWrite(params: {
  household_id: string;
  user_id: string;
  request_id: string;
  path: string;
  reason: string;
}): Promise<void> {
  const { error } = await ledgerClient()
    .from("audit_log")
    .insert({
      entity_type: "blocked_write",
      entity_id: crypto.randomUUID(),
      action: "blocked",
      payload: {
        household_id: params.household_id,
        user_id: params.user_id,
        request_id: params.request_id,
        path: params.path,
        reason: params.reason,
      },
      performed_by: params.user_id,
    });
  if (error) {
    console.error("[logBlockedLedgerWrite]", error.message);
  }
}
