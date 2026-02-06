# PASO 2 — Feature flag contable

**Estado: COMPLETADO**

## Objetivo

Poder habilitar o deshabilitar escrituras al ledger de forma centralizada sin cambiar código (variable de entorno).

---

## 1. Flag global

- **Nombre**: `LEDGER_WRITE_ENABLED`
- **Origen**: variable de entorno en la función Edge (Supabase Functions).
- **Valores**: `true` o `1` (case-insensitive) = escrituras permitidas; cualquier otro valor = solo lectura (POST bloqueado).

---

## 2. Código del flag

**Archivo**: `supabase/functions/server/index.tsx`

```ts
const LEDGER_WRITE_ENABLED = /^(true|1)$/i.test(
  Deno.env.get("LEDGER_WRITE_ENABLED") ?? "true"
);
```

- Por defecto, si la variable no está definida, se considera `true` (comportamiento actual: escrituras permitidas).
- Se evalúa una sola vez al cargar el módulo.

---

## 3. Punto exacto de control

- **Ruta**: `POST /ledger/transactions`
- **Ubicación**: justo después de validar `household_mismatch` y **antes** de llamar a `ledger.createTransaction()`.
- **Comportamiento**:
  - Si `LEDGER_WRITE_ENABLED` es falso: se llama a `ledger.logBlockedLedgerWrite(...)`, se responde **503** con cuerpo JSON y no se ejecuta `createTransaction`.
  - Si es verdadero: se sigue el flujo normal y se crea la transacción.

No hay otro punto de escritura al ledger en la API (solo POST /ledger/transactions); GET /ledger/accounts y GET /ledger/balances son solo lectura y no dependen del flag.

---

## 4. Registro en audit_log de intentos bloqueados

- **Función**: `ledger.logBlockedLedgerWrite(params)` en `supabase/functions/server/ledger.ts`.
- **Tabla**: `app.audit_log`.
- **Filas insertadas**: `entity_type = 'blocked_write'`, `entity_id = UUID`, `action = 'blocked'`, `payload` con `household_id`, `user_id`, `request_id`, `path`, `reason`; `performed_by = user_id`.
- Si el insert en `audit_log` falla, se registra el error en consola pero la respuesta 503 se devuelve igual (el bloqueo no depende del éxito del log).

---

## 5. Ejemplo de respuesta bloqueada

**Request**: `POST /ledger/transactions` con body válido y JWT + `x-household-id` correctos, con `LEDGER_WRITE_ENABLED=false` (o no definido como `true`/`1`).

**Response**: `503 Service Unavailable`

**Body**:

```json
{
  "error": "ledger_write_disabled",
  "message": "Writing to the ledger is currently disabled.",
  "requestId": "uuid-del-request"
}
```

**Cabeceras**: `x-request-id` (si se envió o se generó).

---

## 6. Comportamiento resumido

| LEDGER_WRITE_ENABLED | GET /ledger/* | POST /ledger/transactions |
|----------------------|---------------|----------------------------|
| `true` / `1` (o no definido) | Permitido     | Permitido (crea transacción) |
| Cualquier otro       | Permitido     | 503 + log en audit_log      |

---

## 7. Riesgos mitigados

- **Cierre o mantenimiento controlado**: se puede deshabilitar la escritura al ledger en producción sin desplegar código (solo cambiar la variable en el proyecto de la función).
- **Auditoría**: todo intento de escritura bloqueado queda registrado en `audit_log` con usuario, household, request_id y motivo.
- **Reversión rápida**: volver a permitir escrituras poniendo `LEDGER_WRITE_ENABLED=true` y redeploy/restart de la función.

---

## 8. Checklist de validación PASO 2

- [x] Flag `LEDGER_WRITE_ENABLED` leído desde env en la función Edge.
- [x] Control aplicado únicamente en POST /ledger/transactions (antes de `createTransaction`).
- [x] Con flag en false: respuesta 503 y cuerpo JSON con `error`, `message`, `requestId`.
- [x] Con flag en false: se registra el intento en `app.audit_log` vía `logBlockedLedgerWrite`.
- [x] `.env.example` actualizado con `LEDGER_WRITE_ENABLED=true`.
- [x] Documentación en `docs/PASO2_FEATURE_FLAG.md`.

**No avanzar al PASO 3 sin marcar este paso como COMPLETADO y validar en entorno (probar con flag en false y comprobar 503 + fila en audit_log).**
