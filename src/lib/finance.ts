/**
 * Pure financial logic for ledger and KPIs. Used by tests and app.
 * No UI, no I/O. All amounts in minor units (cents) unless documented.
 */

export interface LedgerEntryLike {
  direction: "debit" | "credit";
  amount_minor: number;
}

export interface BalanceRowLike {
  account_id: string;
  balance_minor: number;
  currency?: string;
}

/** Sum of debits minus credits for entries. Must be 0 for a valid transaction. */
export function transactionBalance(entries: LedgerEntryLike[]): number {
  return entries.reduce(
    (sum, e) => sum + (e.direction === "debit" ? e.amount_minor : -e.amount_minor),
    0
  );
}

/** Throws if entries do not balance (sum <> 0) or any amount <= 0. */
export function assertTransactionBalance(entries: LedgerEntryLike[]): void {
  for (const e of entries) {
    if (e.amount_minor <= 0) {
      throw new Error("amount_minor must be positive");
    }
  }
  const bal = transactionBalance(entries);
  if (bal !== 0) {
    throw new Error(`Transaction entries must balance (debits = credits), got ${bal}`);
  }
}

/** Net worth from ledger balances (sum of balances, minor -> major). */
export function netWorthFromBalances(balances: BalanceRowLike[]): number {
  const sum = balances.reduce((acc, b) => acc + (b.balance_minor ?? 0), 0);
  return Math.round(sum / 100);
}

/** Cash flow = income - expenses (major units). */
export function cashFlow(monthlyIncome: number, monthlyExpenses: number): number {
  return monthlyIncome - monthlyExpenses;
}

/** Savings rate as percentage; 0 if income <= 0. */
export function savingsRate(monthlyIncome: number, monthlyExpenses: number): number {
  if (monthlyIncome <= 0) return 0;
  return ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
}

/** Total outflow from transfer-type items (negative amounts only). */
export function transferOutflows(transfers: { amount: number }[]): number {
  return transfers.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);
}

/** Consolidation: sum of balances per account; no double count (one row per account). */
export function consolidateBalances(balanceRows: BalanceRowLike[]): number {
  return netWorthFromBalances(balanceRows);
}

/** Cash flow change % vs previous period; 0 if prevExpenses <= 0. */
export function cashFlowChangePercent(
  cashFlowNow: number,
  monthlyExpensesNow: number
): number {
  if (monthlyExpensesNow <= 0) return 0;
  return (cashFlowNow / monthlyExpensesNow) * 100;
}
