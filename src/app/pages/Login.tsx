import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { auth } from '@/lib/firebase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Loader2, Mail, Lock, AlertTriangle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signIn, loading, error, clearError } = useFirebaseAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showDebug, setShowDebug] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    console.log('=== DEBUG INFO ===');
    console.log('Auth initialized:', !!auth);
    console.log('Current URL:', window.location.href);
    console.log('Hostname:', window.location.hostname);
    
    const result = await signIn(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-zinc-100 text-center">
            Iniciar Sesión
          </CardTitle>
          <CardDescription className="text-zinc-400 text-center">
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="bg-red-950/50 border-red-800">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <AlertDescription className="text-red-200 whitespace-pre-line">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 pl-10 text-zinc-100"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 pl-10 text-zinc-100"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Regístrate aquí
            </Link>
          </div>

          {/* Debug info */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-zinc-600 hover:text-zinc-400"
            >
              {showDebug ? 'Ocultar' : 'Mostrar'} información de debug
            </button>
            
            {showDebug && (
              <div className="mt-2 p-3 bg-zinc-950 rounded text-xs text-zinc-500 font-mono">
                <p>Auth: {auth ? 'Inicializado' : 'No inicializado'}</p>
                <p>URL: {window.location.hostname}</p>
                <p>Domain: {window.location.origin}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
