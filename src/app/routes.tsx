import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Layout } from '@/app/components/layout/Layout';
import { Landing } from '@/app/pages/Landing';
import { Login } from '@/app/pages/Login';
import { Register } from '@/app/pages/Register';
import { Dashboard } from '@/app/pages/Dashboard';
import { Expenses } from '@/app/pages/Expenses';
import { Income } from '@/app/pages/Income';
import { Savings } from '@/app/pages/Savings';
import { Budgets } from '@/app/pages/Budgets';
import { Calendar } from '@/app/pages/Calendar';
import { Analysis } from '@/app/pages/Analysis';
import { Settings } from '@/app/pages/Settings';
import { Debug } from '@/app/pages/Debug';

// Componente wrapper para proteger rutas
function ProtectedRoute() {
  const { isAuthenticated, loading } = useFirebaseAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
}

// Componente wrapper para redirigir si ya está autenticado
function PublicRoute() {
  const { isAuthenticated, loading } = useFirebaseAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
    ],
  },
  {
    path: '/debug',
    element: <Debug />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'gastos', element: <Expenses /> },
          { path: 'ingresos', element: <Income /> },
          { path: 'presupuestos', element: <Budgets /> },
          { path: 'ahorros', element: <Savings /> },
          { path: 'calendario', element: <Calendar /> },
          { path: 'analisis', element: <Analysis /> },
          { path: 'configuracion', element: <Settings /> },
        ],
      },
    ],
  },
]);
