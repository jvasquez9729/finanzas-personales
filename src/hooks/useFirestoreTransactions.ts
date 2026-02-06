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
    const income = transactions
      .filter(t => t.type.includes('income'))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type.includes('expense'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
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
