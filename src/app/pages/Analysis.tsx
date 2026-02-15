import { useMemo } from 'react';
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
  const { financialData, users, stats } = useFinance();

  // Calcular métricas derivadas de manera segura
  const efficiency = useMemo(() => {
    const income = stats.monthlyIncome || 0;
    const expenses = stats.monthlyExpenses || 0;
    return income > 0 ? (expenses / income) * 100 : 0;
  }, [stats.monthlyIncome, stats.monthlyExpenses]);

  const savingsRate = useMemo(() => {
    return stats.monthlyIncome > 0 
      ? ((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome) * 100 
      : 0;
  }, [stats.monthlyIncome, stats.monthlyExpenses]);

  const runway = useMemo(() => {
    return stats.monthlyExpenses > 0 
      ? stats.balance / stats.monthlyExpenses 
      : 0;
  }, [stats.balance, stats.monthlyExpenses]);

  // Datos de comparación simplificados
  const comparisonData = useMemo(() => [
    {
      metric: 'Ingresos',
      value: stats.monthlyIncome,
    },
    {
      metric: 'Gastos',
      value: stats.monthlyExpenses,
    },
    {
      metric: 'Ahorro',
      value: Math.max(0, stats.monthlyIncome - stats.monthlyExpenses),
    },
    {
      metric: 'Balance',
      value: stats.balance,
    },
  ], [stats]);

  // Datos de radar para perfil financiero
  const radarData = useMemo(() => [
    {
      subject: 'Ingresos',
      A: Math.min(100, (stats.monthlyIncome / 50000) * 100),
    },
    {
      subject: 'Ahorro',
      A: Math.max(0, savingsRate),
    },
    {
      subject: 'Liquidez',
      A: Math.min(100, (runway / 12) * 100),
    },
    {
      subject: 'Control',
      A: Math.max(0, 100 - efficiency),
    },
    {
      subject: 'Estabilidad',
      A: 75, // Valor simulado basado en consistencia de gastos
    },
  ], [stats, savingsRate, runway, efficiency]);

  // Generar datos de proyección dinámicamente
  const projectionData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = d.toLocaleDateString('es-ES', { month: 'short' });
      const baseIncome = stats.monthlyIncome;
      const baseExpenses = stats.monthlyExpenses;
      
      return {
        month,
        actual: i === 0 ? baseIncome - baseExpenses : null,
        optimista: baseIncome * 1.03 - baseExpenses * 0.95,
        conservador: baseIncome * 0.97 - baseExpenses * 1.05,
        proyectado: baseIncome - baseExpenses,
      };
    });
  }, [stats.monthlyIncome, stats.monthlyExpenses]);

  // Insights basados en datos reales
  const insights = useMemo(() => {
    const items = [];
    
    if (savingsRate > 20) {
      items.push({
        type: 'success' as const,
        title: 'Excelente tasa de ahorro',
        description: `Con ${savingsRate.toFixed(1)}% de tasa de ahorro, estás por encima del promedio recomendado del 20%.`,
      });
    } else if (savingsRate < 10) {
      items.push({
        type: 'warning' as const,
        title: 'Tasa de ahorro baja',
        description: `Tu tasa de ahorro es del ${savingsRate.toFixed(1)}%. Intenta reducir gastos para llegar al 20% recomendado.`,
      });
    }

    if (runway < 3) {
      items.push({
        type: 'warning' as const,
        title: 'Reserva de emergencia baja',
        description: `Tienes ${runway.toFixed(1)} meses de gastos cubiertos. Se recomienda tener al menos 6 meses.`,
      });
    } else if (runway > 6) {
      items.push({
        type: 'success' as const,
        title: 'Buena reserva de emergencia',
        description: `Tienes ${runway.toFixed(1)} meses de gastos cubiertos.`,
      });
    }

    if (efficiency > 90) {
      items.push({
        type: 'info' as const,
        title: 'Alto ratio gastos/ingresos',
        description: 'Estás gastando más del 90% de tus ingresos. Busca áreas para reducir gastos.',
      });
    }

    // Si no hay insights, agregar uno genérico
    if (items.length === 0) {
      items.push({
        type: 'info' as const,
        title: 'Sigue registrando tus transacciones',
        description: 'Con más datos podremos darte mejores recomendaciones personalizadas.',
      });
    }

    return items;
  }, [savingsRate, runway, efficiency]);

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
              Resumen Financiero
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
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Perfil Financiero
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" stroke="#71717a" style={{ fontSize: '12px' }} />
                <PolarRadiusAxis stroke="#71717a" />
                <Radar
                  name="Tu Perfil"
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
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

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Eficiencia del Gasto</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Ratio Gastos/Ingresos</span>
                  <span className="text-sm font-semibold text-blue-500">
                    {efficiency.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      efficiency > 90 ? 'bg-red-600' : efficiency > 70 ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                    style={{
                      width: `${Math.min(100, efficiency)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  {efficiency > 90 
                    ? '⚠️ Estás gastando más del 90% de tus ingresos'
                    : efficiency > 70
                    ? '✓ Buen control de gastos'
                    : '⭐ Excelente gestión financiera'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Capacidad de Ahorro</h3>
            <div className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-emerald-600/10">
                <div className="text-3xl font-bold text-emerald-500 mb-1">
                  {savingsRate.toFixed(1)}%
                </div>
                <div className="text-sm text-zinc-400">Tasa de Ahorro</div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 text-center">
                  {savingsRate >= 20 
                    ? '⭐ Estás ahorrando más del 20% recomendado'
                    : savingsRate >= 10
                    ? '✓ Bien, pero intenta llegar al 20%'
                    : '⚠️ Intenta aumentar tu tasa de ahorro'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Reserva de Emergencia</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <div className="text-2xl font-bold text-zinc-100 mb-1">
                  {runway.toFixed(1)} meses
                </div>
                <div className="text-sm text-zinc-400">De gastos cubiertos</div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <div className="text-center p-3 rounded-lg bg-emerald-600/10">
                  <div className="text-xl font-bold text-emerald-500 mb-1">
                    ${stats.balance.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-400">Balance Total</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
