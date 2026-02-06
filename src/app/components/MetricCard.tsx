import { ArrowUp, ArrowDown, TrendingUp, Info } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/app/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  icon?: React.ReactNode;
  hoverContent?: React.ReactNode;
  detailContent?: React.ReactNode;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'red';
}

export function MetricCard({
  title,
  value,
  change,
  trend,
  subtitle,
  icon,
  hoverContent,
  detailContent,
  accentColor = 'blue',
}: MetricCardProps) {
  const accentColors = {
    blue: 'border-blue-600/50 bg-blue-600/5',
    emerald: 'border-emerald-600/50 bg-emerald-600/5',
    amber: 'border-amber-600/50 bg-amber-600/5',
    red: 'border-red-600/50 bg-red-600/5',
  };

  const card = (
    <div
      className={`
        relative p-6 rounded-lg border bg-zinc-900
        transition-all duration-200
        hover:border-zinc-700 hover:shadow-lg
        ${detailContent ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <div className="text-zinc-400">{icon}</div>}
          <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
        </div>
        {hoverContent && (
          <HoverCard>
            <HoverCardTrigger>
              <Info className="w-4 h-4 text-zinc-600 hover:text-zinc-400 transition-colors" />
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-80 bg-zinc-900 border-zinc-800">
              {hoverContent}
            </HoverCardContent>
          </HoverCard>
        )}
      </div>

      <div className="mb-2">
        <div className="text-3xl font-semibold text-zinc-100">{value}</div>
      </div>

      {(change !== undefined || subtitle) && (
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 text-sm ${
                trend === 'up'
                  ? 'text-emerald-500'
                  : trend === 'down'
                  ? 'text-red-500'
                  : 'text-zinc-500'
              }`}
            >
              {trend === 'up' && <ArrowUp className="w-4 h-4" />}
              {trend === 'down' && <ArrowDown className="w-4 h-4" />}
              {trend === 'neutral' && <TrendingUp className="w-4 h-4" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
          {subtitle && <span className="text-sm text-zinc-500">{subtitle}</span>}
        </div>
      )}

      {detailContent && (
        <div className={`absolute top-0 right-0 w-1 h-full rounded-r-lg ${accentColors[accentColor]}`} />
      )}
    </div>
  );

  if (detailContent) {
    return (
      <Dialog>
        <DialogTrigger asChild>{card}</DialogTrigger>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">{title}</DialogTitle>
          </DialogHeader>
          {detailContent}
        </DialogContent>
      </Dialog>
    );
  }

  return card;
}
