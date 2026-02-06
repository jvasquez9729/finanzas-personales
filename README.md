
# Aplicación web de finanzas

This is a code bundle for Aplicación web de finanzas. The original project is available at https://www.figma.com/design/Bevdnq6fgSjuT5MiuTpaKH/Aplicaci%C3%B3n-web-de-finanzas.

## Variables de entorno

Crear un archivo `.env.local` (frontend) y `.env` para las funciones de Supabase con:

```
VITE_SUPABASE_PROJECT_ID=<id_proyecto>
VITE_SUPABASE_URL=<url_publica>
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_LEDGER_API_URL=<url_función_ledger>
VITE_DEFAULT_HOUSEHOLD_ID=<uuid_household>
ALLOWED_ORIGINS=http://localhost:5173
SUPABASE_URL=<url_publica>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret_proyecto>
```

- Nunca commitear claves reales. Rotar las claves que estuvieron en el repositorio.
- `ALLOWED_ORIGINS` admite lista separada por comas.
- `VITE_LEDGER_API_URL`: URL base de la función Edge que expone el ledger (p. ej. `https://<proyecto>.supabase.co/functions/v1/server`). Si no se define, el frontend usa solo datos mock.
- `VITE_DEFAULT_HOUSEHOLD_ID`: UUID del household por defecto para cargar balances. Opcional si no usas API ledger.
- `SUPABASE_JWT_SECRET`: secreto JWT del proyecto (Dashboard > Project Settings > API) para validar tokens en la API ledger.

## Migración del ledger (Supabase)

1. En el panel de Supabase: SQL Editor, o con CLI: `supabase db push`.
2. Ejecutar el contenido de `supabase/migrations/20260201120000_ledger.sql` (crea esquema `app`, tablas `users`, `households`, `household_members`, `accounts`, `transactions`, `ledger_entries`, RLS y función `app.get_balances`).
3. Sincronizar `app.users` con `auth.users` (trigger o desde la app al registrar/iniciar sesión).
4. Crear al menos un household y miembros para poder usar la API.

## API Ledger (función Edge)

Todos los endpoints requieren `Authorization: Bearer <access_token>` y `x-household-id: <uuid>` (o `household_id` en query).

- **GET /ledger/accounts** — Lista cuentas del household. Query opcional: `owner_id` para filtrar por usuario.
- **GET /ledger/balances** — Saldos por cuenta (agregado de `ledger_entries`). Query: `household_id`.
- **POST /ledger/transactions** — Crea transacción con partidas dobles. Body: `{ household_id, occurred_at, description, external_ref?, created_by?, entries: [{ account_id, direction, amount_minor, currency, user_id?, category? }] }`. Las partidas deben cuadrar (débitos = créditos).

Las respuestas incluyen `x-request-id` en cabeceras. Errores de validación devuelven `400` con `{ error: "validation_error", message, requestId }`.

## Observabilidad y trazabilidad

- Cada petición a la función server adjunta/responde `x-request-id` (se reutiliza el entrante o se genera).
- Errores se devuelven como JSON `{ error: "internal_error", requestId }` y se registran en consola con ruta, método y stack.

## Pasos 1–4 (cierre, flag, caos, alertas)

- **Ejecución**: ver [docs/PASOS_1_4_EJECUCION.md](docs/PASOS_1_4_EJECUCION.md) (orden de migraciones, tests, recomendaciones).
- **PASO 1**: [docs/PASO1_CIERRE_MENSUAL.md](docs/PASO1_CIERRE_MENSUAL.md)
- **PASO 2**: [docs/PASO2_FEATURE_FLAG.md](docs/PASO2_FEATURE_FLAG.md)
- **PASO 3**: [docs/PASO3_TEST_CAOS.md](docs/PASO3_TEST_CAOS.md)
- **PASO 4**: [docs/PASO4_ALERTAS.md](docs/PASO4_ALERTAS.md)

## Producción y endurecimiento

- **Tests financieros**: `npm test` (Vitest). Lógica en `src/lib/finance.ts`; tests en `src/lib/finance.test.ts`.
- **Auditoría e histórico**: ver `supabase/migrations/20260202120000_audit.sql` y `guidelines/ProductionReadiness.md`.
- **Backups y recovery**: ver `docs/PRODUCTION.md`.
- **Preparación para AI**: ver `supabase/migrations/20260203120000_analytics.sql` y `docs/AI_INSIGHTS.md`.
- **Checklist global**: ver `guidelines/ProductionReadiness.md`.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.
  