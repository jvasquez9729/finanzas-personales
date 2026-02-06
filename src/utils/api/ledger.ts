const env = import.meta.env as ImportMetaEnv & {
  VITE_LEDGER_API_URL?: string;
};

export interface BalanceRow {
  account_id: string;
  balance_minor: number;
  currency?: string;
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

function getBaseUrl(): string | undefined {
  return env.VITE_LEDGER_API_URL;
}

function headers(accessToken?: string, householdId?: string): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
  if (householdId) h["x-household-id"] = householdId;
  return h;
}

export async function fetchBalances(
  householdId: string,
  accessToken?: string
): Promise<{ data: BalanceRow[] } | null> {
  const base = getBaseUrl();
  if (!base) return null;
  const url = `${base}/ledger/balances?household_id=${encodeURIComponent(householdId)}`;
  const res = await fetch(url, { headers: headers(accessToken, householdId) });
  if (!res.ok) return null;
  return res.json() as Promise<{ data: BalanceRow[] }>;
}

export async function fetchAccounts(
  householdId: string,
  accessToken?: string,
  ownerId?: string
): Promise<{ data: AccountRow[] } | null> {
  const base = getBaseUrl();
  if (!base) return null;
  const params = new URLSearchParams({ household_id: householdId });
  if (ownerId) params.set("owner_id", ownerId);
  const url = `${base}/ledger/accounts?${params.toString()}`;
  const res = await fetch(url, { headers: headers(accessToken, householdId) });
  if (!res.ok) return null;
  return res.json() as Promise<{ data: AccountRow[] }>;
}

export { netWorthFromBalances } from "@/lib/finance";
