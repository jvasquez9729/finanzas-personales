import { useState, useMemo, useCallback } from 'react';
import type { Transaction } from '@/types/finance';

export interface SearchFilters {
  query: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  categories: string[];
  types: string[];
  users: string[];
}

export function useSearch(transactions: Transaction[]) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    categories: [],
    types: [],
    users: [],
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Búsqueda por texto
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matches = 
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Filtro de fecha
      if (filters.startDate && new Date(t.date) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(t.date) > new Date(filters.endDate)) return false;

      // Filtro de monto
      const absAmount = Math.abs(t.amount);
      if (filters.minAmount && absAmount < filters.minAmount) return false;
      if (filters.maxAmount && absAmount > filters.maxAmount) return false;

      // Filtro de categoría
      if (filters.categories.length > 0 && !filters.categories.includes(t.category)) return false;

      // Filtro de tipo
      if (filters.types.length > 0 && !filters.types.includes(t.type)) return false;

      // Filtro de usuario
      if (filters.users.length > 0 && !filters.users.includes(t.userId)) return false;

      return true;
    });
  }, [transactions, filters]);

  const updateFilter = useCallback(<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      categories: [],
      types: [],
      users: [],
    });
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.startDate || filters.endDate) count++;
    if (filters.minAmount || filters.maxAmount) count++;
    if (filters.categories.length > 0) count++;
    if (filters.types.length > 0) count++;
    if (filters.users.length > 0) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredTransactions,
    updateFilter,
    resetFilters,
    activeFiltersCount,
  };
}
