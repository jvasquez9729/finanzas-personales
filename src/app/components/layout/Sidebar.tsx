import { Link, useLocation } from 'react-router';
import { LayoutDashboard, TrendingDown, TrendingUp, PiggyBank, Wallet, CalendarDays, BarChart3, Settings } from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard },
  { path: '/dashboard/gastos', label: 'Gastos', icon: TrendingDown },
  { path: '/dashboard/ingresos', label: 'Ingresos', icon: TrendingUp },
  { path: '/dashboard/presupuestos', label: 'Presupuestos', icon: Wallet },
  { path: '/dashboard/ahorros', label: 'Ahorros e Inversiones', icon: PiggyBank },
  { path: '/dashboard/calendario', label: 'Calendario', icon: CalendarDays },
  { path: '/dashboard/analisis', label: 'Análisis', icon: BarChart3 },
  { path: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500">
          <div className="mb-1">Última actualización:</div>
          <div className="text-zinc-400">{new Date().toLocaleDateString('es-MX', { dateStyle: 'medium' })}</div>
        </div>
      </div>
    </aside>
  );
}
