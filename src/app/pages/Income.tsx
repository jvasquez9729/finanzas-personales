import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions, INCOME_CATEGORIES } from '@/hooks/useTransactions';
import { TransactionForm } from '@/app/components/forms/TransactionForm';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, Edit2, TrendingUp, PieChart, List } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Transaction } from '@/types/finance';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

export function Income() {
  const { activeContext, financialData, users } = useFinance();
  const { 
    transactions, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    getTransactionsByType 
  } = useTransactions(financialData.transactions);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'fixed' | 'variable'>('fixed');

  const currentUser = activeContext === 'userA' ? 'userA' : activeContext === 'userB' ? 'userB' : 'userA';

  // Filtrar ingresos
  const income = useMemo(() => {
    const type = activeTab === 'fixed' ? 'fixed_income' : 'variable_income';
    let filtered = getTransactionsByType(type);
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    if (selectedUser !== 'all') {
      filtered = filtered.filter(t => t.userId === selectedUser || t.isShared);
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeTab, selectedCategory, selectedUser, getTransactionsByType]);

  // Calcular totales
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const monthlyAverage = totalIncome / (income.length > 0 ? 6 : 1);

  // Datos para gráfica de pastel
  const incomeByCategory = useMemo(() => {
    const grouped = income.reduce((acc, inc) => {
      const cat = inc.category;
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += inc.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [income]);

  // Datos para gráfica de área
  const monthlyData = useMemo(() => {
    const months = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'];
    return months.map(month => ({
      month,
      fijos: activeTab === 'fixed' ? totalIncome / 6 : financialData.fixedIncome / 6,
      variables: activeTab === 'variable' ? totalIncome / 6 : financialData.variableIncome / 6,
    }));
  }, [totalIncome, financialData, activeTab]);

  const handleAddIncome = (income: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    addTransaction(income);
  };

  const handleEditIncome = (income: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, income);
      setEditingTransaction(undefined);
    }
  };

  const handleDeleteIncome = (id: string) => {
    deleteTransaction(id);
  };

  const openEditForm = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const getCategoryIcon = (categoryName: string) => {
    const cat = INCOME_CATEGORIES.find(c => c.value === categoryName);
    return cat?.icon || '💰';
  };

  const getUserName = (userId: string) => {
    return userId === 'userA' ? users.userA : users.userB;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100">Gestión de Ingresos</h1>
          <p className="text-zinc-400 mt-1">Controla tus ingresos fijos y variables</p>
        </div>
        <Button 
          onClick={() => {
            setEditingTransaction(undefined);
            setIsFormOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Ingreso
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total {activeTab === 'fixed' ? 'Fijos' : 'Variables'}</p>
                <p className="text-2xl font-bold text-zinc-100">${totalIncome.toLocaleString()}</p>
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
                <p className="text-sm text-zinc-400">Transacciones</p>
                <p className="text-2xl font-bold text-zinc-100">{income.length}</p>
              </div>
              <div className="p-3 bg-zinc-800 rounded-full">
                <List className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Promedio Mensual</p>
                <p className="text-2xl font-bold text-zinc-100">${monthlyAverage.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-zinc-800 rounded-full">
                <PieChart className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs y Filtros */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fixed' | 'variable')}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-zinc-800">
            <TabsTrigger value="fixed" className="data-[state=active]:bg-zinc-700">Ingresos Fijos</TabsTrigger>
            <TabsTrigger value="variable" className="data-[state=active]:bg-zinc-700">Ingresos Variables</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-zinc-100">Todas</SelectItem>
                {INCOME_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value} className="text-zinc-100">
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeContext === 'family' && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Usuario" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all" className="text-zinc-100">Todos</SelectItem>
                  <SelectItem value="userA" className="text-zinc-100">{users.userA}</SelectItem>
                  <SelectItem value="userB" className="text-zinc-100">{users.userB}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </Tabs>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">Distribución por Fuente</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={incomeByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incomeByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">Tendencia de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorFijos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVariables" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Area type="monotone" dataKey="fijos" name="Ingresos Fijos" stroke="#10b981" fillOpacity={1} fill="url(#colorFijos)" />
                <Area type="monotone" dataKey="variables" name="Ingresos Variables" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVariables)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Transacciones */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {income.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No hay ingresos registrados</p>
            ) : (
              income.map(inc => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer group"
                  onClick={() => openEditForm(inc)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{getCategoryIcon(inc.category)}</span>
                    <div>
                      <p className="font-medium text-zinc-100">{inc.description}</p>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <span>{inc.category}</span>
                        <span>•</span>
                        <span>{format(parseISO(inc.date), 'dd MMM yyyy', { locale: es })}</span>
                        {inc.isRecurring && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs border-zinc-600">Recurrente</Badge>
                          </>
                        )}
                        {inc.isShared && (
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
                      <p className="font-bold text-emerald-400">+${inc.amount.toLocaleString()}</p>
                      <p className="text-sm text-zinc-500">{getUserName(inc.userId)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(inc);
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

      {/* Modal de Formulario */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(undefined);
        }}
        onSubmit={editingTransaction ? handleEditIncome : handleAddIncome}
        onDelete={editingTransaction ? handleDeleteIncome : undefined}
        initialData={editingTransaction}
        defaultType={activeTab === 'fixed' ? 'fixed_income' : 'variable_income'}
        users={users}
        currentUser={currentUser}
      />
    </div>
  );
}
