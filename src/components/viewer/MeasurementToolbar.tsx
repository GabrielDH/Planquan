import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Ruler, Spline, Pentagon, MousePointerClick, MessageSquare,
  Target, ZoomIn, ZoomOut, RotateCcw, Magnet, Undo2, Redo2,
  ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MeasurementTool, MeasurementData, ScaleData } from '@/types/viewer';
import { formatMeasurement } from '@/lib/measurements';

interface Props {
  activeTool: MeasurementTool;
  onToolChange: (tool: MeasurementTool) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scale: ScaleData | null;
  measurements: MeasurementData[];
  snapEnabled: boolean;
  onSnapToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
}

const tools: { tool: MeasurementTool; icon: React.ReactNode; label: string; requiresScale: boolean }[] = [
  { tool: 'calibrate', icon: <Target className="h-4 w-4" />, label: 'Calibrar escala', requiresScale: false },
  { tool: 'linear', icon: <Ruler className="h-4 w-4" />, label: 'Lineal', requiresScale: true },
  { tool: 'polyline', icon: <Spline className="h-4 w-4" />, label: 'Polilínea', requiresScale: true },
  { tool: 'area', icon: <Pentagon className="h-4 w-4" />, label: 'Área', requiresScale: true },
  { tool: 'count', icon: <MousePointerClick className="h-4 w-4" />, label: 'Conteo', requiresScale: false },
  { tool: 'annotation', icon: <MessageSquare className="h-4 w-4" />, label: 'Anotación', requiresScale: false },
];

export default function MeasurementToolbar({
  activeTool, onToolChange, zoom, onZoomIn, onZoomOut, onZoomReset,
  currentPage, totalPages, onPageChange, scale, measurements,
  snapEnabled, onSnapToggle, onUndo, onRedo, canUndo, canRedo, onExport,
}: Props) {
  return (
    <div className="flex flex-col w-56 bg-card border-l overflow-y-auto">
      {/* Zoom */}
      <div className="p-3 border-b">
        <p className="text-xs font-medium text-muted-foreground mb-2">Vista</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onZoomOut}><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="text-xs font-mono flex-1 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onZoomIn}><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onZoomReset}><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Pages */}
      {totalPages > 1 && (
        <div className="p-3 border-b">
          <p className="text-xs font-medium text-muted-foreground mb-2">Página</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs flex-1 text-center">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Scale */}
      <div className="p-3 border-b">
        <p className="text-xs font-medium text-muted-foreground mb-2">Escala</p>
        {scale ? (
          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
            ✓ Calibrada ({scale.standard_scale || `${scale.pixels_per_unit.toFixed(1)} px/${scale.unit}`})
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
            ⚠ Sin calibrar
          </Badge>
        )}
      </div>

      {/* Tools */}
      <div className="p-3 border-b">
        <p className="text-xs font-medium text-muted-foreground mb-2">Herramientas</p>
        <div className="grid grid-cols-2 gap-1">
          {tools.map(t => (
            <Button
              key={t.tool}
              variant={activeTool === t.tool ? 'default' : 'outline'}
              size="sm"
              className={cn('h-8 text-xs justify-start gap-1.5', t.requiresScale && !scale && 'opacity-50')}
              disabled={t.requiresScale && !scale}
              onClick={() => onToolChange(activeTool === t.tool ? 'none' : t.tool)}
              title={t.requiresScale && !scale ? 'Calibra la escala primero' : t.label}
            >
              {t.icon}
              <span className="truncate">{t.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Snap + Undo/Redo */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-1">
          <Button variant={snapEnabled ? 'default' : 'outline'} size="sm" className="h-7 text-xs flex-1" onClick={onSnapToggle}>
            <Magnet className="h-3 w-3 mr-1" />
            Snap
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onUndo} disabled={!canUndo}><Undo2 className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onRedo} disabled={!canRedo}><Redo2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Measurements List */}
      <div className="p-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Mediciones ({measurements.length})</p>
          {measurements.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onExport}>
              <Download className="h-3 w-3 mr-1" />
              Exportar
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {measurements.slice(0, 50).map((m, i) => (
            <div key={m.id} className="text-xs p-1.5 rounded bg-muted/50 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
              <span className="truncate flex-1">
                {m.label || m.measurement_type}
                {m.value != null && m.unit && `: ${formatMeasurement(m.value, m.unit)}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
