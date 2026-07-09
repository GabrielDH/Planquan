import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalogItems } from '@/hooks/useCatalog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MeasurementData } from '@/types/viewer';
import { CatalogItem } from '@/types/catalog';

interface Props {
  open: boolean;
  onClose: () => void;
  measurement: MeasurementData;
}

export default function ItemAssignmentDialog({ open, onClose, measurement }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [conversionFactor, setConversionFactor] = useState('1');
  const [wasteFactor, setWasteFactor] = useState('0');
  const [saving, setSaving] = useState(false);

  const { data: catalogItems = [] } = useCatalogItems({ search });

  const quantity = useMemo(() => {
    if (!measurement.value || !selectedItem) return null;
    const cf = parseFloat(conversionFactor) || 1;
    const wf = parseFloat(wasteFactor) || 0;
    return measurement.value * cf * (1 + wf / 100);
  }, [measurement.value, selectedItem, conversionFactor, wasteFactor]);

  const estimatedCost = useMemo(() => {
    if (!quantity || !selectedItem) return null;
    return quantity * selectedItem.unit_price;
  }, [quantity, selectedItem]);

  const unitMismatch = useMemo(() => {
    if (!selectedItem || !measurement.unit) return false;
    // Simple heuristic: check if measurement unit family matches item unit
    const measureUnit = measurement.unit.toLowerCase();
    const itemUnit = selectedItem.unit_of_measure.toLowerCase();
    return measureUnit !== itemUnit &&
      !itemUnit.includes(measureUnit) &&
      !measureUnit.includes(itemUnit);
  }, [selectedItem, measurement.unit]);

  const handleSave = async () => {
    if (!selectedItem || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('measurement_item_assignments').insert({
        measurement_id: measurement.id,
        catalog_item_id: selectedItem.id,
        conversion_factor: parseFloat(conversionFactor) || 1,
        quantity,
        estimated_cost: estimatedCost,
        waste_factor: parseFloat(wasteFactor) || 0,
      } as any);
      if (error) throw error;
      toast({ title: 'Ítem asignado' });
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Ítem de Catálogo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Measurement info */}
          <div className="p-2 rounded bg-muted/50 text-xs">
            <span className="font-medium">{measurement.measurement_type}</span>
            {measurement.value != null && measurement.unit && (
              <span> — {measurement.value.toFixed(2)} {measurement.unit}</span>
            )}
          </div>

          {/* Item search */}
          <div className="space-y-2">
            <Label>Ítem del catálogo</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-xs"
                placeholder="Buscar ítem..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-32 overflow-y-auto border rounded space-y-0.5 p-1">
              {catalogItems.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2 text-center">Sin resultados</p>
              ) : (
                catalogItems.slice(0, 20).map(item => (
                  <button
                    key={item.id}
                    className={`w-full text-left text-xs p-1.5 rounded transition-colors ${
                      selectedItem?.id === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground ml-1">({item.unit_of_measure} · ${item.unit_price.toFixed(2)})</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Unit mismatch warning */}
          {unitMismatch && (
            <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 p-2 rounded">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Unidad del ítem ({selectedItem?.unit_of_measure}) difiere de la medición ({measurement.unit})
            </div>
          )}

          {/* Conversion + Waste */}
          {selectedItem && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Factor de conversión</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-8 text-xs"
                  value={conversionFactor}
                  onChange={e => setConversionFactor(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desperdicio (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  className="h-8 text-xs"
                  value={wasteFactor}
                  onChange={e => setWasteFactor(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {quantity != null && estimatedCost != null && (
            <div className="p-3 rounded bg-primary/5 border space-y-1">
              <div className="flex justify-between text-xs">
                <span>Cantidad:</span>
                <Badge variant="outline">{quantity.toFixed(2)} {selectedItem?.unit_of_measure}</Badge>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span>Costo estimado:</span>
                <span className="text-primary">${estimatedCost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!selectedItem || saving}>
            {saving ? 'Guardando...' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
