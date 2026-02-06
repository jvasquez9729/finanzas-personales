-- Añadir campo password_hash a app.users para autenticación local
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Índice para búsqueda por email (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON app.users(email);

COMMENT ON COLUMN app.users.password_hash IS 'Hash bcrypt de la contraseña del usuario';
