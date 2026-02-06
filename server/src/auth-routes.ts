import { Hono } from "hono";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { pool } from "./db.js";

const auth = new Hono();

interface LoginBody {
  email: string;
  password: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  status: string;
}

auth.post("/login", async (c) => {
  const body = (await c.req.json()) as LoginBody;
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "email and password required" }, 400);
  }

  const client = await pool.connect();
  try {
    const res = await client.query<UserRow>(
      "SELECT id, name, email, password_hash, status FROM app.users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (res.rows.length === 0) {
      return c.json({ error: "invalid_credentials", message: "Email o contraseña incorrectos" }, 401);
    }

    const user = res.rows[0];

    if (user.status !== "active") {
      return c.json({ error: "user_inactive", message: "Usuario inactivo" }, 403);
    }

    if (!user.password_hash) {
      return c.json({ error: "no_password", message: "Usuario sin contraseña configurada" }, 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return c.json({ error: "invalid_credentials", message: "Email o contraseña incorrectos" }, 401);
    }

    // Obtener hogares del usuario
    const householdsRes = await client.query(
      `SELECT h.id, h.name, hm.role 
       FROM app.households h 
       JOIN app.household_members hm ON hm.household_id = h.id 
       WHERE hm.user_id = $1`,
      [user.id]
    );

    const households = householdsRes.rows as Array<{ id: string; name: string; role: string }>;

    // Generar JWT
    const secret = process.env.JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      return c.json({ error: "internal_error", message: "JWT secret not configured" }, 500);
    }

    const secretKey = new TextEncoder().encode(secret);
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey);

    return c.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      households,
    });
  } finally {
    client.release();
  }
});

// Endpoint para verificar token y obtener info del usuario
auth.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const secret = process.env.JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    return c.json({ error: "internal_error" }, 500);
  }

  try {
    const { jwtVerify } = await import("jose");
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);

    const userId = payload.sub as string;
    const client = await pool.connect();
    try {
      const userRes = await client.query(
        "SELECT id, name, email, status FROM app.users WHERE id = $1",
        [userId]
      );

      if (userRes.rows.length === 0) {
        return c.json({ error: "user_not_found" }, 404);
      }

      const user = userRes.rows[0];

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
  } catch {
    return c.json({ error: "invalid_token" }, 401);
  }
});

export { auth };
