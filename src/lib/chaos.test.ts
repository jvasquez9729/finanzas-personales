/**
 * PASO 3 — Test de caos financiero.
 * Romper el sistema antes que los usuarios: alto volumen, transferencias cruzadas, fechas desordenadas.
 * Valida: balances siempre cuadran, no hay pérdida de precisión, no hay degradación crítica.
 */
import { describe, it, expect } from "vitest";
import {
  transactionBalance,
  assertTransactionBalance,
  netWorthFromBalances,
  transferOutflows,
  consolidateBalances,
  savingsRate,
  cashFlow,
} from "./finance";

const ENTRY = (d: "debit" | "credit", amount: number) => ({ direction: d, amount_minor: amount });
const BAL = (account_id: string, balance_minor: number) => ({ account_id, balance_minor });

describe("PASO 3 — Alto volumen de transacciones", () => {
  it("transacción con 2000 partidas balanceadas: suma = 0", () => {
    const entries = [];
    let debits = 0;
    let credits = 0;
    for (let i = 0; i < 1000; i++) {
      entries.push(ENTRY("debit", 100));
      entries.push(ENTRY("credit", 100));
      debits += 100;
      credits += 100;
    }
    expect(entries.length).toBe(2000);
    expect(transactionBalance(entries)).toBe(0);
    assertTransactionBalance(entries);
  });

  it("transacción con 10_000 partidas (mitad débito mitad crédito): no desbalance", () => {
    const amount = 1;
    const entries: { direction: "debit" | "credit"; amount_minor: number }[] = [];
    for (let i = 0; i < 5000; i++) {
      entries.push(ENTRY("debit", amount));
      entries.push(ENTRY("credit", amount));
    }
    expect(transactionBalance(entries)).toBe(0);
    assertTransactionBalance(entries);
  });
});

describe("PASO 3 — Transferencias cruzadas (personal ↔ familiar)", () => {
  it("muchas transferencias en ambos sentidos: solo salidas negativas suman", () => {
    const transfers: { amount: number }[] = [];
    for (let i = 0; i < 100; i++) {
      transfers.push({ amount: -50000 });
      transfers.push({ amount: 30000 });
    }
    const outflows = transferOutflows(transfers);
    expect(outflows).toBe(100 * 50000);
  });

  it("transferencias cruzadas A→B y B→A: aporte neto = suma de salidas", () => {
    const transfers = [
      { amount: -800000 },
      { amount: -700000 },
      { amount: 500000 },
      { amount: 200000 },
    ];
    expect(transferOutflows(transfers)).toBe(800000 + 700000);
  });

  it("consolidación con muchas cuentas: una fila por cuenta, sin doble conteo", () => {
    const balances = Array.from({ length: 500 }, (_, i) =>
      BAL(`account-${i}`, (i % 2 === 0 ? 1 : -1) * 100)
    );
    const total = consolidateBalances(balances);
    const expectedSum = balances.reduce((s, b) => s + b.balance_minor, 0);
    expect(netWorthFromBalances(balances)).toBe(Math.round(expectedSum / 100));
    expect(total).toBe(Math.round(expectedSum / 100));
  });
});

describe("PASO 3 — Orden / fechas desordenadas (agregación invariante al orden)", () => {
  it("múltiples transacciones balanceadas: orden de aplicación no cambia balance por cuenta (simulado)", () => {
    const tx1 = [ENTRY("debit", 1000), ENTRY("credit", 1000)];
    const tx2 = [ENTRY("debit", 2000), ENTRY("credit", 2000)];
    expect(transactionBalance(tx1)).toBe(0);
    expect(transactionBalance(tx2)).toBe(0);
    const balanceAfterTx1ThenTx2 = transactionBalance([...tx1, ...tx2]);
    const balanceAfterTx2ThenTx1 = transactionBalance([...tx2, ...tx1]);
    expect(balanceAfterTx1ThenTx2).toBe(0);
    expect(balanceAfterTx2ThenTx1).toBe(0);
  });

  it("consolidación: orden de filas no altera netWorth", () => {
    const balances = [BAL("a", 100000), BAL("b", 200000), BAL("c", -50000)];
    const rev = [...balances].reverse();
    expect(netWorthFromBalances(balances)).toBe(netWorthFromBalances(rev));
    expect(netWorthFromBalances(balances)).toBe(2500);
  });
});

describe("PASO 3 — Precisión (sin pérdida en sumas)", () => {
  it("montos grandes en minor units: suma exacta en balance", () => {
    const big = 10_000_000_000;
    const entries = [ENTRY("debit", big), ENTRY("credit", big)];
    expect(transactionBalance(entries)).toBe(0);
    assertTransactionBalance(entries);
  });

  it("netWorthFromBalances: muchos centavos redondean correctamente", () => {
    const balances = Array.from({ length: 100 }, (_, i) => BAL(`a${i}`, 33));
    const totalMinor = 100 * 33;
    expect(netWorthFromBalances(balances)).toBe(Math.round(totalMinor / 100));
  });

  it("savingsRate y cashFlow: números grandes no producen NaN", () => {
    const income = 1_000_000;
    const expenses = 400_000;
    expect(Number.isNaN(savingsRate(income, expenses))).toBe(false);
    expect(Number.isNaN(cashFlow(income, expenses))).toBe(false);
    expect(savingsRate(income, expenses)).toBe(60);
    expect(cashFlow(income, expenses)).toBe(600_000);
  });
});

describe("PASO 3 — Degradación crítica (límites razonables)", () => {
  it("assertTransactionBalance con 5000 partidas balanceadas: ejecuta en tiempo aceptable", () => {
    const entries: { direction: "debit" | "credit"; amount_minor: number }[] = [];
    for (let i = 0; i < 2500; i++) {
      entries.push(ENTRY("debit", 1));
      entries.push(ENTRY("credit", 1));
    }
    const start = performance.now();
    assertTransactionBalance(entries);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it("consolidación con 2000 cuentas: resultado correcto y tiempo acotado", () => {
    const balances = Array.from({ length: 2000 }, (_, i) => BAL(`acc-${i}`, 100));
    const start = performance.now();
    const total = consolidateBalances(balances);
    const elapsed = performance.now() - start;
    expect(total).toBe(2000 * 100 / 100);
    expect(elapsed).toBeLessThan(500);
  });
});
