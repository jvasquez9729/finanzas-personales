import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimiter } from "hono-rate-limiter";
import { config } from "./config.js";
import { pool, checkDatabaseConnection } from "./db.js";
import { requireAuth, requireHousehold } from "./auth.js";
import * as ledger from "./ledger.js";
import { auth } from "./auth-routes.js";
import {
  createTransactionSchema,
  formatZodErrors,
} from "./validators.js";

const app = new Hono();

// Parsear y validar orígenes permitidos
const validOrigins = config.ALLOWED_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .filter((origin) => {
    try {
      const url = new URL(origin);
      // Solo permitir https en producción
      if (config.NODE_ENV === "production" && url.protocol !== "https:") {
        console.warn(`⚠️  Origen no seguro ignorado: ${origin}`);
        return false;
      }
      return true;
    } catch {
      console.error(`❌ Origen CORS inválido: ${origin}`);
      return false;
    }
  });

// Request ID middleware
app.use("*", async (c, next) => {
  const requestId =
    (c.req.header("x-request-id") as string | undefined) ?? crypto.randomUUID();
  c.header("x-request-id", requestId);
  c.set("requestId", requestId);
  await next();
});

// Logger (solo en desarrollo)
if (config.NODE_ENV === "development") {
  app.use("*", logger());
}

// CORS configurado de forma segura
app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Rechazar si no hay origin (requests no-browser)
      if (!origin) return null;
      // Permitir solo orígenes explícitamente configurados
      return validOrigins.includes(origin) ? origin : null;
    },
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-household-id",
      "x-request-id",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400, // 24 horas para preflight caching
  })
);

// Rate limiting para login (protección contra fuerza bruta)
const loginLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => {
    return (
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      "unknown"
    );
  },
  handler: (c) => {
    return c.json(
      {
        error: "too_many_requests",
        message: "Demasiados intentos de login. Intenta más tarde.",
        retryAfter: Math.ceil(15 * 60),
      },
      429
    );
  },
});

// Rate limiting general para API
const apiLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  keyGenerator: (c) => {
    const userId = c.get("userId") as string | undefined;
    return (
      userId ||
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      "unknown"
    );
  },
  handler: (c) => {
    return c.json(
      {
        error: "rate_limit_exceeded",
        message: "Límite de requests excedido. Intenta más tarde.",
      },
      429
    );
  },
});

// Health check con verificación de base de datos
app.get("/make-server-d3c93e65/health", async (c) => {
  const dbHealthy = await checkDatabaseConnection();
  const status = dbHealthy ? 200 : 503;
  
  return c.json(
    {
      status: dbHealthy ? "ok" : "error",
      database: dbHealthy ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
    },
    status
  );
});

// Ruta raíz informativa
app.get("/", (c) => {
  return c.json({
    name: "Finanzas Personales API",
    version: "1.0.0",
    environment: config.NODE_ENV,
    endpoints: {
      health: "GET /make-server-d3c93e65/health",
      login: "POST /auth/login",
      me: "GET /auth/me",
      accounts: "GET /ledger/accounts",
      balances: "GET /ledger/balances",
      transactions: "POST /ledger/transactions",
    },
  });
});

// Aplicar rate limiting específico a login
app.use("/auth/login", loginLimiter);

// Rutas de autenticación (sin JWT requerido)
app.route("/auth", auth);

// Middleware de autenticación para rutas protegidas
app.use("/ledger/*", apiLimiter);
app.use("/ledger/*", requireAuth);
app.use("/ledger/*", requireHousehold);

app.get("/ledger/accounts", async (c) => {
  const householdId = c.get("householdId") as string;
  const ownerId = c.req.query("owner_id") ?? undefined;
  const client = await pool.connect();
  try {
    const accounts = await ledger.getAccounts(client, householdId, ownerId);
    return c.json({ data: accounts });
  } finally {
    client.release();
  }
});

app.get("/ledger/balances", async (c) => {
  const householdId = c.get("householdId") as string;
  const client = await pool.connect();
  try {
    const balances = await ledger.getBalances(client, householdId);
    return c.json({ data: balances });
  } finally {
    client.release();
  }
});

app.post("/ledger/transactions", async (c) => {
  const householdId = c.get("householdId") as string;
  const userId = c.get("userId") as string;
  const requestId = (c.get("requestId") ?? "unknown") as string;

  // Validar body con Zod
  const body = await c.req.json();
  const validation = createTransactionSchema.safeParse(body);

  if (!validation.success) {
    return c.json(
      {
        error: "validation_error",
        message: "Datos de entrada inválidos",
        details: formatZodErrors(validation.error),
        requestId,
      },
      400
    );
  }

  const validatedData = validation.data;

  if (validatedData.household_id !== householdId) {
    return c.json(
      {
        error: "household_mismatch",
        message: "El household_id no coincide con el contexto",
        requestId,
      },
      400
    );
  }

  if (!config.LEDGER_WRITE_ENABLED) {
    await ledger.logBlockedLedgerWrite({
      household_id: householdId,
      user_id: userId,
      request_id: requestId,
      path: "/ledger/transactions",
      reason: "LEDGER_WRITE_ENABLED is false",
    });
    return c.json(
      {
        error: "ledger_write_disabled",
        message: "Writing to the ledger is currently disabled.",
        requestId,
      },
      503
    );
  }

  const client = await pool.connect();
  try {
    const result = await ledger.createTransaction(client, {
      ...validatedData,
      created_by: userId,
    });
    return c.json({ data: result }, 201);
  } finally {
    client.release();
  }
});

// Error handler mejorado
app.onError((err, c) => {
  const requestId = (c.get("requestId") ?? "unknown") as string;
  const isValidation =
    err.message?.includes("must balance") ||
    err.message?.includes("amount_minor") ||
    err.message?.includes("currency") ||
    err.message?.includes("validation");

  if (isValidation) {
    return c.json(
      {
        error: "validation_error",
        message: err.message,
        requestId,
      },
      400
    );
  }

  // Log detallado solo en desarrollo
  if (config.NODE_ENV === "development") {
    console.error("[server_error]", {
      requestId,
      path: c.req.path,
      method: c.req.method,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Producción: log mínimo sin stack traces
    console.error("[server_error]", {
      requestId,
      path: c.req.path,
      method: c.req.method,
      errorType: err.constructor.name,
    });
  }

  return c.json(
    {
      error: "internal_error",
      message: config.NODE_ENV === "development" ? err.message : "Error interno del servidor",
      requestId,
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  const requestId = (c.get("requestId") ?? "unknown") as string;
  return c.json(
    {
      error: "not_found",
      message: "Endpoint no encontrado",
      requestId,
    },
    404
  );
});

const port = config.PORT;
serve({ fetch: app.fetch, port }, () => {
  console.log(`✅ Ledger API running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/make-server-d3c93e65/health`);
  console.log(`🔧 Environment: ${config.NODE_ENV}`);
});
