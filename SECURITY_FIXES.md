# 🔒 Correcciones de Seguridad Aplicadas

## Resumen de Cambios

Este documento detalla todas las correcciones de seguridad aplicadas al proyecto.

---

## 🚨 ACCIONES INMEDIATAS REQUERIDAS

### 1. Rotar Credenciales de Firebase (URGENTE)

Las credenciales de Firebase estaban expuestas en el código fuente. **Debes rotarlas inmediatamente:**

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/project/app-finperson/settings/general/web)
2. En "Tus apps", selecciona la app web
3. Elimina la configuración actual y crea una nueva
4. Actualiza las variables en tu archivo `.env` local

### 2. Cambiar Contraseña de PostgreSQL

```bash
# Conéctate a PostgreSQL y cambia la contraseña
ALTER USER postgres WITH PASSWORD 'nueva_contraseña_segura_aleatoria';
```

### 3. Generar Nuevo JWT_SECRET

```bash
# Ejecuta este comando en tu terminal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copia el resultado a server/.env
```

---

## ✅ Cambios Aplicados

### Frontend

#### 1. Variables de Entorno para Firebase
**Archivo:** `src/lib/firebase.ts`
- ✅ Firebase config ahora usa variables de entorno
- ✅ Validación de variables requeridas
- ✅ Error claro si faltan variables

#### 2. Corrección de Doble Provider
**Archivo:** `src/app/components/layout/Layout.tsx`
- ✅ Eliminado FinanceProvider duplicado
- ✅ Solo se renderiza una vez en main.tsx

#### 3. Memory Leak en Firestore
**Archivo:** `src/hooks/useFirestoreTransactions.ts`
- ✅ Agregada bandera `isMounted`
- ✅ Cancelación correcta del listener

#### 4. Generación de IDs Seguros
**Archivo:** `src/lib/utils.ts` (nuevo)
- ✅ Función `generateId()` usando `crypto.randomUUID()`
- ✅ Fallback seguro para entornos sin crypto

#### 5. Corrección de Analysis.tsx
**Archivo:** `src/app/pages/Analysis.tsx`
- ✅ Reescrito para usar datos correctos del contexto
- ✅ Cálculos con useMemo para performance
- ✅ Datos dinámicos basados en transacciones reales

#### 6. Hooks Corregidos
**Archivos:** 
- `src/hooks/useTransactions.ts`
- `src/hooks/useBudgets.ts`
- ✅ Usan `generateId` seguro
- ✅ Corrección de bugs (ej: `budget.category` → `b.category`)

### Backend

#### 1. Configuración Centralizada
**Archivo:** `server/src/config.ts` (nuevo)
- ✅ Validación de variables de entorno con Zod
- ✅ Verificación de JWT_SECRET seguro
- ✅ Advertencias para configuraciones inseguras

#### 2. Rate Limiting
**Archivo:** `server/src/index.ts`
- ✅ Rate limiting en `/auth/login` (5 intentos / 15 min)
- ✅ Rate limiting general en API (100 requests / min)
- ✅ Headers estándar para rate limiting

#### 3. Validación de Inputs
**Archivo:** `server/src/validators.ts` (nuevo)
- ✅ Schemas Zod para login, transacciones, ledger entries
- ✅ Validación de email, password, UUIDs
- ✅ Mensajes de error en español

#### 4. Headers de Seguridad
**Archivo:** `server/src/index.ts`
- ✅ CORS configurado de forma segura
- ✅ Validación de orígenes permitidos
- ✅ Solo HTTPS en producción

#### 5. Manejo de Errores Mejorado
**Archivo:** `server/src/index.ts`
- ✅ No expone stack traces en producción
- ✅ Request ID en todas las respuestas de error
- ✅ Logging condicional según entorno

#### 6. Health Check con DB
**Archivo:** `server/src/db.ts`
- ✅ Health check verifica conexión a PostgreSQL
- ✅ Timeouts configurados para queries
- ✅ Validación de DATABASE_URL

#### 7. Autentificación Mejorada
**Archivo:** `server/src/auth.ts` y `server/src/auth-routes.ts`
- ✅ JWT con issuer y audience
- ✅ Expiración reducida a 24h
- ✅ Prevención de timing attacks en login
- ✅ Logging de eventos de seguridad
- ✅ Validación de UUID para household_id

### Base de Datos

#### 1. Nuevas Migraciones
**Archivo:** `supabase/migrations/20260207120000_security_and_budgets.sql`
- ✅ Políticas UPDATE/DELETE para transactions
- ✅ Política mejorada para accounts (filtra personales)
- ✅ Tabla de presupuestos (budgets) con RLS
- ✅ Tabla de logs de seguridad
- ✅ Función RPC atómica para crear transacciones
- ✅ Función para calcular gasto vs presupuesto

#### 2. Índices Optimizados
- ✅ Índice para ledger entries por cuenta y fecha
- ✅ Índice para transacciones con INCLUDE
- ✅ Índice para external_ref

---

## 📋 Checklist Pre-Despliegue

### Seguridad
- [ ] Rotar API keys de Firebase
- [ ] Rotar contraseña de PostgreSQL
- [ ] Generar JWT_SECRET seguro (64+ chars)
- [ ] Configurar ALLOWED_ORIGINS correctamente
- [ ] Habilitar restricciones de dominio en Firebase

### Base de Datos
- [ ] Ejecutar migraciones nuevas:
  ```bash
  # En Supabase SQL Editor o psql
  \i supabase/migrations/20260207120000_security_and_budgets.sql
  ```

### Backend
- [ ] Instalar dependencias:
  ```bash
  cd server
  npm install
  ```
- [ ] Configurar variables de entorno
- [ ] Probar health check: `GET /make-server-d3c93e65/health`

### Frontend
- [ ] Crear archivo `.env` basado en `.env.example`
- [ ] Instalar dependencias:
  ```bash
  npm install
  ```
- [ ] Verificar que Firebase carga correctamente

---

## 🔧 Variables de Entorno Requeridas

### Frontend (.env)
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Backend (server/.env)
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=genera_con_node_crypto_randomBytes_64
PORT=3001
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
LEDGER_WRITE_ENABLED=true
NODE_ENV=production
```

---

## 🧪 Testing

### Backend
```bash
cd server
npm run dev

# Test health check
curl http://localhost:3001/make-server-d3c93e65/health

# Test login con rate limiting
for i in {1..6}; do curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}'; done
```

### Frontend
```bash
npm run dev

# Verificar que no hay errores en consola
# Navegar a /analysis y verificar que carga correctamente
```

---

## 📝 Notas

1. **NO hagas commit de archivos `.env`** - Ya están en `.gitignore`
2. **Rota las credenciales inmediatamente** - Las antiguas están en el historial de git
3. **Configura Firebase Auth Domain Restrictions** - Para prevenir uso no autorizado
4. **Monitorea los logs de seguridad** - Revisa `app.security_logs` regularmente

---

## 📞 Soporte

Si encuentras problemas después de aplicar estos cambios:

1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Comprueba la conexión a la base de datos
4. Revisa la consola del navegador para errores de Firebase
