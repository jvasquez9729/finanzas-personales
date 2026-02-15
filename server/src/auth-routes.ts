import { Hono } from "hono";
import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { pool } from "./db.js";
import { config } from "./config.js";
import { loginSchema, formatZodErrors } from "./validators.js";

const auth = new Hono();

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  status: string;
}

// Seguridad: número de rondas para bcrypt
const SALT_ROUNDS = 12;

auth.post("/login", async (c) => {
  const requestId = c.get("requestId") as string;
  
  // Validar body con Zod
  const body = await c.req.json();
  const validation = loginSchema.safeParse(body);

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

  const { email, password } = validation.data;

  const client = await pool.connect();
  try {
    const res = await client.query<UserRow>(
      "SELECT id, name, email, password_hash, status FROM app.users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (res.rows.length === 0) {
      // Tiempo constante para prevenir timing attacks
      await bcrypt.hash(password, SALT_ROUNDS);
      return c.json(
        {
          error: "invalid_credentials",
          message: "Email o contraseña incorrectos",
          requestId,
        },
        401
      );
    }

    const user = res.rows[0];

    if (user.status !== "active") {
      return c.json(
        {
          error: "user_inactive",
          message: "Usuario inactivo",
          requestId,
        },
        403
      );
    }

    if (!user.password_hash) {
      return c.json(
        {
          error: "no_password",
          message: "Usuario sin contraseña configurada",
          requestId,
        },
        401
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return c.json(
        {
          error: "invalid_credentials",
          message: "Email o contraseña incorrectos",
          requestId,
        },
        401
      );
    }

    // Obtener hogares del usuario
    const householdsRes = await client.query(
      `SELECT h.id, h.name, hm.role 
       FROM app.households h 
       JOIN app.household_members hm ON hm.household_id = h.id 
       WHERE hm.user_id = $1`,
      [user.id]
    );

    const households = householdsRes.rows as Array<{
      id: string;
      name: string;
      role: string;
    }>;

    // Generar JWT con claims estándar
    const secretKey = new TextEncoder().encode(config.JWT_SECRET);
    
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h") // Reducido de 7 días a 24 horas
      .setIssuer("finanzas-api")
      .setAudience("finanzas-web")
      .sign(secretKey);

    // Log de login exitoso (para auditoría)
    console.log(`[SECURITY] Login exitoso - userId: ${user.id}, email: ${user.email}, requestId: ${requestId}`);

    return c.json({
      token,
      expiresIn: 86400, // 24 horas en segundos
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      households,
    });
  } catch (error) {
    console.error(`[SECURITY] Error en login: ${error}, requestId: ${requestId}`);
    return c.json(
      {
        error: "internal_error",
        message: "Error interno del servidor",
        requestId,
      },
      500
    );
  } finally {
    client.release();
  }
});

// Endpoint para verificar token y obtener info del usuario
auth.get("/me", async (c) => {
  const requestId = c.get("requestId") as string;
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return c.json(
      {
        error: "unauthorized",
        message: "Token no proporcionado",
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

    const userId = payload.sub as string;
    const client = await pool.connect();
    try {
      const userRes = await client.query(
        "SELECT id, name, email, status FROM app.users WHERE id = $1",
        [userId]
      );

      if (userRes.rows.length === 0) {
        return c.json(
          {
            error: "user_not_found",
            message: "Usuario no encontrado",
            requestId,
          },
          404
        );
      }

      const user = userRes.rows[0];

      if (user.status !== "active") {
        return c.json(
          {
            error: "user_inactive",
            message: "Usuario inactivo",
            requestId,
          },
          403
        );
      }

      const householdsRes = await client.query(
        `SELECT h.id, h.name, hm.role 
         FROM app.households h 
         JOIN app.household_members hm ON hm.household_id = h.id 
         WHERE hm.user_id = $1`,
        [userId]
      );

      return c.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        households: householdsRes.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[SECURITY] Token inválido: ${error}, requestId: ${requestId}`);
    return c.json(
      {
        error: "invalid_token",
        message: "Token inválido o expirado",
        requestId,
      },
      401
    );
  }
});

export { auth };
