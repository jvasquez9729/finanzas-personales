import { z } from "zod";

// Validación de email
const emailSchema = z.string().email("Email inválido").max(255).toLowerCase().trim();

// Validación de contraseña (mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número)
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña no puede exceder 128 caracteres")
  .regex(/[a-z]/, "Debe contener al menos una minúscula")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[0-9]/, "Debe contener al menos un número");

// Schema de login
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

// Schema para ledger entry
export const ledgerEntrySchema = z.object({
  account_id: z.string().uuid("account_id debe ser un UUID válido"),
  user_id: z.string().uuid("user_id debe ser un UUID válido").optional().nullable(),
  category: z.string().max(100, "La categoría no puede exceder 100 caracteres").optional().nullable(),
  direction: z.enum(["debit", "credit"], {
    errorMap: () => ({ message: "direction debe ser 'debit' o 'credit'" }),
  }),
  amount_minor: z
    .number()
    .int("amount_minor debe ser un entero")
    .positive("amount_minor debe ser positivo")
    .max(1000000000, "amount_minor excede el límite máximo"),
  currency: z
    .string()
    .length(3, "currency debe tener 3 caracteres (ISO 4217)")
    .regex(/^[A-Z]{3}$/, "currency debe estar en mayúsculas (ej: MXN, USD)"),
});

export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;

// Schema para crear transacción
export const createTransactionSchema = z.object({
  household_id: z.string().uuid("household_id debe ser un UUID válido"),
  occurred_at: z.string().datetime("occurred_at debe ser una fecha válida en formato ISO 8601"),
  description: z
    .string()
    .min(1, "La descripción es requerida")
    .max(500, "La descripción no puede exceder 500 caracteres"),
  external_ref: z
    .string()
    .max(255, "external_ref no puede exceder 255 caracteres")
    .optional()
    .nullable(),
  entries: z
    .array(ledgerEntrySchema)
    .min(2, "Se requieren al menos 2 entries para doble entrada contable"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Schema para UUID
export const uuidSchema = z.string().uuid();

// Función helper para validar y formatear errores de Zod
export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
}
