import { spawn } from "child_process";
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

const migrationOrder = [
  "20260200120000_local_auth_schema.sql",
  "20260201120000_ledger.sql",
  "20260202120000_audit.sql",
  "20260203120000_analytics.sql",
  "20260204120000_monthly_close.sql",
  "20260205120000_alerts.sql",
  "20260206120000_auth_password.sql",
];

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/finanzas";
// URL a la BD por defecto (para crear 'finanzas' si no existe)
const DEFAULT_URL = DATABASE_URL.replace(/\/finanzas(\?.*)?$/, "/postgres$1");
const CONTAINER_NAME = "finanzas-pg";

function exec(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

async function dockerStart() {
  await exec("docker", ["start", CONTAINER_NAME]);
  console.log("Contenedor iniciado:", CONTAINER_NAME);
}

async function dockerCreate() {
  console.log("Creando contenedor PostgreSQL...");
  await exec("docker", [
    "run", "-d", "--name", CONTAINER_NAME,
    "-e", "POSTGRES_PASSWORD=postgres",
    "-e", "POSTGRES_DB=finanzas",
    "-p", "5432:5432",
    "postgres:16-alpine",
  ]);
}

async function dockerAvailable() {
  try {
    await exec("docker", ["info"]);
    return true;
  } catch {
    return false;
  }
}

async function ensureDatabase() {
  const pool = new pg.Pool({ connectionString: DEFAULT_URL });
  try {
    const r = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ["finanzas"]
    );
    if (r.rows.length === 0) {
      await pool.query("CREATE DATABASE finanzas");
      console.log("Base de datos 'finanzas' creada.");
    }
  } finally {
    await pool.end();
  }
}

async function waitForPg(url, maxAttempts = 30) {
  const pool = new pg.Pool({ connectionString: url });
  let lastErr = null;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await pool.query("SELECT 1");
      await pool.end();
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  await pool.end();
  throw lastErr || new Error("PostgreSQL no respondió a tiempo");
}

async function runMigrations() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    for (const name of migrationOrder) {
      const filePath = path.join(migrationsDir, name);
      if (!fs.existsSync(filePath)) continue;
      const sql = fs.readFileSync(filePath, "utf8");
      console.log("Migración:", name);
      await client.query(sql);
    }
    if (fs.existsSync(seedPath)) {
      console.log("Seed: seed.sql");
      await client.query(fs.readFileSync(seedPath, "utf8"));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  let useDocker = false;

  if (await dockerAvailable()) {
    console.log("1. Iniciando PostgreSQL (Docker)...");
    try {
      await dockerStart();
      useDocker = true;
    } catch {
      try {
        await dockerCreate();
        useDocker = true;
      } catch (err) {
        console.warn("Docker no pudo iniciar el contenedor:", err.message);
      }
    }
  } else {
    console.log("Docker no disponible. Usando Postgres en localhost:5432...");
  }

  if (useDocker) {
    console.log("2. Esperando conexión a Postgres...");
    await waitForPg(DATABASE_URL);
  } else {
    console.log("2. Comprobando Postgres en localhost:5432...");
    try {
      await waitForPg(DEFAULT_URL);
    } catch (err) {
      const msg = err.message || String(err);
      console.error("No se pudo conectar a PostgreSQL.");
      console.error("  Error:", msg);
      console.error("");
      console.error("Comprueba:");
      console.error("  1. Que el servicio PostgreSQL esté en ejecución:");
      console.error("     Win+R → services.msc → busca 'postgresql' → Iniciar");
      console.error("  2. Que usuario y contraseña sean correctos en server/.env:");
      console.error("     DATABASE_URL=postgresql://USUARIO:CONTRASEÑA@localhost:5432/finanzas");
      console.error("  3. Si Postgres usa otro puerto, ponlo en DATABASE_URL (ej. :5433)");
      process.exit(1);
    }
    await ensureDatabase();
  }

  console.log("3. Ejecutando migraciones y seed...");
  await runMigrations();
  console.log("");
  console.log("Listo. Base de datos:", DATABASE_URL);
  console.log("Usuario de prueba: 11111111-1111-1111-1111-111111111111");
  console.log("Hogar de prueba: 22222222-2222-2222-2222-222222222222");
  console.log("Arranca el servidor: cd server && npm run dev");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
