import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const seedPath = path.join(root, "scripts", "seed.sql");

// Cargar .env de server/ directamente
const serverEnvPath = path.join(root, "server", ".env");
if (fs.existsSync(serverEnvPath)) {
  const content = fs.readFileSync(serverEnvPath, "utf8");
  // Normalizar saltos de línea Windows/Unix
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    // Ignorar comentarios y líneas vacías
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

const migrationOrder = [
  "20260200120000_local_auth_schema.sql",
  "20260201120000_ledger.sql",
  "20260202120000_audit.sql",
  "20260203120000_analytics.sql",
  "20260204120000_monthly_close.sql",
  "20260205120000_alerts.sql",
  "20260206120000_auth_password.sql",
];

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/finanzas";

async function run() {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  try {
    for (const name of migrationOrder) {
      const filePath = path.join(migrationsDir, name);
      if (!fs.existsSync(filePath)) {
        console.warn("Skip (not found):", name);
        continue;
      }
      const sql = fs.readFileSync(filePath, "utf8");
      console.log("Run:", name);
      await client.query(sql);
    }
    if (fs.existsSync(seedPath)) {
      console.log("Run: seed.sql");
      await client.query(fs.readFileSync(seedPath, "utf8"));
    }
    console.log("Migraciones y seed listos.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
