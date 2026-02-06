import { useNavigate } from 'react-router';
import { useFinance } from '@/contexts/FinanceContext';
import { ContextType } from '@/types/finance';
import { User, Users, Home, LogOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function Header() {
  const navigate = useNavigate();
  const { activeContext, setActiveContext, users, userProfile, logout } = useFinance();

  const contexts: { id: ContextType; label: string; icon: React.ReactNode }[] = [
    { id: 'userA', label: users.userA, icon: <User className="w-4 h-4" /> },
    { id: 'userB', label: users.userB, icon: <User className="w-4 h-4" /> },
    { id: 'family', label: 'Familia', icon: <Users className="w-4 h-4" /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Obtener nombre del usuario actual desde Firebase
  const userName = userProfile?.name || userProfile?.email?.split('@')[0] || '';

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-zinc-400" />
            <h1 className="text-xl font-semibold text-zinc-100">FinanceOS</h1>
          </div>
          <div className="w-px h-6 bg-zinc-700 ml-2" />
          <span className="text-sm text-zinc-500">Sistema Operativo Financiero Personal</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Context Selector */}
          <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1">
            {contexts.map((context) => (
              <button
                key={context.id}
                onClick={() => setActiveContext(context.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                  transition-all duration-200
                  ${
                    activeContext === context.id
                      ? context.id === 'family'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }
                `}
              >
                {context.icon}
                <span>{context.label}</span>
              </button>
            ))}
          </div>

          {/* User & Logout */}
          <div className="flex items-center gap-3 pl-3 border-l border-zinc-700">
            {userName && (
              <span className="text-sm text-zinc-400">Hola, {userName}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
