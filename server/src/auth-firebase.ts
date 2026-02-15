/**
 * Middleware de autenticación usando Firebase Auth
 * Opción B: Firebase Auth + PostgreSQL Backend
 */
import type { Context, Next } from "hono";
import { auth } from "./firebase.js";
import { pool } from "./db.js";
import { uuidSchema } from "./validators.js";

/**
 * Middleware para requerir autenticación con Firebase
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

  // Modo desarrollo sin Firebase (fallback)
  if (!auth && process.env.NODE_ENV === "development") {
    console.warn("⚠️  Modo desarrollo: aceptando token sin validación");
    c.set("userId", "dev-user-id");
    await next();
    return;
  }

  if (!auth) {
    return c.json(
      {
        error: "auth_not_configured",
        message: "Servicio de autenticación no disponible",
        requestId,
      },
      500
    );
  }

  try {
    // Verificar token con Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);

    c.set("userId", decodedToken.uid);
    c.set("userEmail", decodedToken.email);
    c.set("userName", decodedToken.name || decodedToken.email?.split("@")[0]);

    // Sincronizar usuario con PostgreSQL (upsert automático)
    await syncUserToPostgres(decodedToken);

    await next();
  } catch (error) {
    console.error(
      `[SECURITY] Token inválido: ${error}, requestId: ${requestId}`
    );
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
 * Sincroniza el usuario de Firebase Auth a PostgreSQL
 * Crea el usuario si no existe, o actualiza sus datos
 */
async function syncUserToPostros(
  token: {
    uid: string;
    email?: string;
    name?: string;
  }
): Promise<void> {
  const client = await pool.connect();

  try {
    // Crear en auth.users (stub) si no existe
    await client.query(
      "INSERT INTO auth.users (id) VALUES ($1) ON CONFLICT DO NOTHING",
      [token.uid]
    );

    // Crear/actualizar en app.users
    await client.query(
      `INSERT INTO app.users (id, name, email, status) 
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (id) DO UPDATE 
       SET name = EXCLUDED.name, 
           email = EXCLUDED.email, 
           updated_at = now()
       WHERE app.users.id = EXCLUDED.id`,
      [
        token.uid,
        token.name || token.email?.split("@")[0] || "Usuario",
        token.email || null,
      ]
    );

    console.log(`[AUTH] Usuario sincronizado: ${token.uid}`);
  } catch (error) {
    console.error(`[AUTH] Error sincronizando usuario: ${error}`);
    // No lanzamos error para no interrumpir la request
    // El usuario puede existir en Firebase pero fallar en PostgreSQL
    // En producción, considera usar una cola de retry
  } finally {
    client.release();
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

  const householdId = validation.data;
  const userId = c.get("userId") as string;

  // Verificar que el usuario es miembro del household
  try {
    const client = await pool.connect();
    try {
      const memberCheck = await client.query(
        `SELECT 1 FROM app.household_members 
         WHERE household_id = $1 AND user_id = $2`,
        [householdId, userId]
      );

      if (memberCheck.rows.length === 0) {
        return c.json(
          {
            error: "not_member",
            message: "No eres miembro de este household",
            requestId,
          },
          403
        );
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[AUTH] Error verificando membresía: ${error}`);
    return c.json(
      {
        error: "internal_error",
        message: "Error verificando permisos",
        requestId,
      },
      500
    );
  }

  c.set("householdId", householdId);
  await next();
}

/**
 * Obtiene o crea un household por defecto para el usuario
 * Útil para onboarding de nuevos usuarios
 */
export async function getOrCreateDefaultHousehold(
  userId: string,
  userName: string
): Promise<string> {
  const client = await pool.connect();

  try {
    // Buscar si el usuario ya tiene un household
    const existing = await client.query(
      `SELECT household_id FROM app.household_members 
       WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].household_id;
    }

    // Crear nuevo household
    const householdResult = await client.query(
      `INSERT INTO app.households (name) 
       VALUES ($1) RETURNING id`,
      [`Household de ${userName}`]
    );

    const householdId = householdResult.rows[0].id;

    // Agregar usuario como admin
    await client.query(
      `INSERT INTO app.household_members (household_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [householdId, userId]
    );

    console.log(`[AUTH] Household creado para usuario ${userId}: ${householdId}`);

    return householdId;
  } finally {
    client.release();
  }
}
