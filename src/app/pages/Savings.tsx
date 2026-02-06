import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions, SAVINGS_CATEGORIES, INVESTMENT_CATEGORIES } from '@/hooks/useTransactions';
import { TransactionForm } from '@/app/components/forms/TransactionForm';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Progress } from '@/app/components/ui/progress';
import { Plus, Edit2, PiggyBank, TrendingUp, Target, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Transaction, SavingsGoal, Investment } from '@/types/finance';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export function Savings() {
  const { activeContext, financialData, users, savingsGoals, investments } = useFinance();
  const { 
    transactions, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    getTransactionsByType 
  } = useTransactions(financialData.transactions);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [activeTab, setActiveTab] = useState<'savings' | 'investments'>('savings');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);

  const currentUser = activeContext === 'userA' ? 'userA' : activeContext === 'userB' ? 'userB' : 'userA';

  // Datos de ahorros
  const savingsTransactions = useMemo(() => 
    getTransactionsByType('savings'),
    [getTransactionsByType]
  );

  const investmentTransactions = useMemo(() => 
    getTransactionsByType('investment'),
    [getTransactionsByType]
  );

  // Totales
  const totalSavings = savingsTransactions.reduce((sum, s) => sum + s.amount, 0);
  const totalInvested = investmentTransactions.reduce((sum, i) => sum + i.amount, 0);
  const totalInvestmentsValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalReturns = investments.reduce((sum, i) => sum + (i.currentValue - i.initialAmount), 0);
  const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // Datos para gráfica
  const chartData = useMemo(() => {
    const months = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'];
    return months.map(month => ({
      month,
      ahorros: totalSavings / 6,
      inversiones: totalInvested / 6,
    }));
  }, [totalSavings, totalInvested]);

  const handleAddTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    addTransaction(transaction);
  };

  const handleEditTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transaction);
      setEditingTransaction(undefined);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
  };

  const openEditForm = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const getCategoryIcon = (categoryName: string, isInvestment: boolean) => {
    const cats = isInvestment ? INVESTMENT_CATEGORIES : SAVINGS_CATEGORIES;
    const cat = cats.find(c => c.value === categoryName);
    return cat?.icon || (isInvestment ? '📈' : '💰');
  };

  const getUserName = (userId: string) => {
    return userId === 'userA' ? users.userA : users.userB;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100">Ahorros e Inversiones</h1>
          <p className="text-zinc-400 mt-1">Gestiona tus metas de ahorro y portafolio de inversiones</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setEditingTransaction(undefined);
              setIsFormOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'savings' ? 'Agregar Ahorro' : 'Agregar Inversión'}
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Ahorros</p>
                <p className="text-2xl font-bold text-zinc-100">${totalSavings.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <PiggyBank className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Invertido</p>
                <p className="text-2xl font-bold text-zinc-100">${totalInvested.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-violet-500/10 rounded-full">
                <Wallet className="w-6 h-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Valor Actual</p>
                <p className="text-2xl font-bold text-zinc-100">${totalInvestmentsValue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Rendimiento</p>
                <p className={`text-2xl font-bold ${returnsPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {returnsPercentage >= 0 ? '+' : ''}{returnsPercentage.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-full ${returnsPercentage >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <Target className={`w-6 h-6 ${returnsPercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'savings' | 'investments')}>
        <TabsList className="bg-zinc-800">
          <TabsTrigger value="savings" className="data-[state=active]:bg-zinc-700">Metas de Ahorro</TabsTrigger>
          <TabsTrigger value="investments" className="data-[state=active]:bg-zinc-700">Inversiones</TabsTrigger>
        </TabsList>

        <TabsContent value="savings" className="mt-6 space-y-6">
          {/* Metas de Ahorro */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savingsGoals.map(goal => {
              const percentage = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <Card key={goal.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getCategoryIcon(goal.category, false)}</span>
                        <div>
                          <h3 className="font-semibold text-zinc-100">{goal.name}</h3>
                          <p className="text-sm text-zinc-400">{getUserName(goal.userId)}</p>
                        </div>
                      </div>
                      {goal.isShared && (
                        <Badge variant="outline" className="border-emerald-600 text-emerald-400">Compartido</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Progreso</span>
                        <span className="text-zinc-100">{percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={percentage} className={`h-2 ${getProgressColor(percentage)}`} />
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-emerald-400">${goal.currentAmount.toLocaleString()}</span>
                        <span className="text-zinc-500">${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      {goal.deadline && (
                        <p className="text-xs text-zinc-500 mt-2">
                          Meta: {format(parseISO(goal.deadline), 'dd MMM yyyy', { locale: es })}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Historial de Ahorros */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100">Historial de Ahorros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savingsTransactions.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No hay movimientos de ahorro</p>
                ) : (
                  savingsTransactions.sort((a, b) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  ).map(tx => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer group"
                      onClick={() => openEditForm(tx)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{getCategoryIcon(tx.category, false)}</span>
                        <div>
                          <p className="font-medium text-zinc-100">{tx.description}</p>
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>{format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}</span>
                            {tx.isRecurring && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs border-zinc-600">Automático</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-blue-400">+${tx.amount.toLocaleString()}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(tx);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="mt-6 space-y-6">
          {/* Portafolio de Inversiones */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investments.map(inv => {
              const isProfitable = inv.returns >= 0;
              return (
                <Card key={inv.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getCategoryIcon(inv.type, true)}</span>
                        <div>
                          <h3 className="font-semibold text-zinc-100">{inv.name}</h3>
                          <p className="text-sm text-zinc-400">{getUserName(inv.userId)}</p>
                        </div>
                      </div>
                      {inv.isShared && (
                        <Badge variant="outline" className="border-emerald-600 text-emerald-400">Compartido</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Inversión</span>
                        <span className="text-zinc-100">${inv.initialAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Valor Actual</span>
                        <span className="text-zinc-100">${inv.currentValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Rendimiento</span>
                        <span className={isProfitable ? 'text-emerald-400' : 'text-red-400'}>
                          {isProfitable ? '+' : ''}{inv.returns.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Gráfica de Inversiones */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100">Evolución de Inversiones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <Bar dataKey="ahorros" name="Ahorros" fill="#3b82f6" />
                  <Line type="monotone" dataKey="inversiones" name="Inversiones" stroke="#10b981" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Historial de Inversiones */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100">Historial de Inversiones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {investmentTransactions.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No hay movimientos de inversión</p>
                ) : (
                  investmentTransactions.sort((a, b) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  ).map(tx => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer group"
                      onClick={() => openEditForm(tx)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{getCategoryIcon(tx.category, true)}</span>
                        <div>
                          <p className="font-medium text-zinc-100">{tx.description}</p>
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>{format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-violet-400">+${tx.amount.toLocaleString()}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(tx);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Formulario */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(undefined);
        }}
        onSubmit={editingTransaction ? handleEditTransaction : handleAddTransaction}
        onDelete={editingTransaction ? handleDeleteTransaction : undefined}
        initialData={editingTransaction}
        defaultType={activeTab === 'savings' ? 'savings' : 'investment'}
        users={users}
        currentUser={currentUser}
      />
    </div>
  );
}
