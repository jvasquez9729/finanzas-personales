import { useFinance } from '@/contexts/FinanceContext';
import { MetricCard } from '@/app/components/MetricCard';
import { BudgetProgress } from '@/app/components/BudgetProgress';
import { TransactionList } from '@/app/components/TransactionList';
import { Wallet, TrendingUp, ArrowLeftRight, PiggyBank } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

export function Personal() {
  const { activeContext, financialData, users } = useFinance();

  const personalContext =
    activeContext === 'userA' || activeContext === 'userB' ? activeContext : 'userA';
  const data = financialData[personalContext];

  const getContextLabel = () => {
    if (personalContext === 'userA') return users.userA;
    return users.userB;
  };

  const transfersToFamily = data.transactions.filter((t) => t.type === 'transfer');
  const totalTransferred = transfersToFamily.reduce((sum, t) => {
    const outflow = t.amount < 0 ? Math.abs(t.amount) : 0;
    return sum + outflow;
  }, 0);

  const derivedSavingsRate =
    data.monthlyIncome > 0
      ? ((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome) * 100
      : 0;
  const derivedMonthlySavings = data.monthlyIncome - data.monthlyExpenses;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100 mb-2">Finanzas Personales</h1>
          <p className="text-zinc-400">
            Información financiera individual de {getContextLabel()}
          </p>
        </div>

        {/* Personal Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Patrimonio Personal"
            value={`$${data.netWorth.toLocaleString()}`}
            change={7.2}
            trend="up"
            icon={<Wallet className="w-5 h-5" />}
            accentColor="blue"
          />

          <MetricCard
            title="Ingreso Mensual"
            value={`$${data.monthlyIncome.toLocaleString()}`}
            change={4.1}
            trend="up"
            icon={<TrendingUp className="w-5 h-5" />}
            accentColor="blue"
          />

          <MetricCard
            title="Gastos Mensuales"
            value={`$${data.monthlyExpenses.toLocaleString()}`}
            change={2.3}
            trend="down"
            icon={<Wallet className="w-5 h-5" />}
            accentColor="blue"
          />

          <MetricCard
            title="Aporte Familiar"
            value={`$${totalTransferred.toLocaleString()}`}
            subtitle="este mes"
            icon={<ArrowLeftRight className="w-5 h-5" />}
            accentColor="emerald"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="budget" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="budget">Presupuesto</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
            <TabsTrigger value="comparison">Comparación</TabsTrigger>
          </TabsList>

          <TabsContent value="budget" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Presupuesto Personal</h3>
              {data.budgets.length === 0 ? (
                <div className="p-3 rounded-lg bg-zinc-900/50 text-sm text-zinc-500 border border-dashed border-zinc-800">
                  Sin presupuestos configurados.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.budgets.map((budget) => (
                    <BudgetProgress key={budget.category} budget={budget} />
                  ))}
                </div>
              )}
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Resumen Mensual</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                      <span className="text-sm text-zinc-400">Total Asignado</span>
                      <span className="text-lg font-semibold text-zinc-100">
                        ${data.budgets.reduce((sum, b) => sum + b.allocated, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                      <span className="text-sm text-zinc-400">Total Gastado</span>
                      <span className="text-lg font-semibold text-zinc-100">
                        ${data.budgets.reduce((sum, b) => sum + b.spent, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-600/10 border border-emerald-600/30">
                      <span className="text-sm text-emerald-400">Disponible</span>
                      <span className="text-lg font-semibold text-emerald-500">
                        ${data.budgets.reduce((sum, b) => sum + (b.allocated - b.spent), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Tasa de Ahorro</h3>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-blue-500 mb-2">
                  {derivedSavingsRate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-zinc-400">de tus ingresos</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Ahorro mensual</span>
                      <span className="text-zinc-100 font-semibold">
                    ${derivedMonthlySavings.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Historial de Transacciones</h3>
              <TransactionList transactions={data.transactions} />
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Comparación con Mes Anterior</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                    <div>
                      <div className="text-sm text-zinc-400 mb-1">Ingresos</div>
                      <div className="text-xl font-semibold text-zinc-100">
                        ${data.monthlyIncome.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-emerald-500">+5.2%</div>
                      <div className="text-xs text-zinc-500">vs mes anterior</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                    <div>
                      <div className="text-sm text-zinc-400 mb-1">Gastos</div>
                      <div className="text-xl font-semibold text-zinc-100">
                        ${data.monthlyExpenses.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-red-500">+1.8%</div>
                      <div className="text-xs text-zinc-500">vs mes anterior</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-blue-600/10 border border-blue-600/30">
                    <div>
                      <div className="text-sm text-blue-400 mb-1">Ahorro</div>
                      <div className="text-xl font-semibold text-blue-500">
                        ${(data.monthlyIncome - data.monthlyExpenses).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-emerald-500">+12.4%</div>
                      <div className="text-xs text-zinc-500">vs mes anterior</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Categorías con Mayor Cambio</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-600/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-200">Salud</span>
                      <span className="text-sm text-emerald-500">-30%</span>
                    </div>
                    <p className="text-xs text-zinc-500">Reducción en gastos médicos</p>
                  </div>

                  <div className="p-3 rounded-lg bg-red-600/10 border border-red-600/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-200">Entretenimiento</span>
                      <span className="text-sm text-red-500">+12%</span>
                    </div>
                    <p className="text-xs text-zinc-500">Incremento en suscripciones</p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-800/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-200">Transporte</span>
                      <span className="text-sm text-zinc-400">-2%</span>
                    </div>
                    <p className="text-xs text-zinc-500">Estable respecto al mes anterior</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
