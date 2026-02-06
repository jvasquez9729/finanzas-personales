/**
 * Financial logic tests: balance, transfers, consolidation, KPIs, edge cases.
 * No UI, no API calls. Validates ledger rules and derived metrics.
 */
import { describe, it, expect } from "vitest";
import {
  transactionBalance,
  assertTransactionBalance,
  netWorthFromBalances,
  cashFlow,
  savingsRate,
  transferOutflows,
  consolidateBalances,
  cashFlowChangePercent,
} from "./finance";

describe("1) Balance contable (suma ledger_entries = 0 por transacción)", () => {
  it("suma débitos - créditos = 0 para transacción válida", () => {
    const entries = [
      { direction: "debit" as const, amount_minor: 10000 },
      { direction: "credit" as const, amount_minor: 10000 },
    ];
    expect(transactionBalance(entries)).toBe(0);
  });

  it("desequilibrio distinto de cero detectado", () => {
    const entries = [
      { direction: "debit" as const, amount_minor: 10000 },
      { direction: "credit" as const, amount_minor: 5000 },
    ];
    expect(transactionBalance(entries)).toBe(5000);
  });

  it("assertTransactionBalance lanza si no cuadra", () => {
    expect(() =>
      assertTransactionBalance([
        { direction: "debit", amount_minor: 1000 },
        { direction: "credit", amount_minor: 500 },
      ])
    ).toThrow("must balance");
  });

  it("assertTransactionBalance lanza si amount_minor <= 0", () => {
    expect(() =>
      assertTransactionBalance([
        { direction: "debit", amount_minor: 0 },
        { direction: "credit", amount_minor: 0 },
      ])
    ).toThrow("positive");
  });

  it("assertTransactionBalance no lanza para transacción balanceada", () => {
    expect(() =>
      assertTransactionBalance([
        { direction: "debit", amount_minor: 800000 },
        { direction: "credit", amount_minor: 800000 },
      ])
    ).not.toThrow();
  });
});

describe("2) Transferencias internas (personal ↔ familiar)", () => {
  it("solo montos negativos cuentan como salida (outflow)", () => {
    const transfers = [
      { amount: -800000 },
      { amount: -700000 },
      { amount: 50000 },
    ];
    expect(transferOutflows(transfers)).toBe(1500000);
  });

  it("evita doble conteo: positivos no suman a aporte", () => {
    const transfers = [{ amount: 1000 }, { amount: -1000 }];
    expect(transferOutflows(transfers)).toBe(1000);
  });

  it("lista vacía = 0", () => {
    expect(transferOutflows([])).toBe(0);
  });
});

describe("3) Consolidación familiar", () => {
  it("netWorthFromBalances suma balances y convierte a mayor", () => {
    const balances = [
      { account_id: "a1", balance_minor: 100000 },
      { account_id: "a2", balance_minor: 80000 },
    ];
    expect(netWorthFromBalances(balances)).toBe(1800);
  });

  it("consolidateBalances = netWorthFromBalances (una fila por cuenta)", () => {
    const balances = [
      { account_id: "a1", balance_minor: 500000 },
      { account_id: "a2", balance_minor: 300000 },
    ];
    expect(consolidateBalances(balances)).toBe(8000);
  });

  it("balances vacíos = 0", () => {
    expect(netWorthFromBalances([])).toBe(0);
  });
});

describe("4) Edge cases", () => {
  it("montos negativos en entries: assertTransactionBalance rechaza amount <= 0", () => {
    expect(() =>
      assertTransactionBalance([
        { direction: "debit", amount_minor: -100 },
        { direction: "credit", amount_minor: -100 },
      ])
    ).toThrow("positive");
  });

  it("doble conteo: transferOutflows solo suma salidas", () => {
    const onlyInflows = [{ amount: 1000 }, { amount: 2000 }];
    expect(transferOutflows(onlyInflows)).toBe(0);
  });

  it("contextos cruzados: consolidation usa solo filas dadas (no mezcla household en esta capa)", () => {
    const householdA = [{ account_id: "a1", balance_minor: 100000 }];
    const householdB = [{ account_id: "b1", balance_minor: 200000 }];
    expect(consolidateBalances(householdA)).toBe(1000);
    expect(consolidateBalances(householdB)).toBe(2000);
  });
});

describe("5) Regresión KPIs", () => {
  it("patrimonio: netWorthFromBalances redondea a entero", () => {
    expect(netWorthFromBalances([{ account_id: "x", balance_minor: 12345 }])).toBe(123);
  });

  it("cashflow = ingresos - gastos", () => {
    expect(cashFlow(45000, 28500)).toBe(16500);
  });

  it("tasa de ahorro = (ingresos - gastos) / ingresos * 100", () => {
    expect(savingsRate(45000, 28500)).toBeCloseTo(36.666, 1);
  });

  it("tasa de ahorro 0 si ingresos = 0", () => {
    expect(savingsRate(0, 1000)).toBe(0);
  });

  it("cashFlowChangePercent 0 si gastos = 0", () => {
    expect(cashFlowChangePercent(1000, 0)).toBe(0);
  });

  it("cashFlowChangePercent calcula % vs gastos", () => {
    expect(cashFlowChangePercent(16500, 28500)).toBeCloseTo(57.89, 1);
  });
});
