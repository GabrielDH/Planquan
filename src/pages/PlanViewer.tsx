import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Point, MeasurementTool, MeasurementData, ScaleData, MEASUREMENT_COLORS } from '@/types/viewer';
import { realDistance, polylineLength, polygonArea, getAreaUnit as getAreaUnitFn } from '@/lib/measurements';
import { exportToPDF, exportToCSV, exportToVisualPDF } from '@/lib/export-utils';
import { useViewerTransform } from '@/hooks/useViewerTransform';
import { UnitSystem } from '@/lib/unit-conversion';
import ViewerCanvas from '@/components/viewer/ViewerCanvas';
import MeasurementToolbar from '@/components/viewer/MeasurementToolbar';
import ScaleCalibrationDialog from '@/components/viewer/ScaleCalibrationDialog';
import ExportDialog from '@/components/export/ExportDialog';
import PageThumbnails from '@/components/viewer/PageThumbnails';

export default function PlanViewer() {
  const { projectId, fileId } = useParams<{ projectId: string; fileId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [file, setFile] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState('');
  const { zoom, setZoom, rotation, rotateCW, rotateCCW, resetRotation, zoomIn, zoomOut, zoomReset } = useViewerTransform(0.5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTool, setActiveTool] = useState<MeasurementTool>('none');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [scale, setScale] = useState<ScaleData | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [calibratedPages, setCalibratedPages] = useState<Set<number>>(new Set());
  const [displayUnitSystem, setDisplayUnitSystem] = useState<UnitSystem>('imperial');

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<MeasurementData[][]>([]);
  const [redoStack, setRedoStack] = useState<MeasurementData[][]>([]);

  // Load user unit preference
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('preferred_units').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.preferred_units) {
          setDisplayUnitSystem(data.preferred_units === 'metric' ? 'metric' : 'imperial');
        }
      });
  }, [user]);

  const handleUnitSystemChange = useCallback((system: UnitSystem) => {
    setDisplayUnitSystem(system);
    if (user) {
      supabase.from('profiles').update({ preferred_units: system }).eq('user_id', user.id);
    }
  }, [user]);

  // Load project + file
  useEffect(() => {
    if (!projectId || !fileId) return;
    supabase.from('projects').select('*').eq('id', projectId).single().then(({ data }) => setProject(data));
    supabase.from('project_files').select('*').eq('id', fileId).single().then(async ({ data }) => {
      setFile(data);
      if (data) {
        setTotalPages((data as any).total_pages || 1);
        const { data: urlData } = await supabase.storage.from('project-files').createSignedUrl((data as any).storage_path, 3600);
        if (urlData?.signedUrl) setFileUrl(urlData.signedUrl);
      }
    });
  }, [projectId, fileId]);

  // Load scale + measurements
  useEffect(() => {
    if (!fileId) return;
    supabase.from('page_scales').select('*').eq('file_id', fileId).eq('page_number', currentPage).maybeSingle()
      .then(({ data }) => { if (data) setScale(data as any); else setScale(null); });
    supabase.from('measurements').select('*').eq('file_id', fileId).eq('page_number', currentPage).order('created_at')
      .then(({ data }) => setMeasurements((data as any[]) || []));
  }, [fileId, currentPage]);

  // Load all calibrated pages for thumbnail indicators
  useEffect(() => {
    if (!fileId) return;
    supabase.from('page_scales').select('page_number').eq('file_id', fileId)
      .then(({ data }) => {
        if (data) setCalibratedPages(new Set(data.map((d: any) => d.page_number)));
      });
  }, [fileId, scale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActiveTool('none'); setCurrentPoints([]); }
      if (e.key === 's' || e.key === 'S') setSnapEnabled(v => !v);
      if (e.ctrlKey && e.key === 'z') handleUndo();
      if (e.ctrlKey && e.key === 'y') handleRedo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoStack, redoStack, measurements]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(s => [...s, measurements]);
    setMeasurements(prev);
    setUndoStack(s => s.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(s => [...s, measurements]);
    setMeasurements(next);
    setRedoStack(s => s.slice(0, -1));
  };

  const saveMeasurement = async (type: string, coords: Point[], value: number | null, unit: string | null) => {
    if (!user || !projectId || !fileId) return;
    const color = MEASUREMENT_COLORS[type] || '#FF0000';
    const areaUnit = type === 'area' ? getAreaUnitFn(scale?.unit || 'ft') : unit;
    const record = {
      project_id: projectId, file_id: fileId, page_number: currentPage,
      user_id: user.id, measurement_type: type, coordinates: coords,
      value, unit: areaUnit || unit, original_value: value, original_unit: areaUnit || unit,
      label: '', comment: '', color,
    };
    const { data, error } = await supabase.from('measurements').insert(record as any).select().single();
    if (data) {
      setUndoStack(s => [...s, measurements]);
      setRedoStack([]);
      setMeasurements(prev => [...prev, data as any]);
    }
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
  };

  const handleAddPoint = useCallback((pt: Point) => {
    if (activeTool === 'calibrate') {
      const newPts = [...calibrationPoints, pt];
      setCalibrationPoints(newPts);
      setCurrentPoints(newPts);
      if (newPts.length === 2) {
        setShowCalibration(true);
        setActiveTool('none');
        setCurrentPoints([]);
      }
      return;
    }

    if (activeTool === 'linear') {
      const newPts = [...currentPoints, pt];
      setCurrentPoints(newPts);
      if (newPts.length === 2) {
        const dist = realDistance(newPts[0], newPts[1], scale?.pixels_per_unit || 1);
        saveMeasurement('linear', newPts, dist, scale?.unit || 'ft');
        setCurrentPoints([]);
      }
      return;
    }

    if (activeTool === 'count') {
      const newPts = [...currentPoints, pt];
      saveMeasurement('count', newPts, newPts.length, 'units');
      // For count, we accumulate all clicks as one measurement, but save individually
      // Actually, let's save each count session. When tool changes, we reset.
      setCurrentPoints(newPts);
      return;
    }

    if (activeTool === 'annotation') {
      const label = prompt('Texto de la anotación:');
      if (label) {
        saveMeasurement('annotation', [pt], null, null);
      }
      return;
    }

    // polyline / area - accumulate points
    setCurrentPoints(prev => [...prev, pt]);
  }, [activeTool, currentPoints, calibrationPoints, scale]);

  const handleFinishMeasurement = useCallback(() => {
    if (activeTool === 'polyline' && currentPoints.length >= 2) {
      const length = polylineLength(currentPoints, scale?.pixels_per_unit || 1);
      saveMeasurement('polyline', currentPoints, length, scale?.unit || 'ft');
      setCurrentPoints([]);
    }
    if (activeTool === 'area' && currentPoints.length >= 3) {
      const area = polygonArea(currentPoints, scale?.pixels_per_unit || 1);
      saveMeasurement('area', currentPoints, area, getAreaUnitFn(scale?.unit || 'ft'));
      setCurrentPoints([]);
    }
  }, [activeTool, currentPoints, scale]);

  const handleToolChange = (tool: MeasurementTool) => {
    // If switching from count, save accumulated counts
    if (activeTool === 'count' && currentPoints.length > 0) {
      // Count measurements are saved individually on each click, so just clear
    }
    setCurrentPoints([]);
    setCalibrationPoints([]);
    setActiveTool(tool);
  };

  const handleScaleSave = async (pixelsPerUnit: number, unit: string, scaleType: string, standardScale?: string, realDist?: number, realDistUnit?: string) => {
    if (!user || !fileId) return;
    // Delete existing scale for this page
    await supabase.from('page_scales').delete().eq('file_id', fileId).eq('page_number', currentPage);
    const record = {
      file_id: fileId, page_number: currentPage, scale_type: scaleType,
      pixels_per_unit: pixelsPerUnit, unit, calibrated_by: user.id,
      ...(calibrationPoints.length === 2 ? { point1_x: calibrationPoints[0].x, point1_y: calibrationPoints[0].y, point2_x: calibrationPoints[1].x, point2_y: calibrationPoints[1].y } : {}),
      ...(realDist ? { real_distance: realDist, real_distance_unit: realDistUnit } : {}),
      ...(standardScale ? { standard_scale: standardScale } : {}),
    };
    const { data, error } = await supabase.from('page_scales').insert(record as any).select().single();
    if (data) {
      setScale(data as any);
      toast({ title: 'Escala calibrada' });
    }
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setShowCalibration(false);
    setCalibrationPoints([]);
  };

  const handleExportPDF = () => {
    if (!project) return;
    const exportData = measurements.map(m => ({
      ...m,
      file_name: file?.original_file_name || '',
    }));
    exportToPDF(exportData, project);
  };

  const handleExportCSV = () => {
    if (!project) return;
    const exportData = measurements.map(m => ({
      ...m,
      file_name: file?.original_file_name || '',
    }));
    exportToCSV(exportData, project);
  };

  const handleExportVisualPDF = () => {
    if (!project) return;
    const exportData = measurements.map(m => ({
      ...m,
      file_name: file?.original_file_name || '',
      coordinates: m.coordinates as { x: number; y: number }[],
      color: m.color,
    }));
    exportToVisualPDF({ pdfDoc, measurements: exportData, project });
  };

  if (!file || !fileUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Cargando plano...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-2 bg-card">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.original_file_name}</p>
          <p className="text-xs text-muted-foreground">{project?.name} · Rev {file.current_revision}</p>
        </div>
        {!scale && (
          <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2 py-1 rounded">
            <AlertTriangle className="h-3 w-3" />
            Escala sin calibrar
          </div>
        )}
      </div>

      {/* Viewer + Toolbar */}
      <div className="flex flex-1 overflow-hidden">
        <PageThumbnails
          pdfDoc={pdfDoc}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          calibratedPages={calibratedPages}
        />
        <ViewerCanvas
          fileUrl={fileUrl}
          fileType={file.file_type}
          currentPage={currentPage}
          totalPages={totalPages}
          onTotalPagesChange={(n) => { setTotalPages(n); }}
          zoom={zoom}
          onZoomChange={setZoom}
          rotation={rotation}
          activeTool={activeTool}
          measurements={measurements}
          currentPoints={currentPoints}
          onAddPoint={handleAddPoint}
          onFinishMeasurement={handleFinishMeasurement}
          snapEnabled={snapEnabled}
          pixelsPerUnit={scale?.pixels_per_unit || 0}
          scaleUnit={scale?.unit || 'ft'}
          mousePos={mousePos}
          onMousePosChange={setMousePos}
          onPdfDocLoad={setPdfDoc}
        />
        <MeasurementToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          scale={scale}
          measurements={measurements}
          snapEnabled={snapEnabled}
          onSnapToggle={() => setSnapEnabled(v => !v)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onExport={() => setShowExport(true)}
          rotation={rotation}
          onRotateCW={rotateCW}
          onRotateCCW={rotateCCW}
          onRotateReset={resetRotation}
          displayUnitSystem={displayUnitSystem}
          onUnitSystemChange={handleUnitSystemChange}
        />
      </div>

      <ScaleCalibrationDialog
        open={showCalibration}
        onClose={() => { setShowCalibration(false); setCalibrationPoints([]); }}
        onSave={handleScaleSave}
        calibrationPoints={calibrationPoints}
        unitSystem={project?.unit_system || 'imperial'}
      />

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        onExportVisualPDF={handleExportVisualPDF}
        measurementCount={measurements.length}
      />
    </div>
  );
}
