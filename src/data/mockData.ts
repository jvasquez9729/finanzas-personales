import type { ContextData, Transaction, SavingsGoal, Investment } from '@/types/finance';

interface FinancialContext {
  userA: ContextData;
  userB: ContextData;
  family: ContextData;
}

// Helper para crear transacciones
const createTransaction = (
  id: string,
  type: Transaction['type'],
  description: string,
  amount: number,
  category: string,
  date: string,
  userId: string,
  isShared: boolean = false,
  isRecurring: boolean = false
): Transaction => ({
  id,
  type,
  description,
  amount,
  category,
  date,
  userId,
  isShared,
  isRecurring,
  frequency: isRecurring ? 'monthly' : undefined,
  createdAt: date,
  updatedAt: date,
});

// Transacciones iniciales
const mockTransactions: Transaction[] = [
  // UserA - Papá
  createTransaction('1', 'fixed_income', 'Nómina Empresa X', 45000, 'salary', '2026-02-01', 'userA', false, true),
  createTransaction('2', 'fixed_expense', 'Renta Departamento', -11800, 'housing', '2026-02-01', 'userA', false, true),
  createTransaction('3', 'variable_expense', 'Supermercado Soriana', -1250, 'food', '2026-01-28', 'userA'),
  createTransaction('4', 'variable_expense', 'Gasolina Pemex', -850, 'transport', '2026-01-27', 'userA'),
  createTransaction('5', 'fixed_expense', 'Netflix', -299, 'entertainment', '2026-01-26', 'userA', false, true),
  createTransaction('6', 'savings', 'Ahorro Fondo Emergencia', -5000, 'emergency', '2026-01-25', 'userA', false, true),
  createTransaction('7', 'variable_expense', 'Gimnasio Smart Fit', -550, 'health', '2026-01-24', 'userA'),
  createTransaction('8', 'variable_expense', 'Amazon - Libros', -680, 'education', '2026-01-23', 'userA'),
  createTransaction('9', 'investment', 'CETES 28 días', -10000, 'cetes', '2026-01-20', 'userA', false, true),
  
  // UserB - Mamá
  createTransaction('10', 'fixed_income', 'Nómina Empresa Y', 38000, 'salary', '2026-02-01', 'userB', false, true),
  createTransaction('11', 'fixed_expense', 'Servicios Casa', -2800, 'utilities', '2026-02-01', 'userB', false, true),
  createTransaction('12', 'variable_expense', 'Mercado Local', -980, 'food', '2026-01-29', 'userB'),
  createTransaction('13', 'variable_expense', 'Uber', -420, 'transport', '2026-01-28', 'userB'),
  createTransaction('14', 'fixed_expense', 'Spotify Premium', -199, 'entertainment', '2026-01-27', 'userB', false, true),
  createTransaction('15', 'savings', 'Ahorro Vacaciones', -3000, 'vacation', '2026-01-26', 'userB', false, true),
  createTransaction('16', 'variable_expense', 'Farmacia Guadalajara', -850, 'health', '2026-01-25', 'userB'),
  createTransaction('17', 'variable_expense', 'Curso Online Udemy', -399, 'education', '2026-01-24', 'userB'),
  createTransaction('18', 'investment', 'Fondo de Inversión', -8000, 'funds', '2026-01-15', 'userB'),
  
  // Compartidos (Family)
  createTransaction('19', 'fixed_income', 'Renta Propiedad Vacacional', 8000, 'rental', '2026-02-01', 'userA', true, true),
  createTransaction('20', 'fixed_expense', 'Hipoteca Casa Familiar', -15000, 'housing', '2026-02-01', 'userA', true, true),
  createTransaction('21', 'fixed_expense', 'Colegiatura Hijos', -8000, 'education', '2026-02-01', 'userA', true, true),
  createTransaction('22', 'variable_expense', 'Costco - Compra Familiar', -4500, 'food', '2026-01-30', 'userA', true),
  createTransaction('23', 'fixed_expense', 'Seguro Médico Familiar', -3200, 'health', '2026-01-29', 'userA', true, true),
  createTransaction('24', 'fixed_expense', 'CFE + Agua', -2100, 'utilities', '2026-01-28', 'userA', true, true),
  createTransaction('25', 'variable_expense', 'Mantenimiento Auto', -2800, 'transport', '2026-01-27', 'userA', true),
  createTransaction('26', 'savings', 'Fondo Universitario Hijos', -5000, 'education', '2026-01-26', 'userA', true, true),
  createTransaction('27', 'variable_expense', 'Restaurante Familiar', -1850, 'entertainment', '2026-01-25', 'userA', true),
  createTransaction('28', 'investment', 'Compra Acciones ETF', -20000, 'stocks', '2026-01-10', 'userA', true),
];

// Metas de ahorro
const mockSavingsGoals: SavingsGoal[] = [
  {
    id: '1',
    name: 'Fondo de Emergencia',
    targetAmount: 150000,
    currentAmount: 85000,
    category: 'emergency',
    userId: 'userA',
    isShared: false,
    deadline: '2026-12-31',
  },
  {
    id: '2',
    name: 'Vacaciones Europa',
    targetAmount: 80000,
    currentAmount: 35000,
    category: 'vacation',
    userId: 'userB',
    isShared: false,
    deadline: '2026-07-01',
  },
  {
    id: '3',
    name: 'Universidad Hijos',
    targetAmount: 500000,
    currentAmount: 120000,
    category: 'education',
    userId: 'userA',
    isShared: true,
    deadline: '2030-08-01',
  },
  {
    id: '4',
    name: 'Nuevo Auto Familiar',
    targetAmount: 200000,
    currentAmount: 45000,
    category: 'car',
    userId: 'userA',
    isShared: true,
    deadline: '2027-01-01',
  },
];

// Inversiones
const mockInvestments: Investment[] = [
  {
    id: '1',
    name: 'CETES 28 días',
    type: 'cetes',
    initialAmount: 100000,
    currentValue: 102500,
    returns: 2.5,
    startDate: '2025-06-01',
    userId: 'userA',
    isShared: false,
  },
  {
    id: '2',
    name: 'Fondo Banorte',
    type: 'funds',
    initialAmount: 50000,
    currentValue: 54200,
    returns: 8.4,
    startDate: '2025-03-15',
    userId: 'userB',
    isShared: false,
  },
  {
    id: '3',
    name: 'Cartera ETF',
    type: 'stocks',
    initialAmount: 150000,
    currentValue: 168000,
    returns: 12.0,
    startDate: '2025-01-10',
    userId: 'userA',
    isShared: true,
  },
  {
    id: '4',
    name: 'Bitcoin',
    type: 'crypto',
    initialAmount: 30000,
    currentValue: 35000,
    returns: 16.7,
    startDate: '2024-11-20',
    userId: 'userB',
    isShared: false,
  },
];

// Datos mock completos
export const mockFinancialData: FinancialContext = {
  userA: {
    users: { userA: 'Papá', userB: 'Mamá' },
    monthlyIncome: 45000 + 8000, // Incluye ingreso compartido
    monthlyExpenses: 19779,
    fixedExpenses: 12399,
    variableExpenses: 7380,
    fixedIncome: 45000 + 8000,
    variableIncome: 0,
    savings: 5000,
    investments: 10000,
    balance: 0,
    savingsRate: 0,
    expensesByCategory: [],
    incomeBySource: [],
    expenseTrend: [],
    incomeTrend: [],
    savingsGoals: mockSavingsGoals.filter(g => g.userId === 'userA' && !g.isShared),
    investments: mockInvestments.filter(i => i.userId === 'userA' && !i.isShared),
    transactions: mockTransactions.filter(t => t.userId === 'userA'),
  },
  userB: {
    users: { userA: 'Papá', userB: 'Mamá' },
    monthlyIncome: 38000,
    monthlyExpenses: 7629,
    fixedExpenses: 3399,
    variableExpenses: 4230,
    fixedIncome: 38000,
    variableIncome: 0,
    savings: 3000,
    investments: 8000,
    balance: 0,
    savingsRate: 0,
    expensesByCategory: [],
    incomeBySource: [],
    expenseTrend: [],
    incomeTrend: [],
    savingsGoals: mockSavingsGoals.filter(g => g.userId === 'userB' && !g.isShared),
    investments: mockInvestments.filter(i => i.userId === 'userB' && !i.isShared),
    transactions: mockTransactions.filter(t => t.userId === 'userB'),
  },
  family: {
    users: { userA: 'Papá', userB: 'Mamá' },
    monthlyIncome: 83000 + 8000, // Ingresos totales
    monthlyExpenses: 47829,
    fixedExpenses: 33999,
    variableExpenses: 13830,
    fixedIncome: 83000 + 8000,
    variableIncome: 0,
    savings: 5000 + 3000 + 5000, // Ahorros individuales + compartido
    investments: 10000 + 8000 + 20000, // Inversiones totales
    balance: 0,
    savingsRate: 0,
    expensesByCategory: [],
    incomeBySource: [],
    expenseTrend: [],
    incomeTrend: [],
    savingsGoals: mockSavingsGoals,
    investments: mockInvestments,
    transactions: mockTransactions,
  },
};

// Calcular estadísticas reales
Object.keys(mockFinancialData).forEach((key) => {
  const ctx = mockFinancialData[key as keyof FinancialContext];
  const totalIncome = ctx.monthlyIncome;
  const totalExpenses = ctx.monthlyExpenses;
  ctx.balance = totalIncome - totalExpenses;
  ctx.savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
});
