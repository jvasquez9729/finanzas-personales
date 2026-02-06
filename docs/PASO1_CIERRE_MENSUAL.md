# PASO 1 — Cierre mensual (soft close)

**Estado: COMPLETADO**

## Objetivo

Cierre mensual contable sin bloquear operaciones: snapshot de saldos a fecha de corte, sin modificar el ledger y sin impedir nuevas transacciones.

---

## 1. Mecanismo de snapshot mensual

- **Balances por cuenta**: tabla `app.monthly_close_snapshot_lines` (snapshot_id, account_id, balance_minor, currency).
- **Balances por contexto**: función `app.get_balances_at_close_by_context(household_id, period_date)` devuelve totales agregados por `personal` vs `family` (y por `owner_user_id` en personal).
- **Fecha de corte**: `app.monthly_close_snapshot.cutoff_at` (timestamptz). Por defecto = último instante del mes de `period_date`.

---

## 2. Esquema SQL

**Tablas**

- `app.monthly_close_snapshot`: id, household_id, period_date (DATE, mes de cierre), cutoff_at, created_at, created_by. UNIQUE (household_id, period_date).
- `app.monthly_close_snapshot_lines`: id, snapshot_id, account_id, balance_minor, currency. UNIQUE (snapshot_id, account_id).

**Funciones**

- `app.run_monthly_close(household_id, period_date, cutoff_at?, created_by?)` → UUID del snapshot. Lee saldos con `get_balances_as_of` e INSERT en snapshot; ON CONFLICT actualiza cabecera y reemplaza líneas.
- `app.get_balances_at_close(household_id, period_date)` → TABLE (account_id, balance_minor, currency). Solo desde snapshot; si no hay cierre, no devuelve filas.
- `app.get_balances_at_close_or_calc(household_id, period_date)` → mismo formato. Si existe snapshot usa ese; si no, calcula con `get_balances_as_of` al último instante del mes.
- `app.get_balances_at_close_by_context(household_id, period_date)` → TABLE (context_type, owner_user_id, total_balance_minor, currency). Agregado por contexto personal/familiar.

**Migración**: `supabase/migrations/20260204120000_monthly_close.sql`.

---

## 3. Ejemplo de query

```sql
-- Ejecutar cierre para enero 2026 (corte al 31-01-2026 23:59:59)
SELECT app.run_monthly_close(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  '2026-01-01'::date,
  NULL,
  'user-uuid'::uuid
);

-- Obtener saldos al cierre de enero 2026
SELECT * FROM app.get_balances_at_close(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  '2026-01-01'::date
);

-- Saldos por contexto (personal/familiar) al cierre
SELECT * FROM app.get_balances_at_close_by_context(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  '2026-01-01'::date
);

-- Saldos al cierre o calculados si no hay snapshot
SELECT * FROM app.get_balances_at_close_or_calc(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  '2026-01-01'::date
);
```

---

## 4. Validación

- **No modifica ledger**: `run_monthly_close` solo hace SELECT a `get_balances_as_of` e INSERT en `monthly_close_snapshot` y `monthly_close_snapshot_lines`. No escribe en `transactions` ni `ledger_entries`.
- **No impide nuevas transacciones**: no hay locks ni bloqueos; las transacciones posteriores a `cutoff_at` se registran con normalidad y no alteran el snapshot ya guardado.

---

## 5. Riesgos cubiertos

- **Pérdida de “estado al cierre”**: el snapshot persiste saldos por cuenta y por contexto a la fecha de corte.
- **Confusión entre saldo vivo y saldo al cierre**: `get_balances_at_close` devuelve solo snapshot; `get_balances` / `get_balances_as_of` siguen siendo la fuente para saldos actuales o a una fecha.
- **Acceso por household**: RLS en ambas tablas limita lectura/inserción a miembros del household.

---

## Checklist de validación PASO 1

- [x] Esquema SQL en migración `20260204120000_monthly_close.sql`.
- [x] Función `run_monthly_close` solo lee ledger y escribe en tablas de snapshot.
- [x] Función `get_balances_at_close` y `get_balances_at_close_or_calc` documentadas con ejemplo.
- [x] Función `get_balances_at_close_by_context` para balances por contexto.
- [x] RLS aplicado a `monthly_close_snapshot` y `monthly_close_snapshot_lines`.
- [x] Documentación en `docs/PASO1_CIERRE_MENSUAL.md`.

**No avanzar al PASO 2 sin marcar este paso como COMPLETADO y validar en entorno (ejecutar migración y queries de ejemplo).**
