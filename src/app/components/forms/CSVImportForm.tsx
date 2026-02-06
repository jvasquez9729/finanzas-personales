import { useState, useCallback } from 'react';
import { useCSVImport, CSVColumnMapping, CSVImportOptions, ParsedTransaction } from '@/hooks/useCSVImport';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { Transaction } from '@/types/finance';

interface CSVImportFormProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  existingTransactions: Transaction[];
  users: { userA: string; userB: string };
  currentUser: string;
}

export function CSVImportForm({
  isOpen,
  onClose,
  onImport,
  existingTransactions,
  users,
  currentUser,
}: CSVImportFormProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<CSVImportOptions>({
    dateFormat: 'DD/MM/YYYY',
    delimiter: ',',
    hasHeader: true,
    skipRows: 0,
  });
  const [mapping, setMapping] = useState<CSVColumnMapping>({
    date: '',
    description: '',
    amount: '',
    category: '',
  });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);

  const {
    preview,
    isLoading,
    loadFile,
    importTransactions,
    autoDetectMapping,
  } = useCSVImport(existingTransactions);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.txt'))) {
      setFile(droppedFile);
      await processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      await processFile(selectedFile);
    }
  }, []);

  const processFile = async (fileToProcess: File) => {
    const result = await loadFile(fileToProcess, options);
    if (result.headers.length > 0) {
      const autoMapping = autoDetectMapping(result.headers);
      setMapping({
        date: autoMapping.date || '',
        description: autoMapping.description || '',
        amount: autoMapping.amount || '',
        category: autoMapping.category || '',
      });
      setStep('mapping');
    }
  };

  const handleProcessPreview = () => {
    if (!preview) return;
    
    const data = importTransactions(
      preview,
      mapping,
      options,
      Array.from({ length: preview.totalRows }, (_, i) => i)
    );
    setParsedData(data);
    
    // Pre-seleccionar filas válidas y no duplicadas
    const validIndices = new Set<number>();
    data.forEach((tx, index) => {
      if (tx.isValid && !tx.isDuplicate) validIndices.add(index);
    });
    setSelectedRows(validIndices);
    
    setStep('preview');
  };

  const handleImport = () => {
    const selected = parsedData.filter((_, index) => selectedRows.has(index));
    const transactions = selected.map(tx => ({
      type: tx.type,
      description: tx.description,
      amount: tx.type.includes('expense') ? -tx.amount : tx.amount,
      category: tx.category,
      date: tx.date,
      userId: currentUser,
      isShared: false,
      isRecurring: false,
    }));
    
    onImport(transactions);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep('upload');
    setFile(null);
    setMapping({ date: '', description: '', amount: '', category: '' });
    setSelectedRows(new Set());
    setParsedData([]);
  };

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const selectAllValid = () => {
    const validIndices = new Set<number>();
    parsedData.forEach((tx, index) => {
      if (tx.isValid && !tx.isDuplicate) validIndices.add(index);
    });
    setSelectedRows(validIndices);
  };

  const deselectAll = () => {
    setSelectedRows(new Set());
  };

  const validCount = parsedData.filter(tx => tx.isValid && !tx.isDuplicate).length;
  const duplicateCount = parsedData.filter(tx => tx.isDuplicate).length;
  const errorCount = parsedData.filter(tx => !tx.isValid).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Importar Transacciones'}
            {step === 'mapping' && 'Mapear Columnas'}
            {step === 'preview' && 'Revisar Transacciones'}
          </DialogTitle>
        </DialogHeader>

        {/* Paso 1: Subir archivo */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center hover:border-zinc-500 transition-colors cursor-pointer"
            >
              <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-zinc-300 mb-2">Arrastra un archivo CSV aquí</p>
              <p className="text-zinc-500 text-sm mb-4">o</p>
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <Button variant="outline" className="border-zinc-700">
                  <FileText className="w-4 h-4 mr-2" />
                  Seleccionar archivo
                </Button>
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Formato de fecha</Label>
                <Select 
                  value={options.dateFormat} 
                  onValueChange={(v) => setOptions({ ...options, dateFormat: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="DD/MM/YYYY" className="text-zinc-100">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY" className="text-zinc-100">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD" className="text-zinc-100">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Separador</Label>
                <Select 
                  value={options.delimiter} 
                  onValueChange={(v) => setOptions({ ...options, delimiter: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="," className="text-zinc-100">Coma (,)</SelectItem>
                    <SelectItem value=";" className="text-zinc-100">Punto y coma (;)</SelectItem>
                    <SelectItem value="\t" className="text-zinc-100">Tabulador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="has-header"
                checked={options.hasHeader}
                onCheckedChange={(checked) => setOptions({ ...options, hasHeader: checked as boolean })}
              />
              <Label htmlFor="has-header" className="text-sm text-zinc-400">
                El archivo tiene encabezados en la primera fila
              </Label>
            </div>
          </div>
        )}

        {/* Paso 2: Mapear columnas */}
        {step === 'mapping' && preview && (
          <div className="space-y-6">
            <Alert className="bg-blue-950/20 border-blue-800">
              <AlertDescription className="text-blue-200">
                Selecciona qué columna corresponde a cada campo. Hemos intentado detectarlo automáticamente.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-red-400">Fecha *</Label>
                <Select value={mapping.date} onValueChange={(v) => setMapping({ ...mapping, date: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Seleccionar columna" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {preview.headers.map((header, i) => (
                      <SelectItem key={i} value={i.toString()} className="text-zinc-100">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-red-400">Descripción *</Label>
                <Select value={mapping.description} onValueChange={(v) => setMapping({ ...mapping, description: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Seleccionar columna" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {preview.headers.map((header, i) => (
                      <SelectItem key={i} value={i.toString()} className="text-zinc-100">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-red-400">Monto *</Label>
                <Select value={mapping.amount} onValueChange={(v) => setMapping({ ...mapping, amount: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Seleccionar columna" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {preview.headers.map((header, i) => (
                      <SelectItem key={i} value={i.toString()} className="text-zinc-100">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoría (opcional)</Label>
                <Select value={mapping.category} onValueChange={(v) => setMapping({ ...mapping, category: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Seleccionar columna" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="" className="text-zinc-100">No importar</SelectItem>
                    {preview.headers.map((header, i) => (
                      <SelectItem key={i} value={i.toString()} className="text-zinc-100">
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Vista previa (primeras 5 filas)</Label>
              <div className="border border-zinc-800 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      {preview.headers.map((header, i) => (
                        <TableHead key={i} className="text-zinc-400">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i} className="border-zinc-800">
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-zinc-300">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <p className="text-sm text-zinc-500">Total de filas: {preview.totalRows}</p>
          </div>
        )}

        {/* Paso 3: Preview y selección */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="outline" className="border-emerald-600 text-emerald-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                {validCount} válidas
              </Badge>
              {duplicateCount > 0 && (
                <Badge variant="outline" className="border-amber-600 text-amber-400">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {duplicateCount} duplicadas
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="outline" className="border-red-600 text-red-400">
                  <XCircle className="w-3 h-3 mr-1" />
                  {errorCount} con error
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllValid} className="border-zinc-700">
                Seleccionar válidas
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll} className="border-zinc-700">
                Deseleccionar todo
              </Button>
            </div>

            <div className="border border-zinc-800 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="text-zinc-400">Fecha</TableHead>
                    <TableHead className="text-zinc-400">Descripción</TableHead>
                    <TableHead className="text-zinc-400">Monto</TableHead>
                    <TableHead className="text-zinc-400">Tipo</TableHead>
                    <TableHead className="text-zinc-400">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((tx, index) => (
                    <TableRow 
                      key={index} 
                      className={`border-zinc-800 ${!tx.isValid || tx.isDuplicate ? 'opacity-50' : ''}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(index)}
                          onCheckedChange={() => toggleRowSelection(index)}
                          disabled={!tx.isValid || tx.isDuplicate}
                        />
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {new Date(tx.date).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell className="text-zinc-300">{tx.description}</TableCell>
                      <TableCell className={tx.type.includes('income') ? 'text-emerald-400' : 'text-red-400'}>
                        ${tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {tx.type.includes('income') ? 'Ingreso' : 'Gasto'}
                      </TableCell>
                      <TableCell>
                        {tx.isDuplicate ? (
                          <Badge variant="outline" className="border-amber-600 text-amber-400 text-xs">
                            Duplicado
                          </Badge>
                        ) : !tx.isValid ? (
                          <Badge variant="outline" className="border-red-600 text-red-400 text-xs">
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-600 text-emerald-400 text-xs">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-zinc-500">
              {selectedRows.size} de {validCount} transacciones seleccionadas para importar
            </p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={onClose} className="border-zinc-700">
                Cancelar
              </Button>
            </>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')} className="border-zinc-700">
                Atrás
              </Button>
              <Button 
                onClick={handleProcessPreview}
                disabled={!mapping.date || !mapping.description || !mapping.amount}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuar'}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')} className="border-zinc-700">
                Atrás
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedRows.size === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Importar {selectedRows.size} transacciones
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
