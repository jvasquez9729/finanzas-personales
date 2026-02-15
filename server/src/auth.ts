import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import { config } from "./config.js";
import { uuidSchema } from "./validators.js";

/**
 * Middleware para requerir autenticación JWT
 */
export async function requireAuth(c: Context, next: Next) {
  const requestId = c.get("requestId") as string;
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return c.json(
      {
        error: "unauthorized",
        message: "Token de autenticación requerido",
        requestId,
      },
      401
    );
  }

  try {
    const secretKey = new TextEncoder().encode(config.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: "finanzas-api",
      audience: "finanzas-web",
    });

    const userId = payload.sub;
    if (!userId) {
      throw new Error("Token sin subject");
    }

    c.set("userId", userId);
    await next();
  } catch (error) {
    console.error(`[SECURITY] JWT inválido: ${error}, requestId: ${requestId}`);
    return c.json(
      {
        error: "invalid_token",
        message: "Token inválido o expirado",
        requestId,
      },
      401
    );
  }
}

/**
 * Middleware para requerir household_id
 */
export async function requireHousehold(c: Context, next: Next) {
  const requestId = c.get("requestId") as string;
  const rawHouseholdId =
    c.req.header("x-household-id") ?? c.req.query("household_id");

  if (!rawHouseholdId) {
    return c.json(
      {
        error: "household_required",
        message: "Header x-household-id o query param household_id requerido",
        requestId,
      },
      400
    );
  }

  // Validar formato UUID
  const validation = uuidSchema.safeParse(rawHouseholdId);
  if (!validation.success) {
    return c.json(
      {
        error: "invalid_household_id",
        message: "household_id debe ser un UUID válido",
        requestId,
      },
      400
    );
  }

  c.set("householdId", validation.data);
  await next();
}
