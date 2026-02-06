import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES, INVESTMENT_CATEGORIES } from '@/hooks/useTransactions';
import { Trash2 } from 'lucide-react';
import type { Transaction } from '@/types/finance';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: (id: string) => void;
  initialData?: Transaction;
  defaultType: Transaction['type'];
  users: { userA: string; userB: string };
  currentUser: string;
}

export function TransactionForm({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  defaultType,
  users,
  currentUser,
}: TransactionFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    userId: currentUser,
    isShared: false,
    isRecurring: false,
    frequency: 'monthly',
  });

  const [transactionType, setTransactionType] = useState<Transaction['type']>(defaultType);

  // Actualizar formulario cuando cambia initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description,
        amount: Math.abs(initialData.amount).toString(),
        category: initialData.category,
        date: initialData.date.split('T')[0],
        userId: initialData.userId || currentUser,
        isShared: initialData.isShared || false,
        isRecurring: initialData.isRecurring || false,
        frequency: initialData.frequency || 'monthly',
      });
      setTransactionType(initialData.type);
    } else {
      setFormData({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        userId: currentUser,
        isShared: false,
        isRecurring: false,
        frequency: 'monthly',
      });
      setTransactionType(defaultType);
    }
  }, [initialData, currentUser, defaultType, isOpen]);

  const getCategories = () => {
    switch (transactionType) {
      case 'fixed_expense':
      case 'variable_expense':
        return EXPENSE_CATEGORIES;
      case 'fixed_income':
      case 'variable_income':
        return INCOME_CATEGORIES;
      case 'savings':
        return SAVINGS_CATEGORIES;
      case 'investment':
        return INVESTMENT_CATEGORIES;
      default:
        return EXPENSE_CATEGORIES;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return;

    onSubmit({
      type: transactionType,
      description: formData.description,
      amount: transactionType.includes('expense') ? -amount : amount,
      category: formData.category,
      date: formData.date,
      userId: formData.userId,
      isShared: formData.isShared,
      isRecurring: formData.isRecurring,
      frequency: formData.isRecurring ? formData.frequency : undefined,
    });
    
    onClose();
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData.id);
      onClose();
    }
  };

  const isExpense = transactionType.includes('expense');
  const isIncome = transactionType.includes('income');
  const isSavings = transactionType === 'savings';
  const isInvestment = transactionType === 'investment';

  const getTitle = () => {
    if (initialData) return 'Editar Transacción';
    if (isExpense) return 'Nuevo Gasto';
    if (isIncome) return 'Nuevo Ingreso';
    if (isSavings) return 'Nuevo Ahorro';
    return 'Nueva Inversión';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de transacción */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select 
              value={transactionType} 
              onValueChange={(value) => setTransactionType(value as Transaction['type'])}
              disabled={!!initialData}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="fixed_expense" className="text-zinc-100">
                  💰 Gasto Fijo
                </SelectItem>
                <SelectItem value="variable_expense" className="text-zinc-100">
                  🛍️ Gasto Variable
                </SelectItem>
                <SelectItem value="fixed_income" className="text-zinc-100">
                  💵 Ingreso Fijo
                </SelectItem>
                <SelectItem value="variable_income" className="text-zinc-100">
                  💸 Ingreso Variable
                </SelectItem>
                <SelectItem value="savings" className="text-zinc-100">
                  🏦 Ahorro
                </SelectItem>
                <SelectItem value="investment" className="text-zinc-100">
                  📈 Inversión
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Renta, Supermercado..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              required
            />
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              required
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                {getCategories().map(cat => (
                  <SelectItem key={cat.value} value={cat.value} className="text-zinc-100">
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              required
            />
          </div>

          {/* Usuario */}
          <div className="space-y-2">
            <Label>Asignar a</Label>
            <Select 
              value={formData.userId} 
              onValueChange={(value) => setFormData({ ...formData, userId: value })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="userA" className="text-zinc-100">{users.userA}</SelectItem>
                <SelectItem value="userB" className="text-zinc-100">{users.userB}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gasto compartido */}
          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Compartido</span>
              <span className="text-xs text-zinc-400">Visible para ambos usuarios</span>
            </div>
            <Switch
              checked={formData.isShared}
              onCheckedChange={(checked) => setFormData({ ...formData, isShared: checked })}
            />
          </div>

          {/* Recurrente (solo para ingresos/gastos fijos) */}
          {(transactionType.includes('fixed') || isSavings) && (
            <div className="space-y-3 p-3 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Recurrente</span>
                  <span className="text-xs text-zinc-400">Se repite automáticamente</span>
                </div>
                <Switch
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
                />
              </div>
              
              {formData.isRecurring && (
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger className="bg-zinc-700 border-zinc-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-700 border-zinc-600">
                      <SelectItem value="weekly" className="text-zinc-100">Semanal</SelectItem>
                      <SelectItem value="monthly" className="text-zinc-100">Mensual</SelectItem>
                      <SelectItem value="yearly" className="text-zinc-100">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <DialogFooter className="gap-2">
            {initialData && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className={isExpense 
                ? 'bg-red-600 hover:bg-red-700' 
                : isIncome 
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {initialData ? 'Guardar Cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
