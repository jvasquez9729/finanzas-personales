import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { AlertCircle, Check, Bell, Shield, DollarSign } from 'lucide-react';
import { Switch } from '@/app/components/ui/switch';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';

export function Settings() {
  const { users } = useFinance();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState(true);
  
  const handleSave = () => {
    toast.success('Configuración guardada exitosamente');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100 mb-2">Configuración</h1>
          <p className="text-zinc-400">
            Gestiona las reglas de presupuesto y preferencias del sistema
          </p>
        </div>

        {/* Budget Rules */}
        <div className="space-y-6">
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-zinc-100">Reglas de Presupuesto</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personal-limit" className="text-zinc-300">
                    Límite de Gasto Personal Mensual ({users.userA})
                  </Label>
                  <Input
                    id="personal-limit"
                    type="number"
                    placeholder="30000"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personal-limit-b" className="text-zinc-300">
                    Límite de Gasto Personal Mensual ({users.userB})
                  </Label>
                  <Input
                    id="personal-limit-b"
                    type="number"
                    placeholder="25000"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="family-limit" className="text-zinc-300">
                  Límite de Gasto Familiar Mensual
                </Label>
                <Input
                  id="family-limit"
                  type="number"
                  placeholder="70000"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <p className="text-sm text-zinc-500 mb-3">Categorías de Presupuesto</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'Vivienda',
                    'Transporte',
                    'Alimentación',
                    'Salud',
                    'Entretenimiento',
                    'Educación',
                  ].map((category) => (
                    <div key={category} className="flex items-center gap-2 p-2 rounded bg-zinc-800/50">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-zinc-300">{category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Alert Thresholds */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-zinc-100">Umbrales de Alerta</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200 mb-1">
                    Alertas de Presupuesto
                  </div>
                  <div className="text-xs text-zinc-500">
                    Notificar cuando se alcance el 80% del presupuesto
                  </div>
                </div>
                <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warning-threshold" className="text-zinc-300">
                    Umbral de Advertencia (%)
                  </Label>
                  <Input
                    id="warning-threshold"
                    type="number"
                    placeholder="80"
                    defaultValue="80"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="critical-threshold" className="text-zinc-300">
                    Umbral Crítico (%)
                  </Label>
                  <Input
                    id="critical-threshold"
                    type="number"
                    placeholder="95"
                    defaultValue="95"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-start gap-2 text-sm text-zinc-500">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-500" />
                <p>
                  Las alertas se compartirán con ambos administradores financieros
                </p>
              </div>
            </div>
          </div>

          {/* Reports */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-zinc-100">Reportes y Notificaciones</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200 mb-1">
                    Reporte Semanal
                  </div>
                  <div className="text-xs text-zinc-500">
                    Resumen de gastos y transacciones cada domingo
                  </div>
                </div>
                <Switch checked={weeklyReports} onCheckedChange={setWeeklyReports} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200 mb-1">
                    Reporte Mensual
                  </div>
                  <div className="text-xs text-zinc-500">
                    Análisis completo el primer día de cada mes
                  </div>
                </div>
                <Switch checked={monthlyReports} onCheckedChange={setMonthlyReports} />
              </div>
            </div>
          </div>

          {/* Family Settings */}
          <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-zinc-100">Configuración Familiar</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-600/10 border border-amber-600/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-200 mb-1">
                      Confirmación de Cambios Importantes
                    </h4>
                    <p className="text-xs text-amber-300/80 mb-3">
                      Los cambios que afecten las finanzas familiares requieren confirmación explícita
                      de ambos administradores.
                    </p>
                    <ul className="text-xs text-amber-300/80 space-y-1 ml-4">
                      <li>• Modificación de presupuestos familiares superiores a $5,000</li>
                      <li>• Cambios en objetivos financieros compartidos</li>
                      <li>• Transferencias mayores a $10,000</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-200 mb-1">
                    Usuarios Activos
                  </div>
                  <div className="text-xs text-zinc-500">
                    {users.userA} y {users.userB} - Rol: Administrador
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-500">Activos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-600/30 text-red-500 hover:bg-red-600/10">
                  Restablecer Configuración
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-zinc-100">¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    Esta acción restablecerá todas las configuraciones a sus valores predeterminados.
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white">
                    Restablecer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Guardar Cambios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
