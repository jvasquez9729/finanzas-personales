/**
 * Script para crear los usuarios iniciales con contraseñas hasheadas.
 * Ejecutar una sola vez después de aplicar las migraciones.
 * 
 * Uso: node scripts/create-users.mjs
 */

import pg from "pg";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Cargar .env de server/ directamente
const serverEnvPath = path.join(root, "server", ".env");
if (fs.existsSync(serverEnvPath)) {
  const content = fs.readFileSync(serverEnvPath, "utf8");
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && value) {
      process.env[key] = value;
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/finanzas";

// Usuarios a crear
const users = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Jhon Camilo Vasquez",
    email: "jhonjairocamilovasquez@gmail.com",
    password: "Alma202512*",
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    name: "Yoryana Camila Lazaro",
    email: "yoryanalazaro@gmail.com",
    password: "Alma202512*",
  },
];

const householdId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const householdName = "Familia Vasquez Lazaro";

async function run() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Creando usuarios y hogar...\n");

    // Crear usuarios en auth.users (para FK)
    for (const u of users) {
      await client.query(
        "INSERT INTO auth.users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
        [u.id]
      );
    }

    // Crear usuarios en app.users con password_hash
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        `INSERT INTO app.users (id, name, email, status, password_hash)
         VALUES ($1, $2, $3, 'active', $4)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash`,
        [u.id, u.name, u.email, hash]
      );
      console.log(`✓ Usuario: ${u.name} (${u.email})`);
    }

    // Crear hogar
    await client.query(
      `INSERT INTO app.households (id, name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [householdId, householdName]
    );
    console.log(`✓ Hogar: ${householdName}`);

    // Añadir ambos usuarios al hogar como admin
    for (const u of users) {
      await client.query(
        `INSERT INTO app.household_members (household_id, user_id, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (household_id, user_id) DO UPDATE SET role = 'admin'`,
        [householdId, u.id]
      );
      console.log(`✓ ${u.name} añadido al hogar como admin`);
    }

    // Crear cuentas de ejemplo
    const accounts = [
      // Cuentas personales de Jhon
      { id: "d1111111-1111-1111-1111-111111111111", name: "Banco Jhon", type: "bank", is_personal: true, owner: users[0].id },
      { id: "d2222222-2222-2222-2222-222222222222", name: "Efectivo Jhon", type: "cash", is_personal: true, owner: users[0].id },
      { id: "d3333333-3333-3333-3333-333333333333", name: "Tarjeta Crédito Jhon", type: "cc", is_personal: true, owner: users[0].id },
      
      // Cuentas personales de Yoryana
      { id: "e1111111-1111-1111-1111-111111111111", name: "Banco Yoryana", type: "bank", is_personal: true, owner: users[1].id },
      { id: "e2222222-2222-2222-2222-222222222222", name: "Efectivo Yoryana", type: "cash", is_personal: true, owner: users[1].id },
      { id: "e3333333-3333-3333-3333-333333333333", name: "Tarjeta Crédito Yoryana", type: "cc", is_personal: true, owner: users[1].id },
      
      // Cuentas familiares (compartidas)
      { id: "f1111111-1111-1111-1111-111111111111", name: "Cuenta Conjunta", type: "bank", is_personal: false, owner: null },
      { id: "f2222222-2222-2222-2222-222222222222", name: "Ahorros Familia", type: "bank", is_personal: false, owner: null },
      { id: "f3333333-3333-3333-3333-333333333333", name: "Gastos Hogar", type: "expense", is_personal: false, owner: null },
      { id: "f4444444-4444-4444-4444-444444444444", name: "Ingresos Familia", type: "income", is_personal: false, owner: null },
    ];

    for (const acc of accounts) {
      await client.query(
        `INSERT INTO app.accounts (id, household_id, name, type, currency, is_personal, owner_user_id)
         VALUES ($1, $2, $3, $4, 'COP', $5, $6)
         ON CONFLICT (household_id, name) DO UPDATE SET
           type = EXCLUDED.type,
           is_personal = EXCLUDED.is_personal,
           owner_user_id = EXCLUDED.owner_user_id`,
        [acc.id, householdId, acc.name, acc.type, acc.is_personal, acc.owner]
      );
      const tipo = acc.is_personal ? `Personal (${acc.owner === users[0].id ? "Jhon" : "Yoryana"})` : "Familiar";
      console.log(`✓ Cuenta: ${acc.name} [${tipo}]`);
    }

    console.log("\n¡Listo! Usuarios y cuentas creados.");
    console.log("\nCredenciales:");
    console.log("─────────────────────────────────────────────");
    for (const u of users) {
      console.log(`  ${u.email}`);
      console.log(`  Contraseña: ${u.password}`);
      console.log("");
    }
    console.log("Hogar ID:", householdId);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
