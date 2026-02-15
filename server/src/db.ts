import pg from "pg";
import { config } from "./config.js";

// Validar que DATABASE_URL no contenga valores por defecto inseguros
const forbiddenPatterns = [
  "postgres:postgres",
  "password",
  "123456",
  "admin",
  "root:root",
];

for (const pattern of forbiddenPatterns) {
  if (config.DATABASE_URL.toLowerCase().includes(pattern)) {
    throw new Error(
      `DATABASE_URL contiene un patrón inseguro: "${pattern}". ` +
      `Por favor usa una contraseña segura.`
    );
  }
}

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  query_timeout: 30000,
});

// Manejo de errores del pool
pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err);
  process.exit(-1);
});

export type PoolClient = pg.PoolClient;

// Función helper para verificar conexión
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    console.error("Error conectando a la base de datos:", error);
    return false;
  }
}
