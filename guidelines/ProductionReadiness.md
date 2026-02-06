# Endurecimiento para producción: finanzas personales + familiares

Aplicación web privada con mini-ledger inmutable, dos administradores, contextos personal y familiar. Este documento enlaza las cuatro áreas: tests financieros, modo auditoría, backups/recovery y preparación para AI.

---

## 1) Tests financieros automáticos

**Ubicación**: `src/lib/finance.ts` (lógica pura), `src/lib/finance.test.ts` (tests).

**Lista de tests y qué validan**

| Test | Valida | Riesgo cubierto |
|------|--------|------------------|
| Suma débitos - créditos = 0 por transacción | `transactionBalance(entries) === 0` | Asientos desbalanceados en ledger |
| assertTransactionBalance lanza si no cuadra | Rechazo de entradas inválidas | Doble conteo o saldos erróneos |
| assertTransactionBalance lanza si amount_minor <= 0 | Montos negativos rechazados | Montos negativos en asientos |
| Solo montos negativos cuentan como salida (transferencias) | `transferOutflows` solo suma salidas | Doble conteo en aportes familiares |
| Consolidación: netWorthFromBalances / consolidateBalances | Una fila por cuenta, suma correcta | Doble conteo en patrimonio familiar |
| Tasa de ahorro 0 si ingresos = 0 | Sin división por cero | NaN/errores en KPIs |
| cashFlowChangePercent 0 si gastos = 0 | Sin división por cero | Métricas rotas en UI |
| Regresión KPIs: patrimonio, cashflow, ahorro | Fórmulas estables | Cambios inadvertidos en cálculos |

**Estructura**: Tests con Vitest; lógica en `src/lib/finance.ts` (sin UI, sin I/O). Ejecutar con `npm test`.

**Checklist**

- [ ] `npm test` pasa antes de cada release.
- [ ] Cualquier cambio en fórmulas de KPIs o balance contable debe incluir actualización de tests.

---

## 2) Modo auditoría / histórico

**Ubicación**: `supabase/migrations/20260202120000_audit.sql`.

**Esquema de auditoría**

- **app.audit_log**: id, entity_type, entity_id, action, payload (JSONB), performed_by, performed_at. Append-only; triggers impiden UPDATE/DELETE.
- **Registro**: trigger en INSERT de `transactions` y de `ledger_entries` escribe en `audit_log` (quién, qué, cuándo).
- **Correcciones**: solo mediante asientos reversos (nueva transacción); no se modifican asientos existentes.

**Queries ejemplo para reconstrucción histórica**

- Saldos a fecha X: `SELECT * FROM app.get_balances_as_of('<household_id>', '<timestamp>');`
- Traza de una transacción: `SELECT * FROM app.audit_log WHERE entity_type = 'transaction' AND entity_id = '<txn_id>' ORDER BY performed_at;`

**Riesgos mitigados**

- Pérdida de trazabilidad: todo cambio queda registrado en `audit_log`.
- Imposibilidad de “estado a fecha X”: `get_balances_as_of` reconstruye saldos sin tocar el ledger.

**Checklist**

- [ ] Migración de auditoría aplicada en todos los entornos.
- [ ] Correcciones contables documentadas como “reverso + asiento correcto”, nunca UPDATE/DELETE en ledger.

---

## 3) Backups y recovery

**Ubicación**: `docs/PRODUCTION.md`.

**Resumen**

- Backups automáticos (Supabase managed / PITR según plan).
- Dump lógico semanal o pre-release del esquema `app`.
- Retención: mínimo 30 días PITR si está disponible; al menos 7 puntos de backup lógico.
- Restauración parcial: restaurar solo esquema `app` desde dump en otro Postgres o proyecto.
- Pruebas de recovery: al menos trimestralmente, restaurar y verificar consultas de lectura.

**Checklist**

- [ ] Backups habilitados en Supabase (Database > Backups).
- [ ] Procedimiento de recuperación documentado y probado.
- [ ] Secretos fuera del repositorio; rotación de claves si hubo exposición.

---

## 4) Optimización para AI insights futuros

**Ubicación**: `supabase/migrations/20260203120000_analytics.sql`, `docs/AI_INSIGHTS.md`.

**Arquitectura**

- OLTP: esquema `app` (única fuente de verdad).
- Analytics: esquema `analytics`; vistas/vistas materializadas de solo lectura.
- AI lee solo de `analytics`; nunca escribe en `app.transactions` ni `app.ledger_entries`.

**Campos clave para AI**

- household_id, occurred_at, account_id, category, signed_amount_minor, description (en `analytics.financial_events`).
- Agregados mensuales en `analytics.monthly_household_summary` (refresco periódico).

**Qué NO debe tocar nunca la AI**

- INSERT/UPDATE/DELETE en cualquier tabla de `app`.
- Bypass de validaciones de balance o inmutabilidad.
- Acceso a datos de otro household sin autorización.

**Checklist**

- [ ] Modelos/insights leen solo de `analytics.*`.
- [ ] Refresco de `analytics.monthly_household_summary` programado (p. ej. diario).
- [ ] Documentar qué features de AI están habilitados y con qué datos se alimentan.

---

## Advertencias críticas globales

- **Integridad contable**: el ledger en `app` es inmutable; las correcciones son siempre nuevas transacciones (reversos).
- **Separación de datos**: personal vs familiar se respeta por household_id y RLS; no mezclar contextos en reportes ni en AI.
- **Secretos**: nunca en código ni en repositorio; usar variables de entorno o gestor de secretos.
- **Recovery**: sin backups probados, la pérdida de datos puede ser irreversible; ejecutar al menos una prueba de restauración por trimestre.
