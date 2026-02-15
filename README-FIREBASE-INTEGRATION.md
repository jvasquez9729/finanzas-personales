# 🔥 Integración Firebase Auth + PostgreSQL

Esta guía configura la arquitectura híbrida: Firebase Authentication + Backend PostgreSQL.

## Arquitectura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │──────▶ Firebase Auth│      │  PostgreSQL │
│   (React)   │      │  (Tokens)    │      │   (Datos)   │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │                    ▲
       │                     │                    │
       │              ┌──────▼──────┐            │
       │              │   Backend   │────────────┘
       └──────────────▶   (Node)    │
                      │  (Valida    │
                      │   Tokens)   │
                      └─────────────┘
```

## 1. Configuración Inicial

### 1.1 Variables de Entorno Backend

Crea `server/.env`:

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://user:password@host:port/finanzas

# ============================================
# FIREBASE AUTH (Opción B)
# ============================================
# Ya NO usamos JWT_SECRET propio, usamos Firebase
# Descarga el service account desde Firebase Console > Project Settings > Service Accounts
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# ============================================
# SERVER CONFIG
# ============================================
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
LEDGER_WRITE_ENABLED=true
NODE_ENV=development
```

### 1.2 Descargar Service Account de Firebase

1. Ve a [Firebase Console > Project Settings > Service Accounts](https://console.firebase.google.com/project/app-finperson/settings/serviceaccounts)
2. Click "Generate new private key"
3. Guarda el archivo como `server/firebase-service-account.json`
4. **NUNCA** subas este archivo a git (ya está en .gitignore)

## 2. Ejecutar Migraciones PostgreSQL

### Opción A: Script PowerShell (Windows)

```powershell
# Ejecutar como Administrador
cd scripts
.\setup-postgres.ps1 -DatabaseUrl "postgresql://postgres:tu_password@localhost:5432/finanzas"
```

### Opción B: Manual con psql

```bash
# Conectar a PostgreSQL
psql postgresql://user:password@host:port/finanzas

# Ejecutar migraciones en orden
\i supabase/migrations/20260200120000_local_auth_schema.sql
\i supabase/migrations/20260201120000_ledger.sql
\i supabase/migrations/20260202120000_audit.sql
\i supabase/migrations/20260203120000_analytics.sql
\i supabase/migrations/20260204120000_monthly_close.sql
\i supabase/migrations/20260205120000_alerts.sql
\i supabase/migrations/20260206120000_auth_password.sql
\i supabase/migrations/20260207120000_security_and_budgets.sql
```

### Opción C: Usando Docker

```bash
# Si tienes PostgreSQL en Docker
docker exec -i your-postgres-container psql -U postgres -d finanzas < supabase/migrations/20260200120000_local_auth_schema.sql
# ... repetir para cada migración
```

## 3. Sincronización Firebase Auth ↔ PostgreSQL

### 3.1 Opción A: Cloud Function (Recomendado)

Crea una Cloud Function que se ejecute cuando un usuario se registre:

```javascript
// functions/index.js (en proyecto Firebase)
const functions = require('firebase-functions');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: functions.config().postgres.url,
});

exports.syncUserToPostgres = functions.auth.user().onCreate(async (user) => {
  const client = await pool.connect();
  try {
    // Insertar en auth.users (stub)
    await client.query(
      'INSERT INTO auth.users (id) VALUES ($1) ON CONFLICT DO NOTHING',
      [user.uid]
    );
    
    // Insertar en app.users
    await client.query(
      `INSERT INTO app.users (id, name, email, status) 
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (id) DO UPDATE 
       SET name = EXCLUDED.name, email = EXCLUDED.email`,
      [user.uid, user.displayName || user.email.split('@')[0], user.email]
    );
    
    console.log(`Usuario sincronizado: ${user.uid}`);
  } finally {
    client.release();
  }
});
```

### 3.2 Opción B: Sincronización Manual (Para desarrollo)

```bash
# Después de registrar un usuario en Firebase Auth, ejecútalo manualmente:
node scripts/sync-firebase-user.js <USER_UID>
```

### 3.3 Opción C: Sincronización en el Backend (Más simple)

El backend crea el usuario automáticamente en PostgreSQL la primera vez que se autentica (ya implementado en el código corregido).

## 4. Verificar Instalación

### 4.1 Verificar Tablas Creadas

```sql
-- Conectar a PostgreSQL y ejecutar:
\dt app.*

-- Deberías ver:
-- app.accounts
-- app.audit_log
-- app.budgets
-- app.household_members
-- app.households
-- app.ledger_entries
-- app.security_logs
-- app.transactions
-- app.users
```

### 4.2 Verificar RLS Policies

```sql
-- Ver políticas de seguridad
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'app';
```

### 4.3 Probar Backend

```bash
cd server
npm install
npm run dev

# En otra terminal
curl http://localhost:3001/make-server-d3c93e65/health
# Debería retornar: {"status":"ok","database":"connected"}
```

## 5. Configuración Frontend

### 5.1 Variables de Entorno

Asegúrate de tener `.env`:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=app-finperson.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=app-finperson
VITE_FIREBASE_STORAGE_BUCKET=app-finperson.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=632129976580
VITE_FIREBASE_APP_ID=1:632129976580:web:xxxx

# URL del backend
VITE_API_URL=http://localhost:3001
```

### 5.2 Flujo de Autenticación

```typescript
// El frontend usa Firebase Auth para login
const { user } = await signInWithEmailAndPassword(auth, email, password);

// Obtiene el token ID de Firebase
const idToken = await user.getIdToken();

// Envía el token al backend
const response = await fetch('http://localhost:3001/ledger/accounts', {
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'x-household-id': 'tu-household-uuid'
  }
});
```

## 6. Configuración Backend para Firebase Auth

### 6.1 Instalar dependencia de Firebase Admin

```bash
cd server
npm install firebase-admin
```

### 6.2 Crear archivo de inicialización de Firebase

Crea `server/src/firebase.ts`:

```typescript
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      readFileSync(resolve(serviceAccountPath), 'utf8')
    );
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('✅ Firebase Admin inicializado');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    process.exit(1);
  }
}

export const auth = admin.auth();
export default admin;
```

### 6.3 Middleware de autenticación con Firebase

Actualiza `server/src/auth.ts`:

```typescript
import type { Context, Next } from "hono";
import { auth } from "./firebase.js";
import { uuidSchema } from "./validators.js";

export async function requireAuth(c: Context, next: Next) {
  const requestId = c.get("requestId") as string;
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return c.json(
      { error: "unauthorized", message: "Token requerido", requestId },
      401
    );
  }

  try {
    // Verificar token con Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);
    
    c.set("userId", decodedToken.uid);
    c.set("userEmail", decodedToken.email);
    
    // Sincronizar usuario con PostgreSQL (upsert)
    await syncUserToPostgres(decodedToken);
    
    await next();
  } catch (error) {
    console.error(`[SECURITY] Token inválido: ${error}, requestId: ${requestId}`);
    return c.json(
      { error: "invalid_token", message: "Token inválido o expirado", requestId },
      401
    );
  }
}

async function syncUserToPostgres(token: admin.auth.DecodedIdToken) {
  const { pool } = await import("./db.js");
  const client = await pool.connect();
  
  try {
    // Crear en auth.users si no existe
    await client.query(
      'INSERT INTO auth.users (id) VALUES ($1) ON CONFLICT DO NOTHING',
      [token.uid]
    );
    
    // Crear/actualizar en app.users
    await client.query(
      `INSERT INTO app.users (id, name, email, status) 
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (id) DO UPDATE 
       SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = now()`,
      [token.uid, token.name || token.email?.split('@')[0] || 'Usuario', token.email]
    );
  } finally {
    client.release();
  }
}

export async function requireHousehold(c: Context, next: Next) {
  // ... (mismo código que ya tienes)
}
```

## 7. Configuración de Índices Firestore (Solo si usas Firestore para algo)

Si mantienes Firestore para alguna funcionalidad (ej: cache, preferencias), configura índices:

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Despliega:
```bash
firebase deploy --only firestore:indexes
```

## 8. Testing de la Integración

### 8.1 Test de Login

```bash
# 1. Registra un usuario en el frontend (Firebase Auth)
# 2. Verifica que se creó en PostgreSQL:

psql $DATABASE_URL -c "SELECT * FROM app.users;"
# Debería mostrar el usuario recién creado
```

### 8.2 Test de API

```bash
# Obtener token de Firebase (usa el frontend o Firebase CLI)
# Luego:

curl -X GET http://localhost:3001/ledger/accounts \
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \
  -H "x-household-id: <HOUSEHOLD_UUID>"
```

## 9. Troubleshooting

### Error: "Invalid service account"

Verifica que el archivo `firebase-service-account.json` existe y es válido.

### Error: "User not found in PostgreSQL"

Asegúrate de que el middleware `syncUserToPostgres` está funcionando. Revisa los logs del backend.

### Error: "Cannot connect to PostgreSQL"

Verifica `DATABASE_URL` y que PostgreSQL está corriendo:
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

## 10. Producción

Para producción:

1. **Usar Cloud SQL Proxy** o **Connection Pooling** (PgBouncer)
2. **Secrets Manager**: Guarda `DATABASE_URL` y service account en Azure Key Vault / AWS Secrets Manager
3. **SSL**: Forzar conexiones SSL a PostgreSQL
4. **Firewall**: Solo permitir conexiones desde tu backend

---

¿Necesitas que implemente alguno de estos pasos específicamente?
