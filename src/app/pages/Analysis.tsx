import { useFinance } from '@/contexts/FinanceContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { TrendingUp, Users, AlertCircle } from 'lucide-react';

export function Analysis() {
  const { financialData, users } = useFinance();

  const efficiency = {
    userA:
      financialData.userA.monthlyIncome > 0
        ? (financialData.userA.monthlyExpenses / financialData.userA.monthlyIncome) * 100
        : 0,
    userB:
      financialData.userB.monthlyIncome > 0
        ? (financialData.userB.monthlyExpenses / financialData.userB.monthlyIncome) * 100
        : 0,
  };

  // Comparación entre usuarios
  const comparisonData = [
    {
      metric: 'Ingresos',
      [users.userA]: financialData.userA.monthlyIncome,
      [users.userB]: financialData.userB.monthlyIncome,
    },
    {
      metric: 'Gastos',
      [users.userA]: financialData.userA.monthlyExpenses,
      [users.userB]: financialData.userB.monthlyExpenses,
    },
    {
      metric: 'Ahorro',
      [users.userA]: financialData.userA.monthlyIncome - financialData.userA.monthlyExpenses,
      [users.userB]: financialData.userB.monthlyIncome - financialData.userB.monthlyExpenses,
    },
    {
      metric: 'Patrimonio / 10',
      [users.userA]: financialData.userA.netWorth / 10,
      [users.userB]: financialData.userB.netWorth / 10,
    },
  ];

  // Datos de radar para comparación de perfil financiero
  const radarData = [
    {
      subject: 'Ingresos',
      [users.userA]: (financialData.userA.monthlyIncome / 50000) * 100,
      [users.userB]: (financialData.userB.monthlyIncome / 50000) * 100,
    },
    {
      subject: 'Ahorro',
      [users.userA]: financialData.userA.savingsRate,
      [users.userB]: financialData.userB.savingsRate,
    },
    {
      subject: 'Liquidez',
      [users.userA]: (financialData.userA.liquidityRunway / 12) * 100,
      [users.userB]: (financialData.userB.liquidityRunway / 12) * 100,
    },
    {
      subject: 'Estabilidad',
      [users.userA]: 100 - financialData.userA.expenseVolatility * 5,
      [users.userB]: 100 - financialData.userB.expenseVolatility * 5,
    },
    {
      subject: 'Control',
      [users.userA]: 85,
      [users.userB]: 92,
    },
  ];

  // Proyección 6 meses
  const projectionData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(2026, 1 + i, 1).toLocaleDateString('es-ES', { month: 'short' });
    const baseIncome = financialData.family.monthlyIncome;
    const baseExpenses = financialData.family.monthlyExpenses;
    
    return {
      month,
      actual: i === 0 ? baseIncome - baseExpenses : null,
      optimista: baseIncome * 1.03 - baseExpenses * 0.95,
      conservador: baseIncome * 0.97 - baseExpenses * 1.05,
      proyectado: baseIncome - baseExpenses,
    };
  });

  // Insights y recomendaciones
  const insights = [
    {
      type: 'success',
      title: 'Excelente tasa de ahorro familiar',
      description: `Con ${financialData.family.savingsRate.toFixed(1)}% de tasa de ahorro, están por encima del promedio nacional.`,
    },
    {
      type: 'warning',
      title: 'Volatilidad en gastos de entretenimiento',
      description: 'Se detectó variación del 15% en esta categoría. Considera establecer un límite fijo.',
    },
    {
      type: 'info',
      title: 'Oportunidad de optimización',
      description: 'Al reducir gastos en 5%, podrían alcanzar la meta de vacaciones 2 meses antes.',
    },
    {
      type: 'success',
      title: 'Distribución de aportes equilibrada',
      description: 'Las contribuciones individuales están balanceadas según los ingresos de cada uno.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100 mb-2">Análisis e Insights</h1>
          <p className="text-zinc-400">
            Comparativas, tendencias y proyecciones financieras
          </p>
        </div>

        {/* Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                insight.type === 'success'
                  ? 'bg-emerald-600/10 border-emerald-600/30'
                  : insight.type === 'warning'
                  ? 'bg-amber-600/10 border-amber-600/30'
                  : 'bg-blue-600/10 border-blue-600/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 ${
                    insight.type === 'success'
                      ? 'text-emerald-500'
                      : insight.type === 'warning'
                      ? 'text-amber-500'
                      : 'text-blue-500'
                  }`}
                >
                  {insight.type === 'warning' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <TrendingUp className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-zinc-200 mb-1">{insight.title}</h4>
                  <p className="text-sm text-zinc-400">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Comparison */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Comparación Individual
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="metric" stroke="#71717a" style={{ fontSize: '12px' }} />
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
                <Bar dataKey={users.userA} fill="#3b82f6" />
                <Bar dataKey={users.userB} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Perfil Financiero Comparado
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" stroke="#71717a" style={{ fontSize: '12px' }} />
                <PolarRadiusAxis stroke="#71717a" />
                <Radar
                  name={users.userA}
                  dataKey={users.userA}
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
                <Radar
                  name={users.userB}
                  dataKey={users.userB}
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Projection */}
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100">Proyección Financiera (6 meses)</h3>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-zinc-400">Familia</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" style={{ fontSize: '12px' }} />
              <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `$${value?.toLocaleString()}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#71717a"
                strokeWidth={3}
                name="Actual"
                dot={{ fill: '#71717a', r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="proyectado"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Proyectado"
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="optimista"
                stroke="#10b981"
                strokeWidth={2}
                name="Escenario Optimista"
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="conservador"
                stroke="#ef4444"
                strokeWidth={2}
                name="Escenario Conservador"
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Eficiencia del Gasto</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">{users.userA}</span>
                  <span className="text-sm font-semibold text-blue-500">
                    {efficiency.userA.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${efficiency.userA}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">{users.userB}</span>
                  <span className="text-sm font-semibold text-emerald-500">
                    {efficiency.userB.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{
                      width: `${efficiency.userB}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Menor porcentaje indica mejor eficiencia en el manejo de recursos
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Capacidad de Ahorro</h3>
            <div className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-blue-600/10">
                <div className="text-3xl font-bold text-blue-500 mb-1">
                  {financialData.userA.savingsRate.toFixed(1)}%
                </div>
                <div className="text-sm text-zinc-400">{users.userA}</div>
              </div>

              <div className="text-center p-4 rounded-lg bg-emerald-600/10">
                <div className="text-3xl font-bold text-emerald-500 mb-1">
                  {financialData.userB.savingsRate.toFixed(1)}%
                </div>
                <div className="text-sm text-zinc-400">{users.userB}</div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 text-center">
                  {financialData.userB.savingsRate > financialData.userA.savingsRate
                    ? `${users.userB} ahorra ${(financialData.userB.savingsRate - financialData.userA.savingsRate).toFixed(1)}% más`
                    : `${users.userA} ahorra ${(financialData.userA.savingsRate - financialData.userB.savingsRate).toFixed(1)}% más`}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Runway Comparado</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <div className="text-2xl font-bold text-zinc-100 mb-1">
                  {financialData.userA.liquidityRunway.toFixed(1)} meses
                </div>
                <div className="text-sm text-zinc-400">{users.userA}</div>
              </div>

              <div className="p-4 rounded-lg bg-zinc-800/50">
                <div className="text-2xl font-bold text-zinc-100 mb-1">
                  {financialData.userB.liquidityRunway.toFixed(1)} meses
                </div>
                <div className="text-sm text-zinc-400">{users.userB}</div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <div className="text-center p-3 rounded-lg bg-emerald-600/10">
                  <div className="text-xl font-bold text-emerald-500 mb-1">
                    {financialData.family.liquidityRunway.toFixed(1)} meses
                  </div>
                  <div className="text-xs text-zinc-400">Runway Familiar</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
