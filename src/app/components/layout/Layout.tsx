import { Outlet } from 'react-router';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { FinanceProvider } from '@/contexts/FinanceContext';
import { Toaster } from '@/app/components/ui/sonner';

export function Layout() {
  return (
    <FinanceProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <Outlet />
        </div>
        <Toaster position="bottom-right" theme="dark" />
      </div>
    </FinanceProvider>
  );
}
