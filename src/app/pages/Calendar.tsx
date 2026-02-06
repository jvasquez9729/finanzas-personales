import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PaymentReminder, PaymentStatus } from '@/types/calendar';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-zinc-500',
  paid: 'bg-emerald-500',
  overdue: 'bg-red-500',
  upcoming: 'bg-amber-500',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  overdue: 'Vencido',
  upcoming: 'Próximo',
};

export function Calendar() {
  const { activeContext, users, transactions } = useFinance();
  const { reminders, summary, addReminder, deleteReminder, markAsPaid } = usePaymentReminders([], transactions);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<PaymentReminder | null>(null);

  const currentUser = activeContext === 'userA' ? 'userA' : activeContext === 'userB' ? 'userB' : 'userA';

  // Calcular días del calendario
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: es });
    const endDate = endOfWeek(monthEnd, { locale: es });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayReminders = reminders.filter(r => {
        const rDate = new Date(r.dueDate);
        return isSameDay(rDate, day);
      });

      return {
        date: day.toISOString(),
        day: day.getDate(),
        isCurrentMonth: isSameMonth(day, currentDate),
        payments: dayReminders,
        hasOverdue: dayReminders.some(r => r.status === 'overdue'),
        hasUpcoming: dayReminders.some(r => r.status === 'upcoming'),
      };
    });
  }, [currentDate, reminders]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleAddReminder = (data: any) => {
    addReminder({
      ...data,
      dueDate: new Date(data.dueDate).toISOString(),
      userId: currentUser,
      status: 'pending',
    });
    setIsFormOpen(false);
  };

  const openAddForm = (date?: Date) => {
    setEditingReminder(null);
    setSelectedDate(date || null);
    setIsFormOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100">Calendario de Pagos</h1>
          <p className="text-zinc-400 mt-1">Gestiona tus pagos programados y recordatorios</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToday} className="border-zinc-700">
            Hoy
          </Button>
          <Button onClick={() => openAddForm()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Recordatorio
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Vencidos</p>
                <p className="text-2xl font-bold text-red-500">${summary.totalOverdue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Próximos</p>
                <p className="text-2xl font-bold text-amber-500">${summary.totalUpcoming.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-full">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Pendientes</p>
                <p className="text-2xl font-bold text-zinc-100">${summary.totalPending.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-zinc-800 rounded-full">
                <CalendarIcon className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Recordatorios</p>
                <p className="text-2xl font-bold text-zinc-100">{reminders.length}</p>
              </div>
              <div className="p-3 bg-zinc-800 rounded-full">
                <CheckCircle className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario */}
        <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-zinc-100">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-zinc-500 py-2">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => day.isCurrentMonth && openAddForm(new Date(day.date))}
                  className={`
                    aspect-square p-2 rounded-lg text-sm relative
                    ${day.isCurrentMonth ? 'hover:bg-zinc-800' : 'opacity-30'}
                    ${day.hasOverdue ? 'bg-red-950/30 border border-red-800' : ''}
                    ${day.hasUpcoming && !day.hasOverdue ? 'bg-amber-950/30 border border-amber-800' : ''}
                  `}
                >
                  <span className="text-zinc-100">{day.day}</span>
                  {day.payments.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {day.payments.slice(0, 3).map((p, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[p.status]}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lista de pagos próximos y vencidos */}
        <div className="space-y-4">
          {/* Vencidos */}
          {summary.overduePayments.length > 0 && (
            <Card className="bg-zinc-900 border-red-800">
              <CardHeader>
                <CardTitle className="text-lg text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Pagos Vencidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.overduePayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-zinc-100">{payment.title}</p>
                      <p className="text-sm text-zinc-400">Venció: {format(new Date(payment.dueDate), 'dd MMM', { locale: es })}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-400">${payment.amount.toLocaleString()}</p>
                      <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-400 mt-1" onClick={() => markAsPaid(payment.id)}>
                        Pagar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Próximos */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Próximos Pagos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.upcomingPayments.slice(0, 5).map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div>
                    <p className="font-medium text-zinc-100">{payment.title}</p>
                    <p className="text-sm text-zinc-400">
                      {format(new Date(payment.dueDate), 'dd MMM', { locale: es })}
                    </p>
                  </div>
                  <p className="font-bold text-amber-400">${payment.amount.toLocaleString()}</p>
                </div>
              ))}
              {summary.upcomingPayments.length === 0 && (
                <p className="text-zinc-500 text-center py-4">No hay pagos próximos</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Formulario simplificado */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Nuevo Recordatorio de Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddReminder({
              title: formData.get('title') as string,
              amount: parseFloat(formData.get('amount') as string),
              dueDate: formData.get('dueDate') as string,
              category: formData.get('category') as string,
              frequency: formData.get('frequency') as any,
              notifyDaysBefore: parseInt(formData.get('notifyDaysBefore') as string),
              autoPay: false,
              isShared: false,
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input name="title" placeholder="Ej: Renta, Luz, Internet..." required className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input name="amount" type="number" step="0.01" required className="bg-zinc-800 border-zinc-700" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Input 
                  name="dueDate" 
                  type="date" 
                  required 
                  defaultValue={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  className="bg-zinc-800 border-zinc-700" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select name="frequency" defaultValue="monthly">
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="once" className="text-zinc-100">Una vez</SelectItem>
                  <SelectItem value="weekly" className="text-zinc-100">Semanal</SelectItem>
                  <SelectItem value="monthly" className="text-zinc-100">Mensual</SelectItem>
                  <SelectItem value="yearly" className="text-zinc-100">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notificar días antes</Label>
              <Select name="notifyDaysBefore" defaultValue="3">
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="1" className="text-zinc-100">1 día antes</SelectItem>
                  <SelectItem value="3" className="text-zinc-100">3 días antes</SelectItem>
                  <SelectItem value="7" className="text-zinc-100">1 semana antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-zinc-700">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Crear Recordatorio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
