import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Progress } from '@/app/components/ui/progress';
import { Loader2, Mail, Lock, User, Check, X } from 'lucide-react';

interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (password.length > 128) {
    errors.push('Máximo 128 caracteres');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una minúscula');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una mayúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Al menos un carácter especial');
  }
  
  // Contraseñas comunes
  const commonPasswords = ['password123', '12345678', 'qwerty123', 'abc12345', 'password1'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Contraseña demasiado común');
  }
  
  // Calcular fuerza
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  if (password.length >= 16) score += 10;
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 80) strength = 'strong';
  else if (score >= 50) strength = 'medium';
  
  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

export function Register() {
  const navigate = useNavigate();
  const { signUp, loading, error, clearError } = useFirebaseAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordValidation = useMemo(() => 
    validatePassword(formData.password),
    [formData.password]
  );

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-red-500';
    }
  };

  const getStrengthLabel = (strength: string) => {
    switch (strength) {
      case 'strong': return 'Fuerte';
      case 'medium': return 'Media';
      default: return 'Débil';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setPasswordError(null);

    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.errors[0]);
      return;
    }

    const result = await signUp(formData.email, formData.password, formData.name);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-zinc-100 text-center">
            Crear Cuenta
          </CardTitle>
          <CardDescription className="text-zinc-400 text-center">
            Regístrate para comenzar a gestionar tus finanzas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || passwordError) && (
              <Alert className="bg-red-950/50 border-red-800">
                <AlertDescription className="text-red-200">
                  {error || passwordError}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 pl-10 text-zinc-100"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
            </div>

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
                  maxLength={255}
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
                  minLength={8}
                  maxLength={128}
                />
              </div>
              
              {/* Indicador de fuerza de contraseña */}
              {formData.password && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Fuerza: {getStrengthLabel(passwordValidation.strength)}</span>
                    <span className={passwordValidation.valid ? 'text-emerald-400' : 'text-amber-400'}>
                      {passwordValidation.valid ? (
                        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Válida</span>
                      ) : (
                        <span className="flex items-center gap-1"><X className="w-3 h-3" /> Inválida</span>
                      )}
                    </span>
                  </div>
                  <Progress 
                    value={passwordValidation.score} 
                    className="h-1 bg-zinc-700"
                  />
                  <div className="text-xs text-zinc-500 space-y-1">
                    <p>Requisitos:</p>
                    <ul className="space-y-0.5 pl-4">
                      <li className={formData.password.length >= 8 ? 'text-emerald-400' : ''}>• Mínimo 8 caracteres</li>
                      <li className={/[a-z]/.test(formData.password) ? 'text-emerald-400' : ''}>• Una minúscula</li>
                      <li className={/[A-Z]/.test(formData.password) ? 'text-emerald-400' : ''}>• Una mayúscula</li>
                      <li className={/[0-9]/.test(formData.password) ? 'text-emerald-400' : ''}>• Un número</li>
                      <li className={/[^a-zA-Z0-9]/.test(formData.password) ? 'text-emerald-400' : ''}>• Un carácter especial</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-300">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 pl-10 text-zinc-100"
                  required
                />
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-400">Las contraseñas no coinciden</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || !passwordValidation.valid || formData.password !== formData.confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Inicia sesión aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
