import { useCallback } from 'react';
import type { Transaction } from '@/types/finance';

export function useExport() {
  const exportToCSV = useCallback((transactions: Transaction[], filename: string = 'finanzas') => {
    const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto', 'Usuario'];
    
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString('es-MX'),
      t.type,
      t.description,
      t.category,
      t.amount.toString(),
      t.userId,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, []);

  const exportToJSON = useCallback((data: any, filename: string = 'finanzas_backup') => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }, []);

  return { exportToCSV, exportToJSON };
}
