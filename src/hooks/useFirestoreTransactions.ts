import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction } from '@/types/finance';

// Convertir Firestore timestamp a string ISO
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  if (data.createdAt instanceof Timestamp) {
    converted.createdAt = data.createdAt.toDate().toISOString();
  }
  if (data.updatedAt instanceof Timestamp) {
    converted.updatedAt = data.updatedAt.toDate().toISOString();
  }
  if (data.date && typeof data.date === 'object' && 'toDate' in data.date) {
    converted.date = data.date.toDate().toISOString();
  }
  return converted;
};

export function useFirestoreTransactions(userId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar transacciones en tiempo real
  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Query: transacciones del usuario + compartidas
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...convertTimestamps(doc.data()),
        })) as Transaction[];
        
        setTransactions(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to transactions:', err);
        setError('Error al cargar transacciones');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Agregar transacción
  const addTransaction = useCallback(async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!userId) return { error: 'No hay usuario autenticado' };

    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...data,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: docRef.id, error: null };
    } catch (err) {
      console.error('Error adding transaction:', err);
      return { error: 'Error al guardar la transacción' };
    }
  }, [userId]);

  // Actualizar transacción
  const updateTransaction = useCallback(async (
    id: string,
    updates: Partial<Transaction>
  ) => {
    if (!userId) return { error: 'No hay usuario autenticado' };

    try {
      const docRef = doc(db, 'transactions', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return { error: null };
    } catch (err) {
      console.error('Error updating transaction:', err);
      return { error: 'Error al actualizar la transacción' };
    }
  }, [userId]);

  // Eliminar transacción
  const deleteTransaction = useCallback(async (id: string) => {
    if (!userId) return { error: 'No hay usuario autenticado' };

    try {
      await deleteDoc(doc(db, 'transactions', id));
      return { error: null };
    } catch (err) {
      console.error('Error deleting transaction:', err);
      return { error: 'Error al eliminar la transacción' };
    }
  }, [userId]);

  // Obtener transacciones por tipo
  const getTransactionsByType = useCallback((type: Transaction['type']) => {
    return transactions.filter(t => t.type === type);
  }, [transactions]);

  // Calcular estadísticas
  const stats = (() => {
    // Calcular ingresos
    const allIncome = transactions
      .filter(t => t.type.includes('income'))
      .reduce((sum, t) => sum + t.amount, 0);

    const fixedIncome = transactions
      .filter(t => t.type === 'fixed-income')
      .reduce((sum, t) => sum + t.amount, 0);

    const variableIncome = transactions
      .filter(t => t.type === 'variable-income')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calcular gastos
    const allExpenses = transactions
      .filter(t => t.type.includes('expense'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const fixedExpenses = transactions
      .filter(t => t.type === 'fixed-expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const variableExpenses = transactions
      .filter(t => t.type === 'variable-expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calcular ahorros e inversiones (por ahora 0, se pueden agregar después)
    const savings = 0;
    const investments = 0;

    const balance = allIncome - allExpenses;

    return {
      monthlyIncome: allIncome,
      monthlyExpenses: allExpenses,
      fixedExpenses,
      variableExpenses,
      fixedIncome,
      variableIncome,
      savings,
      investments,
      balance,
      savingsRate: allIncome > 0 ? ((balance) / allIncome) * 100 : 0,
    };
  })();

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsByType,
    stats,
  };
}
