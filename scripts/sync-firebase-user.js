#!/usr/bin/env node

/**
 * Script para sincronizar un usuario de Firebase Auth a PostgreSQL
 * Uso: node scripts/sync-firebase-user.js <USER_UID>
 */

const { Pool } = require('pg');

// Cargar variables de entorno
require('dotenv').config({ path: '../server/.env' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurado');
  process.exit(1);
}

const uid = process.argv[2];
const email = process.argv[3] || `user-${uid.substring(0, 8)}@example.com`;
const name = process.argv[4] || email.split('@')[0];

if (!uid) {
  console.error('❌ Uso: node sync-firebase-user.js <UID> [email] [name]');
  console.error('   Ejemplo: node sync-firebase-user.js abc123 user@email.com "Juan Pérez"');
  process.exit(1);
}

async function syncUser() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log(`🔄 Sincronizando usuario: ${uid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);

    // Crear en auth.users
    await pool.query(
      'INSERT INTO auth.users (id) VALUES ($1) ON CONFLICT DO NOTHING',
      [uid]
    );
    console.log('✅ auth.users: OK');

    // Crear/actualizar en app.users
    const userResult = await pool.query(
      `INSERT INTO app.users (id, name, email, status) 
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (id) DO UPDATE 
       SET name = EXCLUDED.name, 
           email = EXCLUDED.email, 
           updated_at = now()
       RETURNING id`,
      [uid, name, email]
    );
    console.log('✅ app.users: OK');

    // Verificar si tiene household
    const householdCheck = await pool.query(
      'SELECT household_id FROM app.household_members WHERE user_id = $1',
      [uid]
    );

    let householdId;
    if (householdCheck.rows.length === 0) {
      // Crear household por defecto
      const householdResult = await pool.query(
        'INSERT INTO app.households (name) VALUES ($1) RETURNING id',
        [`Household de ${name}`]
      );
      householdId = householdResult.rows[0].id;

      // Agregar usuario como miembro
      await pool.query(
        'INSERT INTO app.household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [householdId, uid, 'admin']
      );
      console.log(`✅ Household creado: ${householdId}`);
    } else {
      householdId = householdCheck.rows[0].household_id;
      console.log(`ℹ️  Usuario ya tiene household: ${householdId}`);
    }

    // Crear cuentas por defecto
    const defaultAccounts = [
      { name: 'Efectivo', type: 'cash' },
      { name: 'Cuenta Bancaria', type: 'bank' },
      { name: 'Tarjeta de Crédito', type: 'cc' },
    ];

    for (const account of defaultAccounts) {
      await pool.query(
        `INSERT INTO app.accounts (household_id, name, type, currency)
         VALUES ($1, $2, $3, 'MXN')
         ON CONFLICT (household_id, name) DO NOTHING`,
        [householdId, account.name, account.type]
      );
    }
    console.log('✅ Cuentas por defecto creadas');

    console.log('');
    console.log('🎉 Usuario sincronizado exitosamente!');
    console.log(`   UID: ${uid}`);
    console.log(`   Household: ${householdId}`);
    console.log('');
    console.log('Puedes usar el header:');
    console.log(`   x-household-id: ${householdId}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

syncUser();
