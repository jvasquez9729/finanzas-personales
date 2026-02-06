import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Budget, BudgetAlert, BudgetAlertLevel, BudgetSummary, BudgetComparison } from '@/types/budget';
import type { Transaction } from '@/types/finance';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useBudgets(
  initialBudgets: Budget[] = [],
  transactions: Transaction[] = []
) {
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finance-budgets');
      if (saved) return JSON.parse(saved);
    }
    return initialBudgets;
  });

  // Persistir en localStorage
  useEffect(() => {
    localStorage.setItem('finance-budgets', JSON.stringify(budgets));
  }, [budgets]);

  // Calcular gasto actual por presupuesto basado en transacciones
  const budgetsWithSpent = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return budgets.map(budget => {
      // Filtrar transacciones del período actual
      const periodTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        const isExpense = t.type.includes('expense');
        const matchesCategory = t.category === budget.category || budget.category === 'all';
        
        if (!isExpense || !matchesCategory) return false;

        // Verificar si está en el período del presupuesto
        if (budget.period === 'monthly') {
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        } else if (budget.period === 'quarterly') {
          const quarter = Math.floor(currentMonth / 3);
          const tQuarter = Math.floor(tDate.getMonth() / 3);
          return tQuarter === quarter && tDate.getFullYear() === currentYear;
        } else {
          return tDate.getFullYear() === currentYear;
        }
      });

      const spent = periodTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalAvailable = budget.limit + budget.rolloverAmount;
      
      return {
        ...budget,
        spent,
        remaining: totalAvailable - spent,
        percentage: totalAvailable > 0 ? (spent / totalAvailable) * 100 : 0,
      };
    });
  }, [budgets, transactions]);

  // Generar alertas
  const alerts = useMemo((): BudgetAlert[] => {
    return budgetsWithSpent
      .filter(b => b.percentage >= b.alertThreshold)
      .map(b => {
        let level: BudgetAlertLevel;
        let message: string;

        if (b.percentage >= 100) {
          level = 'exceeded';
          message = `Has excedido el presupuesto de ${b.name} por $${Math.abs(b.remaining).toLocaleString()}`;
        } else if (b.percentage >= 90) {
          level = 'danger';
          message = `¡Cuidado! Has usado el ${b.percentage.toFixed(0)}% del presupuesto de ${b.name}`;
        } else if (b.percentage >= b.alertThreshold) {
          level = 'warning';
          message = `Has alcanzado el ${b.percentage.toFixed(0)}% del presupuesto de ${b.name}`;
        } else {
          level = 'ok';
          message = '';
        }

        return {
          budgetId: b.id,
          budgetName: b.name,
          category: b.category,
          percentage: b.percentage,
          level,
          message,
          remaining: b.remaining,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgetsWithSpent]);

  // Resumen general
  const summary = useMemo((): BudgetSummary => {
    const totalBudgeted = budgetsWithSpent.reduce((sum, b) => sum + b.limit + b.rolloverAmount, 0);
    const totalSpent = budgetsWithSpent.reduce((sum, b) => sum + b.spent, 0);
    const exceeded = alerts.filter(a => a.level === 'exceeded').length;
    const atRisk = alerts.filter(a => a.level === 'danger' || a.level === 'warning').length;

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      overallPercentage: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
      alerts,
      categoriesOverBudget: exceeded,
      categoriesAtRisk: atRisk,
    };
  }, [budgetsWithSpent, alerts]);

  // Comparativa Presupuesto vs Real
  const comparison = useMemo((): BudgetComparison[] => {
    return budgetsWithSpent.map(b => {
      const previousMonthSpent = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return t.type.includes('expense') && 
                 (t.category === b.category || budget.category === 'all') &&
                 tDate.getMonth() === lastMonth.getMonth() &&
                 tDate.getFullYear() === lastMonth.getFullYear();
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const trendPercentage = previousMonthSpent > 0 
        ? ((b.spent - previousMonthSpent) / previousMonthSpent) * 100 
        : 0;

      return {
        category: b.category,
        budgeted: b.limit + b.rolloverAmount,
        actual: b.spent,
        difference: (b.limit + b.rolloverAmount) - b.spent,
        percentageUsed: b.percentage,
        trend: trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable',
        trendPercentage: Math.abs(trendPercentage),
      };
    });
  }, [budgetsWithSpent, transactions]);

  // CRUD Operaciones
  const addBudget = useCallback((budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'spent' | 'rolloverAmount'>) => {
    const newBudget: Budget = {
      ...budget,
      id: generateId(),
      spent: 0,
      rolloverAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBudgets(prev => [...prev, newBudget]);
    return newBudget;
  }, []);

  const updateBudget = useCallback((id: string, updates: Partial<Budget>) => {
    setBudgets(prev =>
      prev.map(b =>
        b.id === id
          ? { ...b, ...updates, updatedAt: new Date().toISOString() }
          : b
      )
    );
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  }, []);

  // Aplicar rollover al nuevo período
  const applyRollover = useCallback(() => {
    setBudgets(prev =>
      prev.map(b => {
        if (b.rollover) {
          const remaining = b.limit + b.rolloverAmount - b.spent;
          return {
            ...b,
            rolloverAmount: remaining > 0 ? remaining : 0,
            updatedAt: new Date().toISOString(),
          };
        }
        return b;
      })
    );
  }, []);

  // Obtener presupuesto por categoría
  const getBudgetByCategory = useCallback((category: string) => {
    return budgetsWithSpent.find(b => b.category === category);
  }, [budgetsWithSpent]);

  return {
    budgets: budgetsWithSpent,
    alerts,
    summary,
    comparison,
    addBudget,
    updateBudget,
    deleteBudget,
    applyRollover,
    getBudgetByCategory,
  };
}
