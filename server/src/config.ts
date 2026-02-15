import { z } from "zod";

// Schema de validación para variables de entorno
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerida"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  PORT: z
    .string()
    .default("3001")
    .transform((val) => parseInt(val, 10)),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  LEDGER_WRITE_ENABLED: z
    .string()
    .default("true")
    .transform((val) => /^(true|1)$/i.test(val)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Validar y parsear variables de entorno
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Error en variables de entorno:");
  parsedEnv.error.errors.forEach((error) => {
    console.error(`  - ${error.path.join(".")}: ${error.message}`);
  });
  process.exit(1);
}

export const config = parsedEnv.data;

// Validación adicional de seguridad para JWT_SECRET
const forbiddenSecrets = [
  "dev-secret",
  "secret",
  "test",
  "password",
  "123456",
  "jwt-secret",
  "your-secret-key",
];

if (forbiddenSecrets.includes(config.JWT_SECRET.toLowerCase())) {
  console.error("❌ JWT_SECRET no puede usar un valor por defecto o débil");
  console.error("   Genera uno seguro con: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
  process.exit(1);
}

if (config.NODE_ENV === "production") {
  // Verificaciones adicionales para producción
  if (config.JWT_SECRET.length < 64) {
    console.warn("⚠️  Advertencia: JWT_SECRET debería tener al menos 64 caracteres en producción");
  }
  
  if (config.ALLOWED_ORIGINS.includes("localhost")) {
    console.warn("⚠️  Advertencia: ALLOWED_ORIGINS incluye localhost en producción");
  }
}
