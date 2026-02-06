# Usar PostgreSQL en local (sin Supabase)

Puedes ejecutar la base de datos y el API del ledger en local con PostgreSQL y el servidor Node incluido en `server/`, sin depender de Supabase.

## Requisitos

- Node.js 18+
- PostgreSQL 14+ (instalado o vía Docker)

## 0. Todo en uno (recomendado)

Con **Docker en ejecución**:

```bash
npm run db:local
```

Esto inicia el contenedor PostgreSQL, espera a que esté listo, ejecuta todas las migraciones y el seed. Luego arranca el servidor:

```bash
cd server && npm run dev
```

El servidor usa las variables de `server/.env` (ya creado con valores por defecto).

---

## 1. Crear la base de datos local (manual)

Ejemplo con Docker:

```bash
docker run -d --name finanzas-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=finanzas -p 5432:5432 postgres:16-alpine
```

O crea una base de datos `finanzas` en tu PostgreSQL existente.

## 2. Ejecutar migraciones (manual)

Las migraciones están en `supabase/migrations/`. **Orden:**

1. **Primero** (solo para Postgres local sin Supabase): `20260200120000_local_auth_schema.sql` — crea el esquema `auth` y la tabla `auth.users` mínima.
2. Luego, en orden: `20260201120000_ledger.sql`, `20260202120000_audit.sql`, `20260203120000_analytics.sql`, `20260204120000_monthly_close.sql`, `20260205120000_alerts.sql`.

Ejemplo con `psql`:

```bash
psql postgresql://postgres:postgres@localhost:5432/finanzas -f supabase/migrations/20260200120000_local_auth_schema.sql
psql postgresql://postgres:postgres@localhost:5432/finanzas -f supabase/migrations/20260201120000_ledger.sql
# ... resto de migraciones en orden
```

O desde la raíz del proyecto (con Postgres ya corriendo y BD `finanzas` creada):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finanzas npm run db:migrate
```

O desde el SQL Editor de tu cliente (pgAdmin, DBeaver, etc.) ejecutando cada archivo en ese orden.

## 3. Poblar auth.users y datos mínimos

Para que el API acepte un usuario y un hogar, necesitas:

- Insertar en `auth.users`: el `id` (UUID) del usuario que usarás como `sub` del JWT.
- Insertar en `app.users`: misma `id`, más `name`, `email`, etc.
- Crear un hogar en `app.households` y una fila en `app.household_members` vinculando ese `user_id` al `household_id`.

Ejemplo mínimo:

```sql
INSERT INTO auth.users (id) VALUES ('11111111-1111-1111-1111-111111111111');
INSERT INTO app.users (id, name, email, status) VALUES ('11111111-1111-1111-1111-111111111111', 'Local User', 'local@test', 'active');
INSERT INTO app.households (id, name) VALUES ('22222222-2222-2222-2222-222222222222', 'Mi Hogar');
INSERT INTO app.household_members (household_id, user_id, role) VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin');
```

## 4. Variables de entorno del servidor

En la raíz del proyecto o dentro de `server/` crea un `.env` (o exporta en la shell) con:

- `DATABASE_URL`: conexión a tu Postgres local, p. ej. `postgresql://postgres:postgres@localhost:5432/finanzas`
- `JWT_SECRET`: secreto para firmar/verificar el JWT (mismo que uses en el cliente para generar el token).
- Opcional: `PORT=3001`, `ALLOWED_ORIGINS=http://localhost:5173`, `LEDGER_WRITE_ENABLED=true`

El servidor usa `dotenv`, así que si ejecutas desde `server/`, un `.env` dentro de `server/` se cargará.

## 5. Arrancar el servidor del ledger

Desde la raíz del proyecto:

```bash
cd server
npm install
npm run dev
```

Por defecto escucha en `http://localhost:3001`.

## 6. Frontend

Configura el frontend para usar el API local:

- `VITE_LEDGER_API_URL=http://localhost:3001`
- El frontend debe enviar un JWT válido (Bearer) con `sub` = UUID del usuario que insertaste en `auth.users`/`app.users`, y el header `x-household-id` con el UUID del hogar.

Puedes generar un JWT de prueba con la misma `JWT_SECRET` y `sub` = `11111111-1111-1111-1111-111111111111` (y opcionalmente `x-household-id` = `22222222-2222-2222-2222-222222222222`).

## Resumen

| Componente   | Con Supabase           | Con Postgres local                    |
|-------------|------------------------|---------------------------------------|
| Base de datos | Supabase (hosted)      | PostgreSQL local                      |
| API ledger  | Supabase Edge Functions| Servidor Node en `server/`            |
| Auth        | Supabase Auth          | JWT firmado con `JWT_SECRET`          |
| Migraciones | `supabase db push`     | Ejecutar SQL a mano en el orden indicado |

Las variables de Supabase (`VITE_SUPABASE_*`, `SUPABASE_URL`, etc.) no son necesarias para el flujo local; solo `DATABASE_URL`, `JWT_SECRET` y `VITE_LEDGER_API_URL` (apuntando al servidor local).
