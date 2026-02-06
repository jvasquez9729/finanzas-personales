import { Budget } from '@/types/finance';

interface BudgetProgressProps {
  budget: Budget;
}

export function BudgetProgress({ budget }: BudgetProgressProps) {
  const derivedPercentage =
    budget.allocated > 0 ? (budget.spent / budget.allocated) * 100 : 0;

  const getColorClass = (percentage: number) => {
    if (percentage >= 100) return 'text-red-500';
    if (percentage >= 80) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 80) return 'bg-amber-600';
    return 'bg-emerald-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-300 font-medium">{budget.category}</span>
        <span className={`font-semibold ${getColorClass(derivedPercentage)}`}>
          {derivedPercentage.toFixed(1)}%
        </span>
      </div>

      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getProgressColor(derivedPercentage)}`}
          style={{ width: `${Math.min(derivedPercentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          ${budget.spent.toLocaleString()} / ${budget.allocated.toLocaleString()}
        </span>
        <span>
          {budget.allocated - budget.spent >= 0
            ? `$${(budget.allocated - budget.spent).toLocaleString()} disponible`
            : `$${Math.abs(budget.allocated - budget.spent).toLocaleString()} excedido`}
        </span>
      </div>
    </div>
  );
}