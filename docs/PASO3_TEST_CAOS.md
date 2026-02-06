# PASO 3 — Test de caos financiero

**Estado: COMPLETADO**

## Objetivo

Romper el sistema antes que los usuarios: tests de estrés (alto volumen, transferencias cruzadas, orden/fechas) para validar que los balances siempre cuadran, no hay pérdida de precisión y no hay degradación crítica.

---

## 1. Lista de tests

| Test | Escenario | Qué valida |
|------|-----------|------------|
| Transacción con 2000 partidas balanceadas | 1000 débitos + 1000 créditos (mismo monto) | `transactionBalance` = 0, `assertTransactionBalance` no lanza |
| Transacción con 10_000 partidas | 5000 débitos + 5000 créditos de 1 unidad | Balance = 0, aserción pasa |
| Muchas transferencias en ambos sentidos | 100 salidas -50k y 100 entradas +30k | `transferOutflows` = solo 100×50k (no suma entradas) |
| Transferencias cruzadas A→B y B→A | -800k, -700k, +500k, +200k | Aporte neto = 800k + 700k |
| Consolidación con 500 cuentas | 500 filas balance_minor ±100 | Una fila por cuenta, `consolidateBalances` = netWorth sin doble conteo |
| Orden invariante (múltiples tx balanceadas) | tx1 y tx2 en orden A y en orden B | `transactionBalance` de la concatenación = 0 en ambos órdenes |
| Consolidación: orden de filas | Mismo array en orden normal y reverso | `netWorthFromBalances` igual en ambos |
| Montos grandes en minor units | Débito y crédito de 10_000_000_000 | Suma exacta, balance = 0 |
| netWorthFromBalances muchos centavos | 100 cuentas con 33 centavos | Redondeo correcto a mayor |
| savingsRate / cashFlow números grandes | 1M ingresos, 400k gastos | No NaN, resultado 60% y 600k |
| assertTransactionBalance 5000 partidas | 2500 débitos + 2500 créditos | Ejecuta en &lt; 500 ms |
| Consolidación 2000 cuentas | 2000 filas de 100 minor | Resultado correcto y &lt; 500 ms |

---

## 2. Resultados esperados

- **Balance**: Todas las transacciones balanceadas devuelven suma 0 y `assertTransactionBalance` no lanza.
- **Transferencias**: Solo los montos negativos suman en `transferOutflows`; consolidación no cuenta dos veces la misma cuenta.
- **Orden**: El orden de aplicación de transacciones balanceadas no cambia el balance total; el orden de filas en consolidación no cambia `netWorthFromBalances`.
- **Precisión**: Montos grandes y muchas partidas no producen NaN ni errores; redondeo en centavos → mayor es correcto.
- **Rendimiento**: 5000 partidas y 2000 cuentas completan en &lt; 500 ms cada uno (umbral configurado en el test).

---

## 3. Problemas encontrados

- En el entorno de ejecución automático (CI/sandbox) puede haber fallos de ruta o de instalación de Vitest; **ejecutar localmente** con `npm i` y `npm test` en la raíz del proyecto.
- Los tests son **unitarios sobre lógica pura** (sin DB ni API): no detectan problemas de concurrencia ni de límites de Supabase/Postgres. Para estrés real sobre el ledger en BD se recomienda un suite aparte (integración) con volumen y fechas desordenadas contra una base de pruebas.

---

## 4. Recomendaciones

- **Incluir en CI**: Ejecutar `npm test` en cada commit o PR para no regresar en balance, transferencias ni precisión.
- **Límites en backend**: En la API, limitar el número de `entries` por transacción (p. ej. máx. 500) para evitar timeouts o carga excesiva; el test de 10k partidas valida la lógica en memoria, no un límite de producto.
- **Fechas desordenadas**: La lógica actual no depende del orden de fechas; si en el futuro se agregan cortes por fecha, añadir tests que inserten transacciones con `occurred_at` desordenado y comprueben saldos a fecha.
- **Precisión en JS**: `amount_minor` está en número; por encima de `Number.MAX_SAFE_INTEGER` puede haber pérdida. Mantener montos en rango seguro o considerar bigint/string en backend.

---

## 5. Ubicación del código

- **Tests**: `src/lib/chaos.test.ts`
- **Lógica bajo prueba**: `src/lib/finance.ts` (sin cambios en PASO 3; solo se añadieron tests).

---

## 6. Checklist de validación PASO 3

- [x] Tests de alto volumen de transacciones (2000 y 10_000 partidas).
- [x] Tests de transferencias cruzadas (salidas/entradas, aporte neto).
- [x] Tests de orden / fechas desordenadas (invariante al orden).
- [x] Tests de precisión (montos grandes, redondeo, sin NaN).
- [x] Tests de degradación (tiempo &lt; 500 ms para 5000 partidas y 2000 cuentas).
- [x] Documentación en `docs/PASO3_TEST_CAOS.md` con lista, resultados esperados, problemas y recomendaciones.

**No avanzar al PASO 4 sin marcar este paso como COMPLETADO y, si es posible, ejecutar `npm test` localmente para confirmar que todos los tests pasan.**
