export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Transaction {
  id: string;
  type: 'fixed_expense' | 'variable_expense' | 'fixed_income' | 'variable_income' | 'savings' | 'investment';
  description: string;
  amount: number;
  category: string;
  date: string;
  userId: string;
  isShared: boolean;
  isRecurring?: boolean;
  frequency?: 'weekly' | 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  userId: string;
  isShared: boolean;
}

export interface Investment {
  id: string;
  name: string;
  type: string;
  initialAmount: number;
  currentValue: number;
  returns: number;
  startDate: string;
  userId: string;
  isShared: boolean;
}

export interface FinancialStats {
  monthlyIncome: number;
  monthlyExpenses: number;
  fixedExpenses: number;
  variableExpenses: number;
  fixedIncome: number;
  variableIncome: number;
  savings: number;
  investments: number;
  balance: number;
  savingsRate: number;
}

export interface ContextData {
  users: { userA: string; userB: string };
  monthlyIncome: number;
  monthlyExpenses: number;
  fixedExpenses: number;
  variableExpenses: number;
  fixedIncome: number;
  variableIncome: number;
  savings: number;
  investments: number;
  balance: number;
  savingsRate: number;
  expensesByCategory: { category: string; amount: number; percentage: number }[];
  incomeBySource: { source: string; amount: number; percentage: number }[];
  expenseTrend: { month: string; fixed: number; variable: number }[];
  incomeTrend: { month: string; fixed: number; variable: number }[];
  savingsGoals: SavingsGoal[];
  investments: Investment[];
  transactions: Transaction[];
}

export type ContextType = 'userA' | 'userB' | 'family';

export interface FinancialData {
  userA: ContextData;
  userB: ContextData;
  family: ContextData;
}
