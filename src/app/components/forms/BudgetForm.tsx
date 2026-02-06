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
import { Slider } from '@/app/components/ui/slider';
import { Trash2 } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/hooks/useTransactions';
import type { Budget, BudgetPeriod } from '@/types/budget';

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Budget, 'id' | 'spent' | 'rolloverAmount' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: (id: string) => void;
  initialData?: Budget;
  users: { userA: string; userB: string };
  currentUser: string;
}

export function BudgetForm({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  users,
  currentUser,
}: BudgetFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    limit: '',
    period: 'monthly' as BudgetPeriod,
    alertThreshold: 80,
    rollover: false,
    userId: currentUser,
    isShared: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        category: initialData.category,
        limit: initialData.limit.toString(),
        period: initialData.period,
        alertThreshold: initialData.alertThreshold,
        rollover: initialData.rollover,
        userId: initialData.userId,
        isShared: initialData.isShared,
      });
    } else {
      setFormData({
        name: '',
        category: '',
        limit: '',
        period: 'monthly',
        alertThreshold: 80,
        rollover: false,
        userId: currentUser,
        isShared: false,
      });
    }
  }, [initialData, currentUser, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const limit = parseFloat(formData.limit);
    if (isNaN(limit) || limit <= 0) return;

    onSubmit({
      name: formData.name,
      category: formData.category,
      limit,
      period: formData.period,
      alertThreshold: formData.alertThreshold,
      rollover: formData.rollover,
      userId: formData.userId,
      isShared: formData.isShared,
    });
    
    onClose();
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData.id);
      onClose();
    }
  };

  const getPeriodLabel = (period: BudgetPeriod) => {
    switch (period) {
      case 'monthly': return 'Mensual';
      case 'quarterly': return 'Trimestral';
      case 'yearly': return 'Anual';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label>Nombre del Presupuesto</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Gastos de comida"
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
                <SelectItem value="all" className="text-zinc-100">
                  📊 Todas las categorías
                </SelectItem>
                {EXPENSE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value} className="text-zinc-100">
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto límite */}
          <div className="space-y-2">
            <Label>Límite ($)</Label>
            <Input
              type="number"
              value={formData.limit}
              onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              required
            />
          </div>

          {/* Período */}
          <div className="space-y-2">
            <Label>Período</Label>
            <Select 
              value={formData.period} 
              onValueChange={(value) => setFormData({ ...formData, period: value as BudgetPeriod })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="monthly" className="text-zinc-100">Mensual</SelectItem>
                <SelectItem value="quarterly" className="text-zinc-100">Trimestral</SelectItem>
                <SelectItem value="yearly" className="text-zinc-100">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Umbral de alerta */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Alertar al {formData.alertThreshold}%</Label>
              <span className="text-sm text-zinc-400">
                ${((parseFloat(formData.limit) || 0) * formData.alertThreshold / 100).toLocaleString()}
              </span>
            </div>
            <Slider
              value={[formData.alertThreshold]}
              onValueChange={(value) => setFormData({ ...formData, alertThreshold: value[0] })}
              min={50}
              max={95}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>50%</span>
              <span>95%</span>
            </div>
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

          {/* Opciones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Rollover</span>
                <span className="text-xs text-zinc-400">Acumular sobrante al siguiente período</span>
              </div>
              <Switch
                checked={formData.rollover}
                onCheckedChange={(checked) => setFormData({ ...formData, rollover: checked })}
              />
            </div>

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
          </div>

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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {initialData ? 'Guardar Cambios' : 'Crear Presupuesto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
