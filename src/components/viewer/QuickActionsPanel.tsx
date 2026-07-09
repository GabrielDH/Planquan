import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, ArrowRight } from 'lucide-react';
import { MeasurementData } from '@/types/viewer';
import { lengthToArea, areaToQuantity, getResultUnit } from '@/lib/quick-actions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  measurement: MeasurementData;
  onMeasurementCreated?: (m: MeasurementData) => void;
}

export default function QuickActionsPanel({ open, onClose, measurement, onMeasurementCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [height, setHeight] = useState('');
  const [pieceWidth, setPieceWidth] = useState('');
  const [pieceHeight, setPieceHeight] = useState('');
  const [wasteFactor, setWasteFactor] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLinear = measurement.measurement_type === 'linear' || measurement.measurement_type === 'polyline';
  const isArea = measurement.measurement_type === 'area';
  const actionType = isLinear ? 'length_to_area' : 'area_to_quantity';

  const computeResult = (): number | null => {
    if (!measurement.value) return null;
    try {
      if (isLinear) {
        const h = parseFloat(height);
        if (!h || h <= 0) return null;
        return lengthToArea(measurement.value, h, parseFloat(wasteFactor) || 0);
      }
      if (isArea) {
        const pw = parseFloat(pieceWidth);
        const ph = parseFloat(pieceHeight);
        if (!pw || pw <= 0 || !ph || ph <= 0) return null;
        return areaToQuantity(measurement.value, pw, ph, parseFloat(wasteFactor) || 0);
      }
    } catch {
      return null;
    }
    return null;
  };

  const result = computeResult();
  const resultUnit = getResultUnit(actionType, measurement.unit || 'ft');

  const handleExecute = async () => {
    if (result === null || !user) return;
    setError('');

    // Validate
    if (isLinear && (!parseFloat(height) || parseFloat(height) <= 0)) {
      setError('La altura debe ser mayor a cero');
      return;
    }
    if (isArea && (!parseFloat(pieceWidth) || parseFloat(pieceWidth) <= 0 || !parseFloat(pieceHeight) || parseFloat(pieceHeight) <= 0)) {
      setError('Las dimensiones de la pieza deben ser mayores a cero');
      return;
    }

    setSaving(true);
    try {
      // Create derived measurement
      const derivedRecord = {
        project_id: measurement.project_id,
        file_id: measurement.file_id,
        page_number: measurement.page_number,
        user_id: user.id,
        measurement_type: actionType === 'length_to_area' ? 'derived_area' : 'derived_quantity',
        coordinates: measurement.coordinates,
        value: result,
        unit: resultUnit,
        original_value: result,
        original_unit: resultUnit,
        label: actionType === 'length_to_area' ? 'Área derivada' : 'Cantidad derivada',
        comment: `Derivada de medición ${measurement.id.slice(0, 8)}`,
        color: '#6366F1',
      };

      const { data: newMeasurement, error: insertError } = await supabase
        .from('measurements')
        .insert(derivedRecord as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Create the link record
      const params: Record<string, any> = { waste_factor: parseFloat(wasteFactor) || 0 };
      if (isLinear) params.height = parseFloat(height);
      if (isArea) { params.piece_width = parseFloat(pieceWidth); params.piece_height = parseFloat(pieceHeight); }

      await supabase.from('derived_measurements').insert({
        source_measurement_id: measurement.id,
        derived_measurement_id: (newMeasurement as any).id,
        action_type: actionType,
        parameters: params,
      } as any);

      toast({ title: 'Medición derivada creada' });
      onMeasurementCreated?.(newMeasurement as any);
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!isLinear && !isArea) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Acción Rápida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Source */}
          <div className="p-2 rounded bg-muted/50 text-xs">
            <span className="font-medium">{measurement.measurement_type}</span>
            {measurement.value != null && (
              <span> = {measurement.value.toFixed(2)} {measurement.unit}</span>
            )}
          </div>

          {/* Action description */}
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">
              {isLinear ? 'Longitud × Altura = Área' : 'Área ÷ Pieza = Cantidad'}
            </Badge>
          </div>

          {/* Inputs */}
          {isLinear && (
            <div className="space-y-1">
              <Label className="text-xs">Altura ({measurement.unit})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="h-8 text-xs"
                value={height}
                onChange={e => setHeight(e.target.value)}
                placeholder="Ej: 8 (pies)"
                autoFocus
              />
            </div>
          )}

          {isArea && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Ancho pieza ({measurement.unit?.replace('2', '')})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-8 text-xs"
                  value={pieceWidth}
                  onChange={e => setPieceWidth(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Alto pieza ({measurement.unit?.replace('2', '')})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-8 text-xs"
                  value={pieceHeight}
                  onChange={e => setPieceHeight(e.target.value)}
                />
              </div>
            </div>
          )}

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

          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Result preview */}
          {result !== null && (
            <div className="flex items-center justify-center gap-2 p-3 rounded bg-primary/5 border">
              <span className="text-sm">{measurement.value?.toFixed(2)} {measurement.unit}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-bold text-primary">{result.toFixed(2)} {resultUnit}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleExecute} disabled={result === null || saving}>
            {saving ? 'Creando...' : 'Crear medición derivada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
