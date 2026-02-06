import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Transaction, FinancialStats } from '@/types/finance';

// Categorías predefinidas
export const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Vivienda', icon: '🏠' },
  { value: 'food', label: 'Alimentación', icon: '🍽️' },
  { value: 'transport', label: 'Transporte', icon: '🚗' },
  { value: 'health', label: 'Salud', icon: '⚕️' },
  { value: 'entertainment', label: 'Entretenimiento', icon: '🎬' },
  { value: 'education', label: 'Educación', icon: '📚' },
  { value: 'utilities', label: 'Servicios', icon: '💡' },
  { value: 'shopping', label: 'Compras', icon: '🛍️' },
  { value: 'insurance', label: 'Seguros', icon: '🛡️' },
  { value: 'debt', label: 'Deudas', icon: '💳' },
  { value: 'other', label: 'Otros', icon: '📦' },
];

export const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salario', icon: '💵' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'investments', label: 'Inversiones', icon: '📈' },
  { value: 'rental', label: 'Alquileres', icon: '🏢' },
  { value: 'bonus', label: 'Bonos', icon: '🎁' },
  { value: 'other', label: 'Otros', icon: '💰' },
];

export const SAVINGS_CATEGORIES = [
  { value: 'emergency', label: 'Fondo Emergencia', icon: '🚨' },
  { value: 'vacation', label: 'Vacaciones', icon: '✈️' },
  { value: 'education', label: 'Educación', icon: '🎓' },
  { value: 'retirement', label: 'Jubilación', icon: '👴' },
  { value: 'home', label: 'Casa', icon: '🏡' },
  { value: 'car', label: 'Auto', icon: '🚙' },
  { value: 'goals', label: 'Metas', icon: '🎯' },
];

export const INVESTMENT_CATEGORIES = [
  { value: 'cetes', label: 'CETES', icon: '🏛️' },
  { value: 'stocks', label: 'Acciones', icon: '📊' },
  { value: 'bonds', label: 'Bonos', icon: '📋' },
  { value: 'crypto', label: 'Criptomonedas', icon: '₿' },
  { value: 'realestate', label: 'Bienes Raíces', icon: '🏘️' },
  { value: 'funds', label: 'Fondos', icon: '💹' },
  { value: 'forex', label: 'Forex', icon: '💱' },
];

// Generar ID único
const generateId = () => Math.random().toString(36).substr(2, 9);

export function useTransactions(initialTransactions: Transaction[] = []) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Intentar cargar de localStorage solo si no hay transacciones iniciales
    if (initialTransactions.length > 0) {
      return initialTransactions;
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finance-transactions');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Guardar en localStorage cuando cambien las transacciones
  useEffect(() => {
    localStorage.setItem('finance-transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Agregar nueva transacción
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  }, []);

  // Actualizar transacción existente
  const updateTransaction = useCallback((id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    setTransactions(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  // Eliminar transacción
  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // Obtener transacciones por tipo
  const getTransactionsByType = useCallback((type: Transaction['type']) => {
    return transactions.filter(t => t.type === type);
  }, [transactions]);

  // Obtener transacciones por usuario
  const getTransactionsByUser = useCallback((userId: string) => {
    return transactions.filter(t => t.userId === userId || t.isShared);
  }, [transactions]);

  // Calcular estadísticas
  const stats: FinancialStats = useMemo(() => {
    const fixedExpenses = transactions
      .filter(t => t.type === 'fixed_expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const variableExpenses = transactions
      .filter(t => t.type === 'variable_expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const fixedIncome = transactions
      .filter(t => t.type === 'fixed_income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const variableIncome = transactions
      .filter(t => t.type === 'variable_income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const savings = transactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const investments = transactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = fixedIncome + variableIncome;
    const totalExpenses = fixedExpenses + variableExpenses;

    return {
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      fixedExpenses,
      variableExpenses,
      fixedIncome,
      variableIncome,
      savings,
      investments,
      balance: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    };
  }, [transactions]);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsByType,
    getTransactionsByUser,
    stats,
  };
}
