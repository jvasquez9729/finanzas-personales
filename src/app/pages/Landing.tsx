import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  Shield,
  Users,
  BarChart3,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_LEDGER_API_URL || 'http://localhost:3001';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Wallet className="w-8 h-8" />,
    title: 'Control Total',
    description: 'Gestiona tus finanzas personales y familiares en un solo lugar con visibilidad completa.',
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'Análisis Inteligente',
    description: 'Visualiza tendencias, patrones de gasto y proyecciones para tomar mejores decisiones.',
  },
  {
    icon: <PiggyBank className="w-8 h-8" />,
    title: 'Metas de Ahorro',
    description: 'Define objetivos financieros y haz seguimiento de tu progreso hacia ellos.',
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Seguridad Primero',
    description: 'Tus datos están protegidos con encriptación y autenticación segura.',
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Finanzas Familiares',
    description: 'Comparte y gestiona gastos con tu pareja manteniendo cuentas personales separadas.',
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Reportes Detallados',
    description: 'Genera reportes mensuales y anuales para entender tu situación financiera.',
  },
];

export function Landing() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar token y datos del usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('households', JSON.stringify(data.households));
      
      if (data.households?.length > 0) {
        localStorage.setItem('householdId', data.households[0].id);
      }

      // Redirigir al dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-60 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>

        <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FinanzasApp</span>
          </div>
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Iniciar Sesión
          </Button>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero Text */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Gestión financiera inteligente</span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                Toma el control de tus{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                  finanzas
                </span>
              </h1>
              
              <p className="text-lg text-zinc-400 max-w-xl">
                Administra tus ingresos, gastos y ahorros de forma personal y familiar. 
                Visualiza tu progreso y alcanza tus metas financieras con herramientas inteligentes.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white px-8"
                  onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Comenzar Ahora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver Características
                </Button>
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-8 border-t border-zinc-800">
                <div>
                  <div className="text-3xl font-bold text-white">100%</div>
                  <div className="text-sm text-zinc-500">Privado y Seguro</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">24/7</div>
                  <div className="text-sm text-zinc-500">Acceso Total</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">∞</div>
                  <div className="text-sm text-zinc-500">Transacciones</div>
                </div>
              </div>
            </div>

            {/* Right: Login Card */}
            <div id="login-section" className="lg:pl-12">
              <Card className="bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-2xl">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl text-white">
                    {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    {isLogin
                      ? 'Ingresa tus credenciales para continuar'
                      : 'Completa el formulario para registrarte'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300">
                        Correo electrónico
                      </label>
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300">
                        Contraseña
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {isLogin && (
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white h-11"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : isLogin ? (
                        'Iniciar Sesión'
                      ) : (
                        'Crear Cuenta'
                      )}
                    </Button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-zinc-900 px-2 text-zinc-500">o</span>
                      </div>
                    </div>

                    <p className="text-center text-sm text-zinc-400">
                      {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(!isLogin);
                          setError('');
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                      >
                        {isLogin ? 'Regístrate' : 'Inicia sesión'}
                      </button>
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-24 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Todo lo que necesitas para tus finanzas
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Herramientas diseñadas para ayudarte a entender, controlar y hacer crecer tu dinero.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Comienza a tomar mejores decisiones financieras hoy
          </h2>
          <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
            Únete y descubre cómo una visión clara de tus finanzas puede transformar tu vida.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white px-12"
            onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Empezar Gratis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-zinc-400">© 2026 FinanzasApp. Todos los derechos reservados.</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Términos</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
