export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';
export type BudgetAlertLevel = 'ok' | 'warning' | 'danger' | 'exceeded';

export interface Budget {
  id: string;
  name: string;
  category: string;
  limit: number;
  spent: number;
  period: BudgetPeriod;
  alertThreshold: number; // Porcentaje (ej: 80 para alertar al 80%)
  rollover: boolean; // Si el sobrante pasa al siguiente período
  rolloverAmount: number; // Monto acumulado de períodos anteriores
  userId: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  category: string;
  percentage: number;
  level: BudgetAlertLevel;
  message: string;
  remaining: number;
}

export interface BudgetComparison {
  category: string;
  budgeted: number;
  actual: number;
  difference: number;
  percentageUsed: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  alerts: BudgetAlert[];
  categoriesOverBudget: number;
  categoriesAtRisk: number;
}
