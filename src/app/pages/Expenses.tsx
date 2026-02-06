import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { TransactionForm } from '@/app/components/forms/TransactionForm';
import { CSVImportForm } from '@/app/components/forms/CSVImportForm';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, Edit2, TrendingDown, PieChart, List, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Transaction } from '@/types/finance';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { EXPENSE_CATEGORIES } from '@/hooks/useTransactions';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];

export function Expenses() {
  const { 
    transactions, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    users,
    loading,
    user
  } = useFinance();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'fixed' | 'variable'>('variable');

  // Filtrar gastos según el tipo seleccionado
  const expenses = useMemo(() => {
    const type = activeTab === 'fixed' ? 'fixed_expense' : 'variable_expense';
    let filtered = transactions.filter(t => t.type === type);
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeTab, selectedCategory]);

  // Calcular totales
  const totalExpenses = expenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);

  // Datos para gráfica de pastel
  const expensesByCategory = useMemo(() => {
    const grouped = expenses.reduce((acc, expense) => {
      const cat = expense.category;
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += Math.abs(expense.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const handleAddExpense = async (expense: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addTransaction(expense);
    setIsFormOpen(false);
  };

  const handleEditExpense = async (expense: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, expense);
      setEditingTransaction(undefined);
      setIsFormOpen(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      await deleteTransaction(id);
    }
  };

  const handleImportCSV = async (importedTransactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    for (const tx of importedTransactions) {
      await addTransaction(tx);
    }
    setIsImportOpen(false);
  };

  const openEditForm = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const getCategoryIcon = (categoryName: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === categoryName);
    return cat?.icon || '📦';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100">Gestión de Gastos</h1>
          <p className="text-zinc-400 mt-1">Controla tus gastos fijos y variables</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
          <Button 
            onClick={() => {
              setEditingTransaction(undefined);
              setIsFormOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Gasto
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total {activeTab === 'fixed' ? 'Fijos' : 'Variables'}</p>
                <p className="text-2xl font-bold text-zinc-100">${totalExpenses.toLocaleString()}</p>
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
                <p className="text-sm text-zinc-400">Transacciones</p>
                <p className="text-2xl font-bold text-zinc-100">{expenses.length}</p>
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
                <p className="text-sm text-zinc-400">Promedio por Transacción</p>
                <p className="text-2xl font-bold text-zinc-100">
                  ${expenses.length > 0 ? Math.round(totalExpenses / expenses.length).toLocaleString() : '0'}
                </p>
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
            <TabsTrigger value="fixed" className="data-[state=active]:bg-zinc-700">Gastos Fijos</TabsTrigger>
            <TabsTrigger value="variable" className="data-[state=active]:bg-zinc-700">Gastos Variables</TabsTrigger>
          </TabsList>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all" className="text-zinc-100">Todas</SelectItem>
              {EXPENSE_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value} className="text-zinc-100">
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Tabs>

      {/* Gráfica de pastel */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">Distribución por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expensesByCategory.map((entry, index) => (
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

      {/* Lista de Transacciones */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {expenses.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No hay gastos registrados</p>
            ) : (
              expenses.map(expense => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
                    <div>
                      <p className="font-medium text-zinc-100">{expense.description}</p>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <span>{expense.category}</span>
                        <span>•</span>
                        <span>{format(new Date(expense.date), 'dd MMM yyyy', { locale: es })}</span>
                        {expense.isRecurring && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs border-zinc-600">Recurrente</Badge>
                          </>
                        )}
                        {expense.isShared && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs border-emerald-600 text-emerald-400">Compartido</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-red-400">-${Math.abs(expense.amount).toLocaleString()}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditForm(expense)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
        onSubmit={editingTransaction ? handleEditExpense : handleAddExpense}
        onDelete={editingTransaction ? handleDeleteExpense : undefined}
        initialData={editingTransaction}
        defaultType={activeTab === 'fixed' ? 'fixed_expense' : 'variable_expense'}
        users={users}
        currentUser={user?.uid || ''}
      />

      {/* Modal de Importación CSV */}
      <CSVImportForm
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportCSV}
        existingTransactions={transactions}
        users={users}
        currentUser={user?.uid || ''}
      />
    </div>
  );
}
