# Producción: Backups y Recovery

Aplicación web privada de finanzas personales + familiares. Ledger inmutable, contextos personal y familiar.

---

## 1. Estrategia recomendada

- **Backups automáticos** del proyecto Supabase (base de datos Postgres) usando la función nativa de Supabase (Point-in-Time Recovery / backups diarios según plan).
- **Backups lógicos** (dump SQL) del esquema `app` y, si se desea, `auth` para portabilidad y restauración en otro proveedor.
- **Retención**: mínimo 30 días de PITR si está disponible; al menos 7 puntos de backup lógico semanales.

**Justificación**: El ledger y `audit_log` son inmutables; un backup consistente permite reconstruir el estado sin pérdida de asientos. PITR permite recuperar a un instante anterior (p. ej. antes de un error de aplicación).

---

## 2. Frecuencia

| Tipo | Frecuencia | Notas |
|------|------------|--------|
| Supabase managed backups | Diario (según plan) | Habilitar en Dashboard > Database > Backups |
| Dump lógico (pg_dump) | Semanal o pre-despliegue | Solo esquema `app` (+ opcional `auth`) |
| Export config/env | En cada cambio de config | Sin secretos; solo nombres de variables |

---

## 3. Qué se respalda y qué no

**Incluir siempre**

- Esquema `app`: tablas `users`, `households`, `household_members`, `accounts`, `transactions`, `ledger_entries`, `audit_log`.
- Funciones y triggers del esquema `app`.
- Enums y tipos del esquema `app`.

**No incluir en el dump (o excluir explícitamente)**

- Datos de otras aplicaciones en el mismo proyecto (si las hubiera).
- Archivos de código (repositorio); variables de entorno con secretos (gestión aparte).

**No commitear**

- Claves (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, etc.). Usar gestor de secretos o variables del entorno de despliegue.

---

## 4. Procedimiento de recuperación (paso a paso)

### 4.1 Restauración completa (proyecto Supabase)

1. En Supabase Dashboard > Database > Backups, elegir el punto de restauración.
2. Seguir el flujo de restauración (puede crear un proyecto nuevo o reemplazar, según la opción ofrecida).
3. Actualizar `SUPABASE_URL` y claves en la aplicación si el proyecto cambió.
4. Verificar con una consulta de solo lectura a `app.transactions` o `app.get_balances(household_id)`.

### 4.2 Restauración parcial (solo ledger en otro Postgres)

1. Tener un dump previo: `pg_dump --schema=app ... > app_backup.sql`.
2. Crear una base de datos vacía o un esquema aislado.
3. Restaurar: `psql -f app_backup.sql` (o equivalente).
4. Si se usa Supabase en el destino, ejecutar las migraciones pendientes y luego restaurar datos si el dump incluye datos; o restaurar solo datos con `COPY`/inserts desde el dump.
5. Comprobar integridad: saldos por transacción = 0, y que no haya filas huérfanas.

### 4.3 Recuperación ante borrado accidental de datos

- No se deben hacer UPDATE/DELETE en `ledger_entries` ni en `audit_log` (triggers lo impiden).
- Si se borran transacciones (si en el futuro se permitiera en alguna política), recuperar desde el backup más reciente y restaurar solo las filas afectadas (transacciones + sus ledger_entries) desde el dump o PITR.

---

## 5. Pruebas de recovery

- **Checklist**:
  - [ ] Al menos una vez por trimestre: restaurar el backup lógico en un entorno de prueba y ejecutar `app.get_balances(household_id)` y una consulta a `audit_log`.
  - [ ] Comprobar que no falten transacciones recientes en el dump respecto al estado actual (ventana de backup).
  - [ ] Documentar el tiempo aproximado de restauración y los pasos realizados.

---

## 6. Riesgos si no se implementa

- **Pérdida de datos irreversible** ante fallo de disco o borrado accidental.
- **Imposibilidad de cumplir auditoría** si no hay punto de restauración para una fecha dada.
- **Pérdida de trazabilidad** si no existe backup del `audit_log` y se requiere “estado en fecha X”.
- **Downtime prolongado** si no se ha practicado el procedimiento de recuperación.

---

## 7. Resumen

| Elemento | Acción |
|----------|--------|
| Backups automáticos | Habilitar en Supabase (Database > Backups). |
| Dump lógico | Semanal o pre-release de `app`. |
| Retención | ≥ 30 días PITR si está disponible; ≥ 7 backups lógicos. |
| Recovery | Probar restauración al menos trimestralmente. |
| Secretos | Nunca en repositorio; usar variables de entorno o gestor de secretos. |
