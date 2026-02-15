import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Genera un ID único seguro usando crypto.randomUUID
 * Fallback para entornos donde no está disponible
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback manual (menos seguro pero funcional)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formatea un número como moneda (MXN)
 */
export function formatCurrency(
  amount: number,
  currency: string = "MXN",
  locale: string = "es-MX"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea una fecha a string legible
 */
export function formatDate(
  date: string | Date,
  locale: string = "es-MX",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Trunca texto con ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Calcula el porcentaje de forma segura
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 1
): number {
  if (total === 0) return 0;
  const percentage = (value / total) * 100;
  return Number(percentage.toFixed(decimals));
}

/**
 * Valida un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitiza input de texto para prevenir XSS básico
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remover < y >
    .trim()
    .substring(0, 500); // Limitar longitud
}

/**
 * Agrupa elementos por una clave
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Suma valores de un array de forma segura (evita problemas de precisión)
 */
export function sumBy<T>(
  array: T[],
  valueFn: (item: T) => number
): number {
  return array.reduce((sum, item) => {
    const value = valueFn(item);
    // Redondear a 2 decimales para evitar problemas de precisión
    return Math.round((sum + value) * 100) / 100;
  }, 0);
}

/**
 * Hook helper para debounce (usar con useCallback)
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Hook helper para throttle (usar con useCallback)
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
