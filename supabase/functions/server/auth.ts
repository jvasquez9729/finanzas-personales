import { Context, Next } from "npm:hono";
import { jwtVerify } from "npm:jose@5.2.0";
import { isMember } from "./ledger.ts";

const JWT_SECRET_ENV = "SUPABASE_JWT_SECRET";

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return c.json({ error: "unauthorized", message: "Missing Bearer token" }, 401);
  }
  const secretEnv = Deno.env.get(JWT_SECRET_ENV);
  if (!secretEnv) {
    console.error("Missing " + JWT_SECRET_ENV);
    return c.json({ error: "internal_error", message: "Auth not configured" }, 500);
  }
  try {
    const secret = new TextEncoder().encode(secretEnv);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    if (!userId) {
      return c.json({ error: "invalid_token", message: "No sub in token" }, 401);
    }
    c.set("userId", userId);
    await next();
  } catch (_e) {
    return c.json({ error: "invalid_token", message: "Invalid or expired token" }, 401);
  }
}

export async function requireHousehold(c: Context, next: Next) {
  const householdId = c.req.header("x-household-id") ?? c.req.query("household_id");
  if (!householdId) {
    return c.json(
      { error: "household_required", message: "Header x-household-id or query household_id required" },
      400
    );
  }
  const userId = c.get("userId") as string;
  const ok = await isMember(householdId, userId);
  if (!ok) {
    return c.json({ error: "forbidden", message: "Not a member of this household" }, 403);
  }
  c.set("householdId", householdId);
  await next();
}
