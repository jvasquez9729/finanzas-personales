-- Seed mínimo para desarrollo local: un usuario y un hogar.
-- Idempotente: ON CONFLICT DO NOTHING.

INSERT INTO auth.users (id) VALUES ('11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.users (id, name, email, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Usuario local', 'local@test', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.households (id, name)
VALUES ('22222222-2222-2222-2222-222222222222', 'Mi Hogar')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.household_members (household_id, user_id, role)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin')
ON CONFLICT (household_id, user_id) DO NOTHING;
