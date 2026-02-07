import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Point, STANDARD_SCALES_IMPERIAL, STANDARD_SCALES_METRIC } from '@/types/viewer';
import { pointDistance } from '@/lib/measurements';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (pixelsPerUnit: number, unit: string, scaleType: string, standardScale?: string, realDistance?: number, realDistanceUnit?: string) => void;
  calibrationPoints: Point[];
  unitSystem: string;
}

export default function ScaleCalibrationDialog({ open, onClose, onSave, calibrationPoints, unitSystem }: Props) {
  const [realDist, setRealDist] = useState('');
  const [realUnit, setRealUnit] = useState(unitSystem === 'imperial' ? 'ft' : 'm');
  const [selectedStandard, setSelectedStandard] = useState('');
  const [tab, setTab] = useState<string>(calibrationPoints.length === 2 ? 'two_points' : 'standard');

  const scales = unitSystem === 'imperial' ? STANDARD_SCALES_IMPERIAL : STANDARD_SCALES_METRIC;

  const handleTwoPointsSave = () => {
    const dist = parseFloat(realDist);
    if (!dist || dist <= 0 || calibrationPoints.length !== 2) return;
    const pixelDist = pointDistance(calibrationPoints[0], calibrationPoints[1]);
    const ppu = pixelDist / dist;
    onSave(ppu, realUnit, 'two_points', undefined, dist, realUnit);
  };

  const handleStandardSave = () => {
    const scale = scales.find(s => s.value === selectedStandard);
    if (!scale) return;
    onSave(scale.pixelsPerUnit, scale.unit, 'standard', scale.value);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calibrar Escala</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="two_points" className="flex-1">
              Dos puntos
            </TabsTrigger>
            <TabsTrigger value="standard" className="flex-1">
              Escala estándar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="two_points" className="space-y-4 pt-4">
            {calibrationPoints.length === 2 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Has marcado dos puntos en el plano. Ingresa la distancia real que representan.
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label>Distancia real</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={realDist}
                      onChange={e => setRealDist(e.target.value)}
                      placeholder="10"
                      autoFocus
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label>Unidad</Label>
                    <Select value={realUnit} onValueChange={setRealUnit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ft">ft</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button onClick={handleTwoPointsSave} disabled={!realDist || parseFloat(realDist) <= 0}>
                    Calibrar
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  Cierra este diálogo, selecciona la herramienta <strong>Calibrar</strong> y marca dos puntos de referencia en el plano.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="standard" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Selecciona la escala indicada en los planos.
            </p>
            <div className="space-y-1">
              <Label>Escala</Label>
              <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                <SelectTrigger><SelectValue placeholder="Seleccionar escala..." /></SelectTrigger>
                <SelectContent>
                  {scales.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleStandardSave} disabled={!selectedStandard}>
                Aplicar escala
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
