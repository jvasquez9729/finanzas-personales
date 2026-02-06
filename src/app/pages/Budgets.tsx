import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useBudgets } from '@/hooks/useBudgets';
import { BudgetForm } from '@/app/components/forms/BudgetForm';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Progress } from '@/app/components/ui/progress';
import { 
  Plus, 
  Edit2, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell
} from 'lucide-react';
import type { Budget, BudgetAlertLevel } from '@/types/budget';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS: Record<BudgetAlertLevel, string> = {
  ok: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  exceeded: '#dc2626',
};

export function Budgets() {
  const { activeContext, users, transactions } = useFinance();
  const {
    budgets,
    alerts,
    summary,
    comparison,
    addBudget,
    updateBudget,
    deleteBudget,
  } = useBudgets([], transactions);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  const currentUser = activeContext === 'userA' ? 'userA' : activeContext === 'userB' ? 'userB' : 'userA';

  const filteredBudgets = showAlertsOnly 
    ? budgets.filter(b => (b.percentage || 0) >= b.alertThreshold)
    : budgets;

  const handleAddBudget = (budget: Omit<Budget, 'id' | 'spent' | 'rolloverAmount' | 'createdAt' | 'updatedAt'>) => {
    addBudget(budget);
  };

  const handleEditBudget = (budget: Omit<Budget, 'id' | 'spent' | 'rolloverAmount' | 'createdAt' | 'updatedAt'>) => {
    if (editingBudget) {
      updateBudget(editingBudget.id, budget);
      setEditingBudget(undefined);
    }
  };

  const openEditForm = (budget: Budget) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  const getAlertIcon = (level: BudgetAlertLevel) => {
    switch (level) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'danger': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'exceeded': return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getAlertColor = (percentage: number, threshold: number) => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= threshold) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100">Presupuestos</h1>
          <p className="text-zinc-400 mt-1">Controla tus limites de gasto por categoria</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAlertsOnly(!showAlertsOnly)}
            className={`border-zinc-700 ${showAlertsOnly ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-300'}`}
          >
            <Bell className="w-4 h-4 mr-2" />
            {showAlertsOnly ? 'Mostrar todos' : `Alertas (${alerts.length})`}
          </Button>
          <Button 
            onClick={() => {
              setEditingBudget(undefined);
              setIsFormOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Presupuesto
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && !showAlertsOnly && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map(alert => (
            <Alert 
              key={alert.budgetId} 
              className={`border-l-4 ${
                alert.level === 'exceeded' ? 'border-red-600 bg-red-950/20' :
                alert.level === 'danger' ? 'border-red-500 bg-red-950/10' :
                'border-amber-500 bg-amber-950/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {getAlertIcon(alert.level)}
                <AlertDescription className="text-zinc-200">
                  {alert.message}
                  {alert.remaining > 0 && (
                    <span className="text-zinc-400 ml-2">
                      (Restante: ${alert.remaining.toLocaleString()})
                    </span>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Presupuestado</p>
                <p className="text-2xl font-bold text-zinc-100">${summary.totalBudgeted.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Gastado</p>
                <p className="text-2xl font-bold text-zinc-100">${summary.totalSpent.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Restante</p>
                <p className="text-2xl font-bold text-zinc-100">${summary.totalRemaining.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Uso Global</p>
                <p className={`text-2xl font-bold ${summary.overallPercentage >= 90 ? 'text-red-500' : 'text-zinc-100'}`}>
                  {summary.overallPercentage.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-full ${summary.overallPercentage >= 90 ? 'bg-red-500/10' : 'bg-zinc-800'}`}>
                <AlertCircle className={`w-6 h-6 ${summary.overallPercentage >= 90 ? 'text-red-500' : 'text-zinc-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica de Comparativa */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">Presupuesto vs Real</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="category" stroke="#71717a" style={{ fontSize: '11px' }} />
              <YAxis stroke="#71717a" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="budgeted" name="Presupuestado" fill="#3b82f6" />
              <Bar dataKey="actual" name="Gastado">
                {comparison.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.actual > entry.budgeted ? '#ef4444' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista de Presupuestos */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">Tus Presupuestos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBudgets.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">
                {showAlertsOnly 
                  ? 'No hay alertas activas' 
                  : 'No has creado ningun presupuesto'}
              </p>
            ) : (
              filteredBudgets.map(budget => {
                const percentage = budget.percentage || 0;
                const isOverBudget = percentage >= 100;
                
                return (
                  <div
                    key={budget.id}
                    className="p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer group"
                    onClick={() => openEditForm(budget)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {percentage >= 100 ? '🔴' : percentage >= 80 ? '🟡' : '🟢'}
                        </span>
                        <div>
                          <h3 className="font-medium text-zinc-100">{budget.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <span className="capitalize">{budget.category}</span>
                            <span>•</span>
                            <span className="capitalize">{budget.period === 'monthly' ? 'Mensual' : budget.period === 'quarterly' ? 'Trimestral' : 'Anual'}</span>
                            {budget.rollover && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs border-blue-600 text-blue-400">Rollover</Badge>
                              </>
                            )}
                            {budget.isShared && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs border-emerald-600 text-emerald-400">Compartido</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-bold ${isOverBudget ? 'text-red-400' : 'text-zinc-100'}`}>
                            ${budget.spent.toLocaleString()}
                            <span className="text-zinc-500 font-normal"> / ${(budget.limit + budget.rolloverAmount).toLocaleString()}</span>
                          </p>
                          <p className={`text-sm ${percentage >= 100 ? 'text-red-400' : percentage >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {percentage.toFixed(0)}% usado
                            {budget.remaining !== undefined && ` • $${budget.remaining.toLocaleString()} restantes`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(budget);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className={`h-2 ${getAlertColor(percentage, budget.alertThreshold)}`}
                    />
                    
                    {percentage >= budget.alertThreshold && (
                      <p className="text-xs mt-2 text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Has alcanzado el {budget.alertThreshold}% del presupuesto
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Formulario */}
      <BudgetForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBudget(undefined);
        }}
        onSubmit={editingBudget ? handleEditBudget : handleAddBudget}
        onDelete={editingBudget ? deleteBudget : undefined}
        initialData={editingBudget}
        users={users}
        currentUser={currentUser}
      />
    </div>
  );
}
