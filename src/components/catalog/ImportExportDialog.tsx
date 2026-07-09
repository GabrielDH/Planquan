import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { CatalogItem, CatalogCategory, ImportRow, ConflictResolution } from '@/types/catalog';
import { parseCatalogFile, mapRows, exportCatalogToExcel, detectConflicts } from '@/lib/catalog-utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Step = 'choose' | 'preview' | 'mapping' | 'conflicts' | 'results';

interface Props {
  open: boolean;
  onClose: () => void;
  items: CatalogItem[];
  categories: CatalogCategory[];
}

const CATALOG_FIELDS = [
  { key: 'code', label: 'Código', required: false },
  { key: 'name', label: 'Nombre', required: true },
  { key: 'category', label: 'Categoría', required: false },
  { key: 'unit_of_measure', label: 'Unidad de medida', required: true },
  { key: 'unit_price', label: 'Precio unitario', required: true },
  { key: 'description', label: 'Descripción', required: false },
];

export default function ImportExportDialog({ open, onClose, items, categories }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('choose');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validRows, setValidRows] = useState<ImportRow[]>([]);
  const [mapErrors, setMapErrors] = useState<{ row: number; message: string }[]>([]);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip');
  const [results, setResults] = useState<{ created: number; updated: number; skipped: number; errors: number }>({
    created: 0, updated: 0, skipped: 0, errors: 0,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { headers: h, rows } = await parseCatalogFile(file);
      setHeaders(h);
      setRawRows(rows);
      // Auto-map by guessing
      const autoMap: Record<string, string> = {};
      CATALOG_FIELDS.forEach(f => {
        const match = h.find(col =>
          col.toLowerCase().includes(f.key.replace('_', ' ')) ||
          col.toLowerCase().includes(f.label.toLowerCase())
        );
        if (match) autoMap[f.key] = match;
      });
      setMapping(autoMap);
      setStep('preview');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleMapping = () => {
    const { valid, errors } = mapRows(rawRows, mapping);
    setValidRows(valid);
    setMapErrors(errors);

    const conflicts = detectConflicts(valid, items);
    if (conflicts.withConflict.length > 0) {
      setStep('conflicts');
    } else {
      handleImport(valid, 'skip');
    }
  };

  const handleImport = async (rows: ImportRow[], resolution: ConflictResolution) => {
    if (!user) return;
    let created = 0, updated = 0, skipped = 0, errors = 0;

    const { withConflict, withoutConflict } = detectConflicts(rows, items);

    // Insert non-conflicting items
    for (const row of withoutConflict) {
      const { error } = await supabase.from('catalog_items').insert({
        user_id: user.id,
        name: row.name,
        code: row.code || null,
        unit_of_measure: row.unit_of_measure,
        unit_price: row.unit_price,
        description: row.description || '',
      } as any);
      if (error) errors++;
      else created++;
    }

    // Handle conflicts
    for (const { row, existing } of withConflict) {
      if (resolution === 'skip') {
        skipped++;
      } else if (resolution === 'overwrite') {
        const { error } = await supabase.from('catalog_items').update({
          name: row.name,
          unit_of_measure: row.unit_of_measure,
          unit_price: row.unit_price,
          description: row.description || '',
        } as any).eq('id', existing.id);
        if (error) errors++;
        else updated++;
      } else if (resolution === 'create_new') {
        const { error } = await supabase.from('catalog_items').insert({
          user_id: user.id,
          name: row.name,
          code: row.code ? `${row.code}_dup` : null,
          unit_of_measure: row.unit_of_measure,
          unit_price: row.unit_price,
          description: row.description || '',
        } as any);
        if (error) errors++;
        else created++;
      }
    }

    setResults({ created, updated, skipped, errors: errors + mapErrors.length });
    setStep('results');
  };

  const handleExport = () => {
    const catMap = new Map(categories.map(c => [c.id, c.name]));
    exportCatalogToExcel(items, catMap);
    toast({ title: 'Catálogo exportado' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'choose' && 'Importar / Exportar Catálogo'}
            {step === 'preview' && 'Mapeo de Columnas'}
            {step === 'conflicts' && 'Resolución de Conflictos'}
            {step === 'results' && 'Resultado de Importación'}
          </DialogTitle>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-4 py-4">
            <Button variant="outline" className="w-full h-16 justify-start" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-3 h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="font-medium">Importar desde Excel/CSV</p>
                <p className="text-xs text-muted-foreground">Soporta .xlsx y .csv (máx 10,000 filas)</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full h-16 justify-start" onClick={handleExport} disabled={items.length === 0}>
              <Download className="mr-3 h-6 w-6 text-success" />
              <div className="text-left">
                <p className="font-medium">Exportar catálogo actual</p>
                <p className="text-xs text-muted-foreground">{items.length} ítems → archivo .xlsx</p>
              </div>
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileSelect} />
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              <span>{rawRows.length} filas detectadas, {headers.length} columnas</span>
            </div>

            <div className="space-y-3">
              {CATALOG_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <Label className="w-32 text-xs">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={mapping[field.key] || ''}
                    onValueChange={v => setMapping(prev => ({ ...prev, [field.key]: v }))}
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="— No mapear —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— No mapear —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('choose')}>Atrás</Button>
              <Button
                onClick={handleMapping}
                disabled={!mapping.name || !mapping.unit_of_measure || !mapping.unit_price}
              >
                Importar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'conflicts' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Se encontraron ítems con códigos duplicados. ¿Qué deseas hacer?
            </p>
            <div className="space-y-2">
              {(['overwrite', 'skip', 'create_new'] as ConflictResolution[]).map(opt => (
                <Button
                  key={opt}
                  variant={conflictResolution === opt ? 'default' : 'outline'}
                  className="w-full justify-start h-10 text-sm"
                  onClick={() => setConflictResolution(opt)}
                >
                  {opt === 'overwrite' && 'Sobrescribir existentes'}
                  {opt === 'skip' && 'Omitir duplicados'}
                  {opt === 'create_new' && 'Crear como nuevos (código duplicado)'}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('preview')}>Atrás</Button>
              <Button onClick={() => handleImport(validRows, conflictResolution)}>Confirmar</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm font-medium">{results.created} creados</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded bg-primary/10">
                <CheckCircle className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{results.updated} actualizados</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded bg-muted">
                <Badge variant="outline" className="text-xs">{results.skipped}</Badge>
                <p className="text-sm">omitidos</p>
              </div>
              {results.errors > 0 && (
                <div className="flex items-center gap-2 p-3 rounded bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium">{results.errors} errores</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
