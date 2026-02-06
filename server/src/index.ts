import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { pool } from "./db.js";
import { requireAuth, requireHousehold } from "./auth.js";
import * as ledger from "./ledger.js";
import { auth } from "./auth-routes.js";

const app = new Hono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use("*", async (c, next) => {
  const requestId =
    (c.req.header("x-request-id") as string | undefined) ?? crypto.randomUUID();
  c.header("x-request-id", requestId);
  c.set("requestId", requestId);
  await next();
});

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: allowedOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "x-request-id"],
    maxAge: 600,
  })
);

app.get("/make-server-d3c93e65/health", (c) => {
  return c.json({ status: "ok" });
});

// Ruta raíz informativa
app.get("/", (c) => {
  return c.json({
    name: "Finanzas Personales API",
    version: "1.0.0",
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

// Rutas de autenticación (sin JWT requerido)
app.route("/auth", auth);

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

const LEDGER_WRITE_ENABLED = /^(true|1)$/i.test(
  process.env.LEDGER_WRITE_ENABLED ?? "true"
);

app.post("/ledger/transactions", async (c) => {
  const householdId = c.get("householdId") as string;
  const userId = c.get("userId") as string;
  const requestId = (c.get("requestId") ?? "unknown") as string;
  const body = (await c.req.json()) as ledger.CreateTransactionInput;
  if (body.household_id !== householdId) {
    return c.json({ error: "household_mismatch" }, 400);
  }
  if (!LEDGER_WRITE_ENABLED) {
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
      ...body,
      created_by: body.created_by ?? userId,
    });
    return c.json({ data: result }, 201);
  } finally {
    client.release();
  }
});

app.onError((err, c) => {
  const requestId = (c.get("requestId") ?? "unknown") as string;
  const isValidation =
    err.message?.includes("must balance") ||
    err.message?.includes("amount_minor") ||
    err.message?.includes("currency");
  if (isValidation) {
    return c.json(
      { error: "validation_error", message: err.message, requestId },
      400
    );
  }
  console.error("[server_error]", {
    requestId,
    path: c.req.path,
    method: c.req.method,
    message: err.message,
    stack: err.stack,
  });
  return c.json({ error: "internal_error", requestId }, 500);
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Ledger API listening on http://localhost:${port}`);
});
