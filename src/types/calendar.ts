export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'upcoming';
export type PaymentFrequency = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface PaymentReminder {
  id: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: string;
  category: string;
  frequency: PaymentFrequency;
  status: PaymentStatus;
  userId: string;
  isShared: boolean;
  autoPay: boolean;
  notifyDaysBefore: number; // Días antes para notificar
  lastPaid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  payments: PaymentReminder[];
  hasOverdue: boolean;
  hasUpcoming: boolean;
}

export interface PaymentSummary {
  totalPending: number;
  totalOverdue: number;
  totalUpcoming: number;
  upcomingPayments: PaymentReminder[];
  overduePayments: PaymentReminder[];
}
