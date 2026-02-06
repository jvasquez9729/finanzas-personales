import { useState, useMemo, useCallback, useEffect } from 'react';

export interface SplitExpense {
  id: string;
  description: string;
  totalAmount: number;
  date: string;
  category: string;
  splits: {
    userId: string;
    amount: number;
    paid: boolean;
    paidAt?: string;
  }[];
  createdBy: string;
  createdAt: string;
}

export function useSplitExpenses(initialSplits: SplitExpense[] = []) {
  const [splits, setSplits] = useState<SplitExpense[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finance-splits');
      if (saved) return JSON.parse(saved);
    }
    return initialSplits;
  });

  useEffect(() => {
    localStorage.setItem('finance-splits', JSON.stringify(splits));
  }, [splits]);

  const addSplit = useCallback((split: Omit<SplitExpense, 'id' | 'createdAt'>) => {
    const newSplit: SplitExpense = {
      ...split,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    setSplits(prev => [newSplit, ...prev]);
    return newSplit;
  }, []);

  const markAsPaid = useCallback((splitId: string, userId: string) => {
    setSplits(prev =>
      prev.map(s =>
        s.id === splitId
          ? {
              ...s,
              splits: s.splits.map(sp =>
                sp.userId === userId
                  ? { ...sp, paid: true, paidAt: new Date().toISOString() }
                  : sp
              ),
            }
          : s
      )
    );
  }, []);

  const balances = useMemo(() => {
    const userBalances: Record<string, number> = {};
    
    splits.forEach(split => {
      split.splits.forEach(s => {
        if (!userBalances[s.userId]) userBalances[s.userId] = 0;
        if (!s.paid) {
          userBalances[s.userId] += s.amount;
        }
      });
    });

    return userBalances;
  }, [splits]);

  return { splits, addSplit, markAsPaid, balances };
}
