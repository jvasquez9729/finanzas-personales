import { useState, useCallback } from 'react';
import type { Transaction } from '@/types/finance';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './useTransactions';

export interface CSVColumnMapping {
  date: string;
  description: string;
  amount: string;
  type?: string;
  category?: string;
}

export interface CSVImportOptions {
  dateFormat: string;
  delimiter: string;
  hasHeader: boolean;
  skipRows: number;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: Transaction['type'];
  category: string;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
}

export interface CSVPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

// Mapeo inteligente de categorías por palabras clave
const categoryKeywords: Record<string, string[]> = {
  // Gastos
  food: ['supermercado', 'walmart', 'soriana', 'oxxo', '7-eleven', 'costco', 'restaurante', 'comida', 'cafe', 'starbucks'],
  transport: ['gasolina', 'pemex', 'uber', 'didi', 'cabify', 'metro', 'camion', 'transporte', 'estacionamiento'],
  housing: ['renta', 'hipoteca', 'agua', 'luz', 'cfe', 'gas', 'mantenimiento', 'reparacion'],
  entertainment: ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'cine', 'evento', 'concierto'],
  health: ['farmacia', 'hospital', 'doctor', 'dentista', 'gimnasio', 'seguro medico', 'vitamina'],
  shopping: ['amazon', 'mercado libre', 'liverpool', 'palacio de hierro', 'zara', 'h&m', 'ropa'],
  utilities: ['telcel', 'att', 'movistar', 'internet', 'izzi', 'totalplay', 'infinitum'],
  education: ['libro', 'curso', 'udemy', 'coursera', 'colegiatura', 'universidad', 'escuela'],
  // Ingresos
  salary: ['nomina', 'salario', 'sueldo', 'pago'],
  freelance: ['freelance', 'proyecto', 'consultoria', 'honorarios'],
  investments: ['dividendo', 'interes', 'cetes', 'rendimiento'],
};

function detectCategory(description: string): string {
  const desc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return category;
    }
  }
  
  return 'other';
}

function parseAmount(amountStr: string): number {
  // Limpiar el string
  const cleaned = amountStr
    .replace(/[$,\s]/g, '')
    .replace(/\((.*)\)/, '-$1'); // Montos entre paréntesis son negativos
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

function parseDate(dateStr: string, format: string): string | null {
  try {
    // Formatos comunes: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    let day, month, year;
    
    if (format === 'DD/MM/YYYY') {
      [day, month, year] = dateStr.split(/[/\-]/);
    } else if (format === 'MM/DD/YYYY') {
      [month, day, year] = dateStr.split(/[/\-]/);
    } else if (format === 'YYYY-MM-DD') {
      [year, month, day] = dateStr.split(/[/\-]/);
    } else {
      // Intentar autodetectar
      const parts = dateStr.split(/[/\-]/);
      if (parts[0].length === 4) {
        [year, month, day] = parts;
      } else if (parseInt(parts[0]) > 12) {
        [day, month, year] = parts;
      } else {
        [month, day, year] = parts;
      }
    }
    
    // Asegurar formato de 4 dígitos para el año
    if (year.length === 2) {
      const yearNum = parseInt(year);
      year = yearNum >= 50 ? `19${year}` : `20${year}`;
    }
    
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toISOString();
  } catch {
    return null;
  }
}

export function useCSVImport(existingTransactions: Transaction[] = []) {
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Leer archivo CSV
  const readFile = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, []);

  // Parsear CSV
  const parseCSV = useCallback((content: string, options: CSVImportOptions): CSVPreview => {
    const lines = content.split('\n').filter(line => line.trim());
    const delimiter = options.delimiter;
    
    // Saltar filas iniciales
    const startIndex = options.skipRows;
    const dataLines = lines.slice(startIndex);
    
    if (dataLines.length === 0) {
      return { headers: [], rows: [], totalRows: 0 };
    }
    
    let headers: string[] = [];
    let rows: string[][] = [];
    
    if (options.hasHeader) {
      headers = dataLines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
      rows = dataLines.slice(1).map(line => 
        line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
      );
    } else {
      rows = dataLines.map(line => 
        line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
      );
      headers = rows[0].map((_, i) => `Columna ${i + 1}`);
    }
    
    return { headers, rows: rows.slice(0, 10), totalRows: rows.length };
  }, []);

  // Detectar duplicados
  const isDuplicate = useCallback((transaction: ParsedTransaction): boolean => {
    return existingTransactions.some(existing => {
      const dateMatch = existing.date.split('T')[0] === transaction.date.split('T')[0];
      const amountMatch = Math.abs(existing.amount) === Math.abs(transaction.amount);
      const descMatch = existing.description.toLowerCase().trim() === transaction.description.toLowerCase().trim();
      return dateMatch && amountMatch && descMatch;
    });
  }, [existingTransactions]);

  // Procesar transacciones
  const processTransactions = useCallback((
    preview: CSVPreview,
    mapping: CSVColumnMapping,
    options: CSVImportOptions
  ): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];
    
    // Obtener todas las filas (no solo las del preview)
    const allRows = preview.rows;
    
    for (const row of allRows) {
      const errors: string[] = [];
      
      // Extraer valores
      const dateStr = row[parseInt(mapping.date)] || '';
      const description = row[parseInt(mapping.description)] || '';
      const amountStr = row[parseInt(mapping.amount)] || '';
      const typeStr = mapping.type ? row[parseInt(mapping.type)] : '';
      const categoryStr = mapping.category ? row[parseInt(mapping.category)] : '';
      
      // Validar y parsear
      const date = parseDate(dateStr, options.dateFormat);
      if (!date) errors.push('Fecha inválida');
      
      const amount = parseAmount(amountStr);
      if (amount === 0) errors.push('Monto inválido');
      
      if (!description) errors.push('Descripción vacía');
      
      // Determinar tipo
      let type: Transaction['type'];
      if (typeStr) {
        const typeLower = typeStr.toLowerCase();
        if (typeLower.includes('ingreso') || typeLower.includes('deposito')) {
          type = amount > 0 ? 'fixed_income' : 'variable_income';
        } else {
          type = amount < 0 ? 'fixed_expense' : 'variable_expense';
        }
      } else {
        type = amount < 0 ? 'variable_expense' : 'variable_income';
      }
      
      // Detectar categoría
      const category = categoryStr || detectCategory(description);
      
      const transaction: ParsedTransaction = {
        date: date || new Date().toISOString(),
        description,
        amount: Math.abs(amount),
        type,
        category,
        isValid: errors.length === 0,
        errors,
        isDuplicate: false,
      };
      
      transaction.isDuplicate = isDuplicate(transaction);
      transactions.push(transaction);
    }
    
    return transactions;
  }, [isDuplicate]);

  // Cargar archivo
  const loadFile = useCallback(async (file: File, options: CSVImportOptions) => {
    setIsLoading(true);
    try {
      const content = await readFile(file);
      const csvPreview = parseCSV(content, options);
      setPreview(csvPreview);
      setParsedTransactions([]);
      return csvPreview;
    } finally {
      setIsLoading(false);
    }
  }, [readFile, parseCSV]);

  // Importar transacciones
  const importTransactions = useCallback((
    preview: CSVPreview,
    mapping: CSVColumnMapping,
    options: CSVImportOptions,
    selectedIndices: number[]
  ): ParsedTransaction[] => {
    const allTransactions = processTransactions(preview, mapping, options);
    const selected = selectedIndices.map(i => allTransactions[i]).filter(t => t.isValid && !t.isDuplicate);
    return selected;
  }, [processTransactions]);

  // Detectar mapeo automático
  const autoDetectMapping = useCallback((headers: string[]): Partial<CSVColumnMapping> => {
    const mapping: Partial<CSVColumnMapping> = {};
    
    const headerLower = headers.map(h => h.toLowerCase());
    
    // Detectar fecha
    const dateIndex = headerLower.findIndex(h => 
      h.includes('fecha') || h.includes('date') || h.includes('dia') || h.includes('day')
    );
    if (dateIndex !== -1) mapping.date = dateIndex.toString();
    
    // Detectar descripción
    const descIndex = headerLower.findIndex(h => 
      h.includes('descrip') || h.includes('concepto') || h.includes('detalle') || 
      h.includes('description') || h.includes('concept')
    );
    if (descIndex !== -1) mapping.description = descIndex.toString();
    
    // Detectar monto
    const amountIndex = headerLower.findIndex(h => 
      h.includes('monto') || h.includes('cantidad') || h.includes('importe') || 
      h.includes('amount') || h.includes('cargo') || h.includes('abono')
    );
    if (amountIndex !== -1) mapping.amount = amountIndex.toString();
    
    return mapping;
  }, []);

  return {
    preview,
    parsedTransactions,
    isLoading,
    loadFile,
    importTransactions,
    autoDetectMapping,
    setParsedTransactions,
  };
}
