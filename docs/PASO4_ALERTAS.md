# PASO 4 — Alertas automáticas

**Estado: COMPLETADO**

## Objetivo

Detectar anomalías financieras sin intervención manual, registrar alertas sin modificar el ledger y preparar hooks para notificación futura.

---

## 1. Reglas implementadas

| Regla | Umbral | Severidad | Descripción |
|-------|--------|-----------|-------------|
| **Gasto anómalo** | Mes actual ≥ 150% del promedio de gasto de los meses anteriores (o del mes anterior si no se pasa promedio) | high | `detect_anomalous_expense` |
| **Drift de ahorro** | Tasa de ahorro actual ≤ tasa anterior − 10 puntos porcentuales | medium | `detect_savings_drift` |
| **Variación brusca cashflow** | Cashflow actual ≤ 70% del cashflow del mes anterior (cuando el anterior > 0) | high | `detect_cashflow_spike` |

---

## 2. Esquema de alertas

**Tabla**: `app.financial_alerts`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| household_id | UUID | FK households |
| alert_type | app.alert_type | anomalous_expense, savings_drift, cashflow_spike |
| severity | app.alert_severity | low, medium, high |
| message | TEXT | Mensaje legible |
| payload | JSONB | Métricas que dispararon la alerta |
| detected_at | TIMESTAMPTZ | Cuándo se detectó |
| notified_at | TIMESTAMPTZ | NULL hasta que se envíe notificación (futuro) |
| notification_hook_sent | BOOLEAN | false; reservado para webhook/email |
| created_at | TIMESTAMPTZ | Creación |

**Migración**: `supabase/migrations/20260205120000_alerts.sql`.

---

## 3. Queries / funciones

**Ejecutar detección** (desde cron, job o API):

```sql
SELECT app.run_alert_detection(
  p_household_id := 'uuid-del-household',
  p_current_income_minor := 8300000,
  p_current_expense_minor := 6550000,
  p_previous_income_minor := 8000000,
  p_previous_expense_minor := 6200000,
  p_avg_previous_expense_minor := 6300000
);
-- Retorna número de alertas insertadas (0, 1, 2 o 3).
```

**Listar alertas recientes**:

```sql
SELECT id, household_id, alert_type, severity, message, payload, detected_at
FROM app.financial_alerts
WHERE household_id = 'uuid'
ORDER BY detected_at DESC
LIMIT 50;
```

**Funciones de detección** (inmutables, para tests o uso externo):

- `app.detect_anomalous_expense(household_id, current_expense_minor, avg_previous_expense_minor)` → boolean
- `app.detect_savings_drift(current_savings_rate, previous_savings_rate)` → boolean
- `app.detect_cashflow_spike(current_cashflow_minor, previous_cashflow_minor)` → boolean

---

## 4. Hooks para notificación futura

- **notified_at**: actualizar cuando se envíe email/push.
- **notification_hook_sent**: marcar true cuando se llame a un webhook externo.
- **Recomendación**: un job periódico que (1) lea `financial_alerts` con `notified_at IS NULL`, (2) envíe a webhook/email y (3) actualice `notified_at` y `notification_hook_sent`. No implementado en este paso; solo preparado el esquema.

---

## 5. Riesgos cubiertos

- **No se modifica el ledger**: las alertas solo INSERT en `financial_alerts`; `run_alert_detection` no escribe en `transactions` ni `ledger_entries`.
- **Auditoría**: cada alerta queda registrada con household, tipo, severidad y payload.
- **Falsos positivos**: umbrales (150%, 10 pp, 30%) son configurables vía nuevas funciones o parámetros si se requiere afinar.

---

## 6. Checklist de validación PASO 4

- [x] Reglas definidas (gasto anómalo, drift ahorro, variación cashflow).
- [x] Detección en SQL (funciones + `run_alert_detection`).
- [x] Registro de alertas en `app.financial_alerts` (sin tocar ledger).
- [x] Campos para hook futuro (`notified_at`, `notification_hook_sent`).
- [x] Documentación de reglas, umbrales y uso.
