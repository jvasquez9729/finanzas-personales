import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { MetricCard } from '@/app/components/MetricCard';
import { Button } from '@/app/components/ui/button';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Users, 
  User,
  Plus,
  ArrowRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ContextType } from '@/types/finance';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];

export function Dashboard() {
  const { 
    activeContext, 
    setActiveContext, 
    financialData, 
    users, 
    stats,
    transactions,
    savingsGoals,
    investments
  } = useFinance();
  
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  const getContextLabel = () => {
    if (activeContext === 'userA') return users.userA;
    if (activeContext === 'userB') return users.userB;
    return 'Familia';
  };

  const getContextIcon = () => {
    if (activeContext === 'userA') return <User className="w-4 h-4" />;
    if (activeContext === 'userB') return <User className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  // Datos para gráfica de gastos por categoría
  const expensesByCategory = financialData.expensesByCategory.slice(0, 8).map(item => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage
  }));

  // Datos para gráfica mensual (simulados por ahora)
  const monthlyData = [
    { month: 'Ene', income: (stats?.monthlyIncome || 0) * 0.9, expenses: (stats?.monthlyExpenses || 0) * 0.95 },
    { month: 'Feb', income: (stats?.monthlyIncome || 0) * 0.95, expenses: (stats?.monthlyExpenses || 0) * 0.9 },
    { month: 'Mar', income: (stats?.monthlyIncome || 0) * 1.0, expenses: (stats?.monthlyExpenses || 0) * 1.05 },
    { month: 'Abr', income: (stats?.monthlyIncome || 0) * 1.02, expenses: (stats?.monthlyExpenses || 0) * 0.98 },
    { month: 'May', income: (stats?.monthlyIncome || 0) * 1.05, expenses: (stats?.monthlyExpenses || 0) * 1.02 },
    { month: 'Jun', income: (stats?.monthlyIncome || 0), expenses: (stats?.monthlyExpenses || 0) },
  ];

  // Transacciones recientes
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Calcular métricas
  const cashFlow = (stats?.monthlyIncome || 0) - (stats?.monthlyExpenses || 0);
  const netWorth = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0) +
                   investments.reduce((sum, i) => sum + i.currentValue, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 space-y-8">
        {/* Header con selector de contexto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-100 mb-2">Panel Principal</h1>
            <p className="text-zinc-400">
              Vista de {getContextLabel()} · {new Date().toLocaleDateString('es-MX', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Selector de contexto */}
            <div className="flex bg-zinc-800 rounded-lg p-1">
              {(['userA', 'userB', 'family'] as ContextType[]).map((ctx) => (
                <button
                  key={ctx}
                  onClick={() => setActiveContext(ctx)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    activeContext === ctx
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {ctx === 'family' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  {ctx === 'userA' ? users.userA : ctx === 'userB' ? users.userB : 'Familia'}
                </button>
              ))}
            </div>

            {/* Selector de período */}
            <div className="flex bg-zinc-800 rounded-lg p-1">
              {(['month', 'quarter', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {range === 'month' ? 'Mes' : range === 'quarter' ? 'Trimestre' : 'Año'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Balance Mensual"
            value={`$${(stats?.balance || 0).toLocaleString()}`}
            change={(stats?.balance || 0) > 0 ? 5.2 : -2.1}
            trend={(stats?.balance || 0) >= 0 ? 'up' : 'down'}
            subtitle="Ingresos - Gastos"
            icon={<Wallet className="w-5 h-5" />}
            accentColor={(stats?.balance || 0) >= 0 ? 'emerald' : 'red'}
          />

          <MetricCard
            title="Ingresos"
            value={`$${(stats?.monthlyIncome || 0).toLocaleString()}`}
            change={3.5}
            trend="up"
            subtitle={`Fijos: $${(stats?.fixedIncome || 0).toLocaleString()}`}
            icon={<TrendingUp className="w-5 h-5" />}
            accentColor="emerald"
          />

          <MetricCard
            title="Gastos"
            value={`$${(stats?.monthlyExpenses || 0).toLocaleString()}`}
            change={-1.2}
            trend="down"
            subtitle={`Fijos: $${(stats?.fixedExpenses || 0).toLocaleString()}`}
            icon={<TrendingDown className="w-5 h-5" />}
            accentColor="red"
          />

          <MetricCard
            title="Tasa de Ahorro"
            value={`${(stats?.savingsRate || 0).toFixed(1)}%`}
            change={(stats?.savingsRate || 0) > 20 ? 2.3 : -0.5}
            trend={(stats?.savingsRate || 0) > 0 ? 'up' : 'down'}
            subtitle="Meta: 20%"
            icon={<PiggyBank className="w-5 h-5" />}
            accentColor={(stats?.savingsRate || 0) >= 20 ? 'emerald' : 'amber'}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Tendencia Mensual</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" style={{ fontSize: '12px' }} />
                <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Ingresos"
                  dot={{ fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Gastos"
                  dot={{ fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Expenses by Category */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Gastos por Categoría</h3>
            </div>
            {expensesByCategory.length === 0 ? (
              <div className="p-3 rounded-lg bg-zinc-900/50 text-sm text-zinc-500 border border-dashed border-zinc-800 text-center py-12">
                Sin datos de gastos.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Resumen de Ahorros e Inversiones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metas de Ahorro */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Metas de Ahorro</h3>
              <Button variant="ghost" size="sm" className="text-zinc-400" asChild>
                <a href="#/dashboard/ahorros">Ver todo <ArrowRight className="w-4 h-4 ml-1" /></a>
              </Button>
            </div>
            <div className="space-y-4">
              {savingsGoals.slice(0, 3).map(goal => {
                const percentage = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-300">{goal.name}</span>
                      <span className="text-zinc-400">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>${goal.currentAmount.toLocaleString()}</span>
                      <span>${goal.targetAmount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
              {savingsGoals.length === 0 && (
                <p className="text-zinc-500 text-center py-4">No hay metas de ahorro</p>
              )}
            </div>
          </div>

          {/* Inversiones */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Inversiones</h3>
              <Button variant="ghost" size="sm" className="text-zinc-400" asChild>
                <a href="#/dashboard/ahorros">Ver todo <ArrowRight className="w-4 h-4 ml-1" /></a>
              </Button>
            </div>
            <div className="space-y-4">
              {investments.slice(0, 3).map(inv => {
                const isProfitable = inv.returns >= 0;
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-zinc-200">{inv.name}</p>
                      <p className="text-sm text-zinc-400">{inv.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-zinc-200">${inv.currentValue.toLocaleString()}</p>
                      <p className={`text-sm ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isProfitable ? '+' : ''}{inv.returns.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
              {investments.length === 0 && (
                <p className="text-zinc-500 text-center py-4">No hay inversiones</p>
              )}
            </div>
          </div>

          {/* Transacciones Recientes */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Transacciones Recientes</h3>
            </div>
            <div className="space-y-3">
              {recentTransactions.map(tx => {
                const isExpense = tx.type.includes('expense');
                const isIncome = tx.type.includes('income');
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-zinc-200">{tx.description}</p>
                      <p className="text-xs text-zinc-400">{tx.category}</p>
                    </div>
                    <p className={`font-medium ${
                      isIncome ? 'text-emerald-400' : isExpense ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {isIncome ? '+' : isExpense ? '-' : ''}${Math.abs(tx.amount).toLocaleString()}
                    </p>
                  </div>
                );
              })}
              {recentTransactions.length === 0 && (
                <p className="text-zinc-500 text-center py-4">No hay transacciones</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Button asChild className="bg-red-600 hover:bg-red-700">
            <a href="#/dashboard/gastos">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Gasto
            </a>
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <a href="#/dashboard/ingresos">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Ingreso
            </a>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <a href="#/dashboard/ahorros">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Ahorro
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
