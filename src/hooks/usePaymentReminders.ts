import { useState, useMemo, useCallback, useEffect } from 'react';
import type { PaymentReminder, PaymentStatus, PaymentSummary } from '@/types/calendar';
import type { Transaction } from '@/types/finance';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function usePaymentReminders(
  initialReminders: PaymentReminder[] = [],
  transactions: Transaction[] = []
) {
  const [reminders, setReminders] = useState<PaymentReminder[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finance-reminders');
      if (saved) return JSON.parse(saved);
    }
    return initialReminders;
  });

  useEffect(() => {
    localStorage.setItem('finance-reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Actualizar estados basados en fechas
  const processedReminders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return reminders.map(r => {
      const dueDate = new Date(r.dueDate);
      let status: PaymentStatus = r.status;

      if (r.status !== 'paid') {
        if (dueDate < today) {
          status = 'overdue';
        } else {
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= r.notifyDaysBefore) {
            status = 'upcoming';
          } else {
            status = 'pending';
          }
        }
      }

      return { ...r, status };
    });
  }, [reminders]);

  // Resumen de pagos
  const summary = useMemo((): PaymentSummary => {
    const pending = processedReminders.filter(r => r.status === 'pending');
    const overdue = processedReminders.filter(r => r.status === 'overdue');
    const upcoming = processedReminders.filter(r => r.status === 'upcoming');

    return {
      totalPending: pending.reduce((sum, r) => sum + r.amount, 0),
      totalOverdue: overdue.reduce((sum, r) => sum + r.amount, 0),
      totalUpcoming: upcoming.reduce((sum, r) => sum + r.amount, 0),
      upcomingPayments: upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
      overduePayments: overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    };
  }, [processedReminders]);

  // CRUD
  const addReminder = useCallback((reminder: Omit<PaymentReminder, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const newReminder: PaymentReminder = {
      ...reminder,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setReminders(prev => [...prev, newReminder]);
    return newReminder;
  }, []);

  const updateReminder = useCallback((id: string, updates: Partial<PaymentReminder>) => {
    setReminders(prev =>
      prev.map(r =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      )
    );
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  // Marcar como pagado
  const markAsPaid = useCallback((id: string) => {
    const reminder = processedReminders.find(r => r.id === id);
    if (!reminder) return;

    const now = new Date().toISOString();
    
    // Calcular próxima fecha si es recurrente
    let nextDueDate = reminder.dueDate;
    if (reminder.frequency !== 'once') {
      const current = new Date(reminder.dueDate);
      switch (reminder.frequency) {
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarterly':
          current.setMonth(current.getMonth() + 3);
          break;
        case 'yearly':
          current.setFullYear(current.getFullYear() + 1);
          break;
      }
      nextDueDate = current.toISOString();
    }

    setReminders(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: 'pending',
              dueDate: nextDueDate,
              lastPaid: now,
              updatedAt: now,
            }
          : r
      )
    );
  }, [processedReminders]);

  // Obtener recordatorios por mes
  const getRemindersByMonth = useCallback((year: number, month: number) => {
    return processedReminders.filter(r => {
      const date = new Date(r.dueDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }, [processedReminders]);

  return {
    reminders: processedReminders,
    summary,
    addReminder,
    updateReminder,
    deleteReminder,
    markAsPaid,
    getRemindersByMonth,
  };
}
