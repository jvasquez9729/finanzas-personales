import { useFinance } from '@/contexts/FinanceContext';
import { MetricCard } from '@/app/components/MetricCard';
import { BudgetProgress } from '@/app/components/BudgetProgress';
import { TransactionList } from '@/app/components/TransactionList';
import { Users, Target, TrendingUp, Shield } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export function Family() {
  const { financialData, users } = useFinance();
  const familyData = financialData.family;
  const userAData = financialData.userA;
  const userBData = financialData.userB;

  // Contribuciones
  const userAContribution = userAData.transactions
    .filter((t) => t.type === 'transfer')
    .reduce((sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum), 0);
  
  const userBContribution = userBData.transactions
    .filter((t) => t.type === 'transfer')
    .reduce((sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum), 0);

  const contributionData = [
    { name: users.userA, value: userAContribution, color: '#3b82f6' },
    { name: users.userB, value: userBContribution, color: '#10b981' },
  ];

  // Objetivos familiares
  const goals = [
    { name: 'Fondo de Emergencia', target: 180000, current: 135000, priority: 'high' },
    { name: 'Vacaciones Familiares', target: 50000, current: 38000, priority: 'medium' },
    { name: 'Educación Universitaria', target: 500000, current: 180000, priority: 'high' },
    { name: 'Renovación Casa', target: 120000, current: 45000, priority: 'low' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100 mb-2">Finanzas Familiares</h1>
          <p className="text-zinc-400">
            Vista consolidada del patrimonio y gastos compartidos
          </p>
        </div>

        {/* Family Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Patrimonio Familiar"
            value={`$${familyData.netWorth.toLocaleString()}`}
            change={9.1}
            trend="up"
            icon={<Users className="w-5 h-5" />}
            accentColor="emerald"
          />

          <MetricCard
            title="Ingresos Consolidados"
            value={`$${familyData.monthlyIncome.toLocaleString()}`}
            change={4.8}
            trend="up"
            icon={<TrendingUp className="w-5 h-5" />}
            accentColor="emerald"
          />

          <MetricCard
            title="Gastos Compartidos"
            value={`$${familyData.monthlyExpenses.toLocaleString()}`}
            change={3.2}
            trend="up"
            icon={<Shield className="w-5 h-5" />}
            accentColor="emerald"
          />

          <MetricCard
            title="Ahorro Familiar"
            value={`$${(familyData.monthlyIncome - familyData.monthlyExpenses).toLocaleString()}`}
            subtitle={`${familyData.savingsRate.toFixed(1)}% de ingresos`}
            icon={<Target className="w-5 h-5" />}
            accentColor="emerald"
          />
        </div>

        {/* Contributions and Budget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contributions Chart */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Aportaciones Individuales</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={contributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-600/10 border border-blue-600/30">
                <span className="text-sm text-zinc-300">{users.userA}</span>
                <span className="text-sm font-semibold text-blue-500">
                  ${userAContribution.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-600/10 border border-emerald-600/30">
                <span className="text-sm text-zinc-300">{users.userB}</span>
                <span className="text-sm font-semibold text-emerald-500">
                  ${userBContribution.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Family Budget */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Presupuesto Familiar</h3>
            {familyData.budgets.length === 0 ? (
              <div className="p-3 rounded-lg bg-zinc-900/50 text-sm text-zinc-500 border border-dashed border-zinc-800">
                Sin presupuestos configurados.
              </div>
            ) : (
              <div className="space-y-4">
                {familyData.budgets.slice(0, 6).map((budget) => (
                  <BudgetProgress key={budget.category} budget={budget} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Goals */}
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Objetivos Financieros Compartidos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const progress = (goal.current / goal.target) * 100;
              const remaining = goal.target - goal.current;
              
              return (
                <div key={goal.name} className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-zinc-200">{goal.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            goal.priority === 'high'
                              ? 'bg-red-600/20 text-red-400'
                              : goal.priority === 'medium'
                              ? 'bg-amber-600/20 text-amber-400'
                              : 'bg-zinc-600/20 text-zinc-400'
                          }`}
                        >
                          {goal.priority === 'high' ? 'Alta' : goal.priority === 'medium' ? 'Media' : 'Baja'} prioridad
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-500">
                        {progress.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="relative h-2 bg-zinc-900 rounded-full overflow-hidden mb-3">
                    <div
                      className="absolute top-0 left-0 h-full bg-emerald-600 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                      ${goal.current.toLocaleString()} de ${goal.target.toLocaleString()}
                    </span>
                    <span className="text-zinc-400">
                      Faltan ${remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shared Transactions */}
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Transacciones Familiares</h3>
          <TransactionList transactions={familyData.transactions} />
        </div>
      </div>
    </div>
  );
}
