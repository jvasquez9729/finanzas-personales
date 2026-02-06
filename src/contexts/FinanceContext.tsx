import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useFirestoreTransactions } from '@/hooks/useFirestoreTransactions';
import type { 
  ContextType, 
  ContextData, 
  Transaction,
  FinancialStats,
  SavingsGoal,
  Investment 
} from '@/types/finance';
import type { Budget, BudgetSummary, BudgetAlert, BudgetComparison } from '@/types/budget';

// Simulamos los datos de ahorros e inversiones (pueden migrarse a Firestore después)
const mockSavingsGoals: SavingsGoal[] = [
  {
    id: '1',
    name: 'Fondo de Emergencia',
    targetAmount: 150000,
    currentAmount: 85000,
    category: 'emergency',
    userId: 'user1',
    isShared: false,
    deadline: '2026-12-31',
  },
];

const mockInvestments: Investment[] = [
  {
    id: '1',
    name: 'CETES',
    type: 'cetes',
    initialAmount: 100000,
    currentValue: 102500,
    returns: 2.5,
    startDate: '2025-06-01',
    userId: 'user1',
    isShared: false,
  },
];

interface FinanceContextValue {
  // Usuario
  user: any;
  userProfile: any;
  logout: () => Promise<any>;
  
  // Contexto activo
  activeContext: ContextType;
  setActiveContext: (context: ContextType) => void;
  
  // Usuarios
  users: { userA: string; userB: string };
  
  // Datos
  financialData: ContextData;
  
  // Transacciones
  transactions: Transaction[];
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<any>;
  deleteTransaction: (id: string) => Promise<any>;
  getTransactionsByType: (type: Transaction['type']) => Transaction[];
  getTransactionsByUser: (userId: string) => Transaction[];
  
  // Loading states
  loading: boolean;
  
  // Estadísticas
  stats: FinancialStats;
  
  // Metas e inversiones
  savingsGoals: SavingsGoal[];
  investments: Investment[];
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile, logout } = useFirebaseAuth();
  const { 
    transactions, 
    loading: transactionsLoading, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    getTransactionsByType,
    stats 
  } = useFirestoreTransactions(user?.uid || null);
  
  const [activeContext, setActiveContext] = useState<ContextType>('family');
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(mockSavingsGoals);
  const [investments, setInvestments] = useState<Investment[]>(mockInvestments);

  // Usuarios (simplificado para demo)
  const users = useMemo(() => ({
    userA: userProfile?.name || 'Usuario 1',
    userB: 'Pareja',
  }), [userProfile]);

  // Datos financieros
  const financialData: ContextData = useMemo(() => {
    const expensesByCategory: { category: string; amount: number; percentage: number }[] = [];
    const categoryTotals: Record<string, number> = {};
    
    transactions
      .filter(t => t.type.includes('expense'))
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
      });
    
    const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    
    Object.entries(categoryTotals).forEach(([category, amount]) => {
      expensesByCategory.push({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      });
    });

    return {
      users,
      ...stats,
      expensesByCategory,
      incomeBySource: [],
      expenseTrend: [],
      incomeTrend: [],
      savingsGoals,
      investments,
      transactions,
    };
  }, [users, stats, savingsGoals, investments, transactions]);

  const value: FinanceContextValue = {
    user,
    userProfile,
    logout,
    activeContext,
    setActiveContext,
    users,
    financialData,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsByType,
    getTransactionsByUser: (userId: string) => transactions.filter(t => t.userId === userId),
    loading: transactionsLoading,
    stats,
    savingsGoals,
    investments,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance debe usarse dentro de FinanceProvider');
  }
  return context;
}
