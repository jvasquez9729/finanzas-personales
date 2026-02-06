import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { requireAuth, requireHousehold } from "./auth.ts";
import * as ledger from "./ledger.ts";

const app = new Hono();

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

// Attach request ID for tracing
app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.res.headers.set("x-request-id", requestId);
  c.set("requestId", requestId);
  await next();
});

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: allowedOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "x-request-id"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-d3c93e65/health", (c) => {
  return c.json({ status: "ok" });
});

// Ledger API: require JWT + household membership
app.use("/ledger/*", requireAuth);
app.use("/ledger/*", requireHousehold);

app.get("/ledger/accounts", async (c) => {
  const householdId = c.get("householdId") as string;
  const ownerId = c.req.query("owner_id") ?? undefined;
  const accounts = await ledger.getAccounts(householdId, ownerId);
  return c.json({ data: accounts });
});

app.get("/ledger/balances", async (c) => {
  const householdId = c.get("householdId") as string;
  const balances = await ledger.getBalances(householdId);
  return c.json({ data: balances });
});

// PASO 2: feature flag contable — escrituras al ledger solo si LEDGER_WRITE_ENABLED es true/1
const LEDGER_WRITE_ENABLED = /^(true|1)$/i.test(
  Deno.env.get("LEDGER_WRITE_ENABLED") ?? "true"
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
  const result = await ledger.createTransaction({
    ...body,
    created_by: body.created_by ?? userId,
  });
  return c.json({ data: result }, 201);
});

// Global error handler for consistent JSON responses and traceability
app.onError((err, c) => {
  const requestId = c.get("requestId") ?? "unknown";
  const isValidation =
    err.message?.includes("must balance") ||
    err.message?.includes("amount_minor") ||
    err.message?.includes("currency");
  if (isValidation) {
    return c.json({ error: "validation_error", message: err.message, requestId }, 400);
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

Deno.serve(app.fetch);