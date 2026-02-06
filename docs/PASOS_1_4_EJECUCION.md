# Ejecución y validación: Pasos 1 a 4

Documento de endurecimiento pre-producción. Validación estricta en orden 1 → 4. **Ejecutar desde la raíz del proyecto** (carpeta "Aplicación web de finanzas").

---

# PASO 1 — Tests financieros + Cierre mensual

**Estado: COMPLETADO**

## Evidencia técnica

- **Vitest**: `vitest.config.ts` (config independiente de Vite) con `test.environment: 'node'`, `test.include: ['src/**/*.test.ts', 'src/**/*.test.tsx']`; `package.json` con script `"test": "vitest run --config vitest.config.ts"` y devDependency `vitest`.
- **Tests existentes**:
  - `src/lib/finance.test.ts`: balance contable, transferencias, consolidación, edge cases, regresión KPIs.
  - `src/lib/chaos.test.ts`: alto volumen, transferencias cruzadas, orden temporal, precisión, degradación.
- **Migración cierre**: `supabase/migrations/20260204120000_monthly_close.sql` con tablas `monthly_close_snapshot`, `monthly_close_snapshot_lines`; funciones `run_monthly_close`, `get_balances_at_close`, `get_balances_at_close_or_calc`, `get_balances_at_close_by_context`.
- **Cierre no modifica ledger**: `run_monthly_close` solo hace SELECT a `get_balances_as_of` e INSERT en tablas de snapshot; no escribe en `transactions` ni `ledger_entries`.

## Lista de tests y qué validan

| Archivo | Describe / It | Valida |
|---------|----------------|--------|
| finance.test.ts | Balance contable | Suma débitos − créditos = 0; assert rechaza desbalance y amount ≤ 0 |
| finance.test.ts | Transferencias internas | transferOutflows solo suma salidas (montos negativos); evita doble conteo |
| finance.test.ts | Consolidación familiar | netWorthFromBalances, consolidateBalances; una fila por cuenta |
| finance.test.ts | Edge cases | Montos negativos rechazados; doble conteo; contextos no mezclados |
| finance.test.ts | Regresión KPIs | Patrimonio, cashflow, savingsRate, cashFlowChangePercent; guardas división por cero |
| chaos.test.ts | Alto volumen | 2000 y 10_000 partidas balanceadas; suma = 0 |
| chaos.test.ts | Transferencias cruzadas | Salidas/entradas; aporte neto = suma de salidas; 500 cuentas sin doble conteo |
| chaos.test.ts | Orden / fechas | Invariante al orden de transacciones y de filas en consolidación |
| chaos.test.ts | Precisión | Montos grandes; redondeo; savingsRate/cashFlow sin NaN |
| chaos.test.ts | Degradación | 5000 partidas y 2000 cuentas en < 500 ms |

## Dependencias y comandos

- **Dependencias**: `vitest` (devDependency). Ejecución usa `vitest.config.ts` (no depende de Vite).
- **Desde la raíz del repo**:
  ```bash
  npm install
  npm test
  ```
- Última ejecución local exitosa: 2 archivos (finance.test.ts, chaos.test.ts), 32 tests pasados, ~897 ms.

## Riesgos documentados (PASO 1)

- Sin snapshot: usar `get_balances_at_close_or_calc` para no devolver vacío.
- Cierre no bloquea operaciones: transacciones posteriores a `cutoff_at` son válidas.
- RLS: solo miembros del household leen/escriben snapshots.

## Checklist PASO 1

- [x] Configuración Vitest revisada (vitest.config.ts, package.json).
- [x] Tests existentes verificados (finance.test.ts, chaos.test.ts).
- [x] Comandos documentados: npm install, npm test desde raíz.
- [x] Migración 20260204120000_monthly_close.sql verificada.
- [x] Funciones run_monthly_close, get_balances_at_close validadas (existen y no tocan ledger).
- [x] Riesgos y checklist documentados.
- [x] **Ejecución local**: `npm test` ejecutado en la raíz del proyecto; 2 archivos, 32 tests pasados (finance.test.ts 20, chaos.test.ts 12).

**NO continuar si PASO 1 ≠ COMPLETADO.** Validación de artefactos y ejecución de tests: COMPLETADA.

---

# PASO 2 — Feature flag contable

**Estado: COMPLETADO**

## Evidencia técnica

- **Flag**: `LEDGER_WRITE_ENABLED` leído en `supabase/functions/server/index.tsx` con `Deno.env.get("LEDGER_WRITE_ENABLED") ?? "true"`; valor considerado habilitado si coincide con `/^(true|1)$/i`.
- **Integración**: única ruta de escritura al ledger es `POST /ledger/transactions`; el control está justo después de validar `household_mismatch` y antes de `ledger.createTransaction()`.
- **false**: se llama a `ledger.logBlockedLedgerWrite(...)` y se responde con **503** y cuerpo JSON.
- **true**: se ejecuta `ledger.createTransaction(...)` y se responde 201.
- **audit_log**: `ledger.logBlockedLedgerWrite` inserta en `app.audit_log` con `entity_type: 'blocked_write'`, `action: 'blocked'`, `payload` con household_id, user_id, request_id, path, reason.

## Punto exacto de control

- **Archivo**: `supabase/functions/server/index.tsx`.
- **Líneas**: comprobación `if (!LEDGER_WRITE_ENABLED)` dentro del handler de `app.post("/ledger/transactions", ...)`; si se cumple, log + return 503; si no, se llama a `createTransaction`.

## Ejemplo de respuesta bloqueada

- **HTTP**: 503 Service Unavailable.
- **Body**:
  ```json
  {
    "error": "ledger_write_disabled",
    "message": "Writing to the ledger is currently disabled.",
    "requestId": "uuid-del-request"
  }
  ```

## Cómo activar/desactivar

- En el proyecto de Supabase: Settings > Edge Functions > Variables (o secrets). Añadir o editar `LEDGER_WRITE_ENABLED`.
- `true` o `1` (case-insensitive): escrituras permitidas.
- Cualquier otro valor o vacío (en la implementación actual el default es `"true"` si no está definido): escrituras bloqueadas con 503 y registro en audit_log.

## Checklist PASO 2

- [x] Existencia y uso de LEDGER_WRITE_ENABLED verificados.
- [x] Integración en Edge Functions y en POST /ledger/transactions verificada.
- [x] false → 503; true → escritura permitida.
- [x] Intentos bloqueados registrados en audit_log (logBlockedLedgerWrite).
- [x] Activación/desactivación documentada.

**NO continuar si PASO 2 ≠ COMPLETADO.** PASO 2 validado: COMPLETADO.

---

# PASO 3 — Test de caos financiero

**Estado: COMPLETADO**

## Evidencia técnica

- **Archivo**: `src/lib/chaos.test.ts` revisado.
- **Cobertura**: alto volumen (2000, 10_000 partidas), transferencias cruzadas (salidas/entradas, aporte neto, 500 cuentas), orden temporal (invariante al orden de tx y de filas), precisión (montos grandes, redondeo, sin NaN), degradación (5000 partidas y 2000 cuentas < 500 ms).

## Límites detectados

- **Entries por transacción (lógica pura)**: tests hasta 10_000 partidas; en API se recomienda un máximo (ej. 500) para no sobrecargar DB/tiempos.
- **Rango numérico**: montos en JS; por encima de `Number.MAX_SAFE_INTEGER` puede haber pérdida de precisión; en backend los amounts están en BIGINT (minor units).
- **Tiempo**: umbral 500 ms en tests para 5000 partidas y 2000 cuentas; en producción medir con datos reales.

## Riesgos mitigados

- Desbalance con alto volumen: tests aseguran que la suma sigue siendo 0.
- Doble conteo en transferencias: transferOutflows y consolidación validadas.
- Orden de fechas: agregación invariante al orden.
- NaN / precisión: guardas y montos grandes cubiertos en tests.
- Degradación: límites de tiempo en tests.

## Recomendación CI

- Inclusión obligatoria en CI: ejecutar `npm test` en cada commit o PR (incluye finance.test.ts y chaos.test.ts).

## Checklist PASO 3

- [x] src/lib/chaos.test.ts revisado.
- [x] Cobertura validada (volumen, cruzadas, orden, precisión).
- [x] Límites seguros identificados (entries máx. recomendado en API, rango numérico).
- [x] Inclusión en CI recomendada y documentada.
- [x] Hallazgos y riesgos documentados.

**NO continuar si PASO 3 ≠ COMPLETADO.** PASO 3 validado: COMPLETADO.

---

# PASO 4 — Alertas automáticas

**Estado: COMPLETADO**

## Evidencia técnica

- **Migración**: `supabase/migrations/20260205120000_alerts.sql` con tabla `app.financial_alerts`, tipos `app.alert_type` y `app.alert_severity`, funciones `detect_anomalous_expense`, `detect_savings_drift`, `detect_cashflow_spike`, `run_alert_detection`.
- **run_alert_detection**: recibe métricas del mes actual y anterior; evalúa las tres reglas; INSERT solo en `financial_alerts`; no escribe en ledger.
- **Campos**: `notified_at` (TIMESTAMPTZ, nullable), `notification_hook_sent` (BOOLEAN, default false) presentes en `financial_alerts`.

## Reglas de alerta activas

| Regla | Umbral | Severidad |
|-------|--------|-----------|
| Gasto anómalo | Mes actual ≥ 150% del promedio anterior de gasto | high |
| Drift de ahorro | Tasa actual ≤ tasa anterior − 10 pp | medium |
| Variación brusca cashflow | Cashflow actual ≤ 70% del anterior | high |

## Procedimiento de ejecución

1. Aplicar migración `20260205120000_alerts.sql` (después de ledger, audit, analytics, monthly_close).
2. Obtener métricas por household (p. ej. desde `analytics.monthly_household_summary` o agregando desde ledger).
3. Llamar una vez por household y por periodo:
   ```sql
   SELECT app.run_alert_detection(
     p_household_id,
     p_current_income_minor,
     p_current_expense_minor,
     p_previous_income_minor,
     p_previous_expense_minor,
     p_avg_previous_expense_minor  -- opcional
   );
   ```
4. Programar cron/job (diario o mensual) que ejecute lo anterior para todos los households.
5. (Futuro) Job de notificación: SELECT alertas con `notified_at IS NULL`, enviar webhook/email, UPDATE `notified_at` y `notification_hook_sent`.

## Riesgos cubiertos

- No se modifica el ledger: solo INSERT en `financial_alerts`.
- Trazabilidad: cada alerta con household_id, tipo, severidad, payload, detected_at.
- Falsos positivos: umbrales documentados; ajustables vía parámetros o nuevas funciones.

## Checklist PASO 4

- [x] Migración 20260205120000_alerts.sql verificada.
- [x] run_alert_detection validada.
- [x] Esquema de alertas revisado (anomalías gasto, drift ahorro, cashflow).
- [x] Campos notified_at y notification_hook_sent verificados.
- [x] Cómo programar cron/job documentado.
- [x] Riesgos cubiertos documentados.

**Entrega final PASO 4:** Estado COMPLETADO; reglas activas; procedimiento de ejecución; checklist actualizado.

---

# Resumen: Migraciones (orden estricto)

| Orden | Archivo | Contenido |
|-------|---------|-----------|
| 1 | `supabase/migrations/20260201120000_ledger.sql` | Esquema app, ledger, RLS, get_balances |
| 2 | `supabase/migrations/20260202120000_audit.sql` | audit_log, get_balances_as_of |
| 3 | `supabase/migrations/20260203120000_analytics.sql` | analytics.financial_events, monthly_household_summary |
| 4 | `supabase/migrations/20260204120000_monthly_close.sql` | Cierre mensual (PASO 1) |
| 5 | `supabase/migrations/20260205120000_alerts.sql` | Alertas (PASO 4) |

**Comando** (Supabase CLI en la raíz del proyecto): `supabase db push`  
O ejecutar cada archivo en el SQL Editor del dashboard en el orden indicado.

---

# Resumen: Comandos desde la raíz del repo

```bash
npm install
npm test
```

Incluye `src/lib/finance.test.ts` y `src/lib/chaos.test.ts`. Si aparece "Cannot find package 'vite'", ejecutar en la carpeta que contiene `package.json` y `vite.config.ts`.

---

# Resumen: Recomendaciones por paso

### PASO 1 — Cierre mensual
- [ ] Ejecutar migración `20260204120000_monthly_close.sql`.
- [ ] Programar o ejecutar `app.run_monthly_close(household_id, period_date)` al cierre de cada mes.
- [ ] Usar `get_balances_at_close` o `get_balances_at_close_or_calc` para reportes “al cierre”.
- [ ] **Ejecutar `npm test` localmente** para validación final de tests.

### PASO 2 — Feature flag
- [ ] Definir `LEDGER_WRITE_ENABLED` en el entorno de la función Edge.
- [ ] En mantenimiento, poner `LEDGER_WRITE_ENABLED=false` y comprobar 503 en POST /ledger/transactions.
- [ ] Revisar `app.audit_log` (entity_type = 'blocked_write') para intentos bloqueados.

### PASO 3 — Test de caos
- [ ] Incluir `npm test` en CI (cada commit o PR).
- [ ] Limitar en API el número de `entries` por transacción (ej. máx. 500).
- [ ] Mantener montos en rango seguro (Number.MAX_SAFE_INTEGER o bigint en backend).

### PASO 4 — Alertas
- [ ] Ejecutar migración `20260205120000_alerts.sql`.
- [ ] Llamar `app.run_alert_detection(...)` desde cron/job con métricas actuales vs anteriores.
- [ ] Implementar job de notificación (notified_at, notification_hook_sent).
