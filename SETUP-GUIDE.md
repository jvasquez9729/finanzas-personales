# 🚀 Guía de Instalación - Firebase Auth + PostgreSQL

Esta guía te lleva paso a paso para configurar el proyecto con la arquitectura híbrida.

## 📋 Requisitos Previos

- **Node.js** 18+ ([Descargar](https://nodejs.org/))
- **PostgreSQL** 14+ ([Descargar](https://www.postgresql.org/download/))
- **Cuenta Firebase** ([Crear](https://firebase.google.com/))

---

## 1️⃣ Clonar y Preparar

```bash
# Si clonas fresco
git clone https://github.com/jvasquez9729/finanzas-personales.git
cd finanzas-personales

# Instalar dependencias frontend
npm install

# Instalar dependencias backend
cd server
npm install
cd ..
```

---

## 2️⃣ Configurar Firebase

### Descargar Service Account

1. Ve a [Firebase Console > Project Settings > Service Accounts](https://console.firebase.google.com/project/_/settings/serviceaccounts)
2. Click **"Generate new private key"**
3. Guarda el archivo como `server/firebase-service-account.json`

⚠️ **IMPORTANTE**: Este archivo contiene claves privadas. Nunca lo subas a git.

### Configurar Frontend

Crea archivo `.env` en la raíz:

```bash
# Copiar desde ejemplo
cp .env.example .env
```

Edita `.env` con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key_real
VITE_FIREBASE_AUTH_DOMAIN=app-finperson.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=app-finperson
VITE_FIREBASE_STORAGE_BUCKET=app-finperson.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=632129976580
VITE_FIREBASE_APP_ID=1:632129976580:web:xxxxxx
```

---

## 3️⃣ Configurar PostgreSQL

### Opción A: Instalación Local

1. Instala PostgreSQL desde https://www.postgresql.org/download/
2. Crea base de datos:
   ```sql
   CREATE DATABASE finanzas;
   ```

### Opción B: Docker

```bash
docker run -d \
  --name postgres-finanzas \
  -e POSTGRES_PASSWORD=tu_password_seguro \
  -e POSTGRES_DB=finanzas \
  -p 5432:5432 \
  postgres:15
```

### Configurar Backend

Crea archivo `server/.env`:

```bash
cd server
cp .env.example .env
```

Edita `server/.env`:

```env
# PostgreSQL
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/finanzas

# Firebase (para backend)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Servidor
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
LEDGER_WRITE_ENABLED=true
NODE_ENV=development
```

---

## 4️⃣ Ejecutar Migraciones

### Opción A: Script PowerShell (Windows)

```powershell
# Ejecutar como Administrador
cd scripts
.\setup-postgres.ps1 -DatabaseUrl "postgresql://postgres:tu_password@localhost:5432/finanzas"
```

### Opción B: Manual (cualquier sistema)

```bash
# Conectar a PostgreSQL
psql postgresql://postgres:tu_password@localhost:5432/finanzas

# Ejecutar migraciones en ORDEN
\i supabase/migrations/20260200120000_local_auth_schema.sql
\i supabase/migrations/20260201120000_ledger.sql
\i supabase/migrations/20260202120000_audit.sql
\i supabase/migrations/20260203120000_analytics.sql
\i supabase/migrations/20260204120000_monthly_close.sql
\i supabase/migrations/20260205120000_alerts.sql
\i supabase/migrations/20260206120000_auth_password.sql
\i supabase/migrations/20260207120000_security_and_budgets.sql

# Verificar
\dt app.*
```

Deberías ver estas tablas:
- `app.accounts`
- `app.audit_log`
- `app.budgets`
- `app.household_members`
- `app.households`
- `app.ledger_entries`
- `app.security_logs`
- `app.transactions`
- `app.users`

---

## 5️⃣ Iniciar Servicios

### Terminal 1: Backend

```bash
cd server
npm run dev
```

Debería mostrar:
```
✅ Firebase Admin inicializado
✅ Ledger API running on http://localhost:3001
📊 Health check: http://localhost:3001/make-server-d3c93e65/health
🔧 Environment: development
🔐 Auth: Firebase Auth
```

Prueba el health check:
```bash
curl http://localhost:3001/make-server-d3c93e65/health
```

### Terminal 2: Frontend

```bash
# En la raíz del proyecto
npm run dev
```

---

## 6️⃣ Configurar Primer Usuario

### Paso 1: Registrar en Frontend

1. Abre http://localhost:5173
2. Ve a "Crear Cuenta"
3. Regístrate con email y contraseña

### Paso 2: Obtener UID

Abre consola del navegador (F12) y ejecuta:

```javascript
// Obtener el UID del usuario actual
firebase.auth().currentUser.uid
```

Copia ese UID.

### Paso 3: Sincronizar con PostgreSQL

```bash
cd scripts
node sync-firebase-user.js <UID> tu@email.com "Tu Nombre"
```

Ejemplo:
```bash
node sync-firebase-user.js abc123xyz usuario@email.com "Juan Pérez"
```

Esto creará:
- Usuario en PostgreSQL
- Household por defecto
- Cuentas bancarias iniciales

### Paso 4: Obtener Household ID

El script mostrará algo como:
```
🎉 Usuario sincronizado exitosamente!
   UID: abc123xyz
   Household: xyz789abc
```

Copia ese **Household ID** para usarlo en las peticiones API.

---

## 7️⃣ Probar API

### Obtener Token de Firebase

En la consola del navegador:

```javascript
// Obtener token ID
await firebase.auth().currentUser.getIdToken()
```

### Probar Endpoints

```bash
# Guardar token en variable
TOKEN="eyJhbGciOiJSUzI1NiIs..."
HOUSEHOLD_ID="xyz789abc"

# Listar cuentas
curl http://localhost:3001/ledger/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-household-id: $HOUSEHOLD_ID"

# Ver balances
curl http://localhost:3001/ledger/balances \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-household-id: $HOUSEHOLD_ID"

# Crear transacción
curl -X POST http://localhost:3001/ledger/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-household-id: $HOUSEHOLD_ID" \
  -d '{
    "household_id": "xyz789abc",
    "occurred_at": "2025-02-14T10:00:00Z",
    "description": "Compra supermercado",
    "entries": [
      {
        "account_id": "uuid-cuenta-efectivo",
        "direction": "credit",
        "amount_minor": 50000,
        "currency": "MXN"
      },
      {
        "account_id": "uuid-cuenta-gastos",
        "direction": "debit",
        "amount_minor": 50000,
        "currency": "MXN"
      }
    ]
  }'
```

---

## 8️⃣ Solución de Problemas

### Error: "Firebase Admin no configurado"

Asegúrate de tener `server/firebase-service-account.json`.

### Error: "Cannot connect to PostgreSQL"

Verifica:
1. PostgreSQL está corriendo: `pg_isready`
2. DATABASE_URL es correcto
3. Contraseña es correcta
4. Base de datos `finanzas` existe

### Error: "User not found in PostgreSQL"

Ejecuta el script de sincronización:
```bash
node scripts/sync-firebase-user.js <UID>
```

### Error: "Not member of household"

El usuario no tiene un household asignado. Ejecuta:
```bash
node scripts/sync-firebase-user.js <UID>
```

Y usa el household ID que muestra.

---

## 📚 Documentación Adicional

- `README-FIREBASE-INTEGRATION.md` - Detalles técnicos de integración
- `SECURITY_FIXES.md` - Guía de seguridad
- `CORRECTIONS_SUMMARY.md` - Resumen de correcciones

---

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando con:
- ✅ Frontend en http://localhost:5173
- ✅ Backend en http://localhost:3001
- ✅ Firebase Auth para login
- ✅ PostgreSQL para datos financieros

¿Problemas? Revisa los logs del backend en la terminal.
