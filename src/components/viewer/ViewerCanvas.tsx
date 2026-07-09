import { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Point, MeasurementTool, MeasurementData, MEASUREMENT_COLORS } from '@/types/viewer';
import { pointDistance, snapToPoint, formatMeasurement } from '@/lib/measurements';
import { screenToPage } from '@/hooks/useViewerTransform';
import { cn } from '@/lib/utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const RENDER_SCALE = 2;

interface Props {
  fileUrl: string;
  fileType: string;
  currentPage: number;
  totalPages: number;
  onTotalPagesChange: (n: number) => void;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
  rotation?: number;
  activeTool: MeasurementTool;
  measurements: MeasurementData[];
  currentPoints: Point[];
  onAddPoint: (point: Point) => void;
  onFinishMeasurement: () => void;
  snapEnabled: boolean;
  pixelsPerUnit: number;
  scaleUnit: string;
  mousePos: Point | null;
  onMousePosChange: (p: Point | null) => void;
  onPdfDocLoad?: (doc: any) => void;
}

export default function ViewerCanvas({
  fileUrl, fileType, currentPage, totalPages, onTotalPagesChange,
  zoom, onZoomChange, rotation = 0, activeTool, measurements, currentPoints, onAddPoint,
  onFinishMeasurement, snapEnabled, pixelsPerUnit, scaleUnit,
  mousePos, onMousePosChange, onPdfDocLoad,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [rendering, setRendering] = useState(false);

  // Load PDF document
  useEffect(() => {
    if (fileType !== 'pdf' || !fileUrl) return;
    let cancelled = false;
    pdfjsLib.getDocument(fileUrl).promise.then(doc => {
      if (cancelled) return;
      setPdfDoc(doc);
      onTotalPagesChange(doc.numPages);
      onPdfDocLoad?.(doc);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [fileUrl, fileType]);

  // Render PDF page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    setRendering(true);
    pdfDoc.getPage(currentPage).then((page: any) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasSize({ width: viewport.width, height: viewport.height });
      const ctx = canvas.getContext('2d')!;
      page.render({ canvasContext: ctx, viewport }).promise.then(() => setRendering(false));
    });
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  // Load image
  useEffect(() => {
    if (fileType === 'pdf' || !fileUrl || !canvasRef.current) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setCanvasSize({ width: img.naturalWidth, height: img.naturalHeight });
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
    };
    img.src = fileUrl;
  }, [fileUrl, fileType]);

  const getPageCoords = useCallback((e: React.MouseEvent): Point => {
    const svg = (e.currentTarget as SVGSVGElement);
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasSize.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasSize.height / rect.height);
    // Apply inverse rotation to get page-space coordinates
    return screenToPage({ x, y }, rotation, canvasSize);
  }, [canvasSize, rotation]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'none') return;
    let pt = getPageCoords(e);

    if (snapEnabled) {
      const existingPts = measurements.flatMap(m => m.coordinates as Point[]);
      const lastPt = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : null;
      const threshold = 8 / zoom;
      const snap = snapToPoint(pt, existingPts, lastPt, threshold, true);
      pt = snap.point;
    }

    onAddPoint(pt);
  }, [activeTool, getPageCoords, snapEnabled, measurements, currentPoints, zoom, onAddPoint]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'polyline' || activeTool === 'area') {
      e.preventDefault();
      onFinishMeasurement();
    }
  }, [activeTool, onFinishMeasurement]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'none') { onMousePosChange(null); return; }
    let pt = getPageCoords(e);
    if (snapEnabled) {
      const existingPts = measurements.flatMap(m => m.coordinates as Point[]);
      const lastPt = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : null;
      const threshold = 8 / zoom;
      const snap = snapToPoint(pt, existingPts, lastPt, threshold, true);
      pt = snap.point;
    }
    onMousePosChange(pt);
  }, [activeTool, getPageCoords, snapEnabled, measurements, currentPoints, zoom, onMousePosChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!onZoomChange || !containerRef.current) return;
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
    const newZoom = Math.max(0.1, Math.min(30, zoom * zoomFactor));

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Adjust scroll to keep point under cursor stable
    const scrollLeft = (container.scrollLeft + cursorX) * (newZoom / zoom) - cursorX;
    const scrollTop = (container.scrollTop + cursorY) * (newZoom / zoom) - cursorY;

    onZoomChange(newZoom);

    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollLeft = scrollLeft;
        containerRef.current.scrollTop = scrollTop;
      }
    });
  }, [zoom, onZoomChange]);

  const cursorClass = activeTool !== 'none' ? 'viewer-cursor-crosshair' : 'viewer-cursor-grab';

  const displayWidth = canvasSize.width * zoom;
  const displayHeight = canvasSize.height * zoom;

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-muted/30 relative" onWheel={handleWheel}>
      <div style={{ width: displayWidth, height: displayHeight, position: 'relative', margin: '20px auto', transform: rotation ? `rotate(${rotation}deg)` : undefined, transformOrigin: 'center center' }}>
        <canvas
          ref={canvasRef}
          style={{ width: displayWidth, height: displayHeight, display: 'block' }}
        />
        <svg
          className={cn('absolute top-0 left-0', cursorClass)}
          width={displayWidth}
          height={displayHeight}
          viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => onMousePosChange(null)}
        >
          {/* Saved measurements */}
          {measurements.map(m => (
            <MeasurementShape key={m.id} measurement={m} pixelsPerUnit={pixelsPerUnit} scaleUnit={scaleUnit} />
          ))}

          {/* Active drawing */}
          {currentPoints.length > 0 && (
            <ActiveDrawing
              points={currentPoints}
              mousePos={mousePos}
              tool={activeTool}
              pixelsPerUnit={pixelsPerUnit}
              scaleUnit={scaleUnit}
            />
          )}

          {/* Snap indicator */}
          {mousePos && activeTool !== 'none' && (
            <circle cx={mousePos.x} cy={mousePos.y} r={4 / zoom} fill="none" stroke={MEASUREMENT_COLORS[activeTool] || '#FF0000'} strokeWidth={1.5 / zoom} />
          )}
        </svg>
      </div>
    </div>
  );
}

function MeasurementShape({ measurement: m, pixelsPerUnit, scaleUnit }: { measurement: MeasurementData; pixelsPerUnit: number; scaleUnit: string }) {
  const pts = m.coordinates as Point[];
  if (!pts || pts.length === 0) return null;

  const labelSize = 11;
  const strokeW = 2;

  if (m.measurement_type === 'count') {
    return (
      <g>
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={10} fill={m.color} fillOpacity={0.3} stroke={m.color} strokeWidth={strokeW} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={labelSize} fill={m.color} fontWeight="bold">{i + 1}</text>
          </g>
        ))}
      </g>
    );
  }

  if (m.measurement_type === 'annotation') {
    const p = pts[0];
    return (
      <g>
        <circle cx={p.x} cy={p.y} r={6} fill={m.color} />
        {m.label && (
          <text x={p.x + 10} y={p.y + 4} fontSize={labelSize} fill={m.color} fontWeight="bold">{m.label}</text>
        )}
      </g>
    );
  }

  if (m.measurement_type === 'linear' && pts.length === 2) {
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    return (
      <g>
        <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke={m.color} strokeWidth={strokeW} />
        <circle cx={pts[0].x} cy={pts[0].y} r={4} fill={m.color} />
        <circle cx={pts[1].x} cy={pts[1].y} r={4} fill={m.color} />
        {m.value != null && m.unit && (
          <g>
            <rect x={mid.x - 30} y={mid.y - 16} width={60} height={18} rx={3} fill="white" fillOpacity={0.9} />
            <text x={mid.x} y={mid.y - 3} textAnchor="middle" fontSize={labelSize} fill={m.color} fontWeight="600">
              {formatMeasurement(m.value, m.unit)}
            </text>
          </g>
        )}
      </g>
    );
  }

  if ((m.measurement_type === 'polyline') && pts.length >= 2) {
    const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
    const last = pts[pts.length - 1];
    return (
      <g>
        <polyline points={pointsStr} fill="none" stroke={m.color} strokeWidth={strokeW} />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={m.color} />)}
        {m.value != null && m.unit && (
          <g>
            <rect x={last.x + 5} y={last.y - 16} width={70} height={18} rx={3} fill="white" fillOpacity={0.9} />
            <text x={last.x + 40} y={last.y - 3} textAnchor="middle" fontSize={labelSize} fill={m.color} fontWeight="600">
              {formatMeasurement(m.value, m.unit)}
            </text>
          </g>
        )}
      </g>
    );
  }

  if (m.measurement_type === 'area' && pts.length >= 3) {
    const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return (
      <g>
        <polygon points={pointsStr} fill={m.color} fillOpacity={0.15} stroke={m.color} strokeWidth={strokeW} />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={m.color} />)}
        {m.value != null && m.unit && (
          <g>
            <rect x={cx - 35} y={cy - 10} width={70} height={18} rx={3} fill="white" fillOpacity={0.9} />
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize={labelSize} fill={m.color} fontWeight="600">
              {formatMeasurement(m.value, m.unit)}
            </text>
          </g>
        )}
      </g>
    );
  }

  return null;
}

function ActiveDrawing({ points, mousePos, tool, pixelsPerUnit, scaleUnit }: {
  points: Point[]; mousePos: Point | null; tool: MeasurementTool; pixelsPerUnit: number; scaleUnit: string;
}) {
  const color = MEASUREMENT_COLORS[tool] || '#FF0000';
  const allPts = mousePos ? [...points, mousePos] : points;

  if (tool === 'linear') {
    if (points.length === 1 && mousePos) {
      const dist = pixelsPerUnit > 0 ? pointDistance(points[0], mousePos) / pixelsPerUnit : 0;
      const mid = { x: (points[0].x + mousePos.x) / 2, y: (points[0].y + mousePos.y) / 2 };
      return (
        <g>
          <line x1={points[0].x} y1={points[0].y} x2={mousePos.x} y2={mousePos.y} stroke={color} strokeWidth={2} strokeDasharray="6,3" />
          <circle cx={points[0].x} cy={points[0].y} r={4} fill={color} />
          {dist > 0 && (
            <text x={mid.x} y={mid.y - 8} textAnchor="middle" fontSize={11} fill={color} fontWeight="600">
              {formatMeasurement(dist, scaleUnit)}
            </text>
          )}
        </g>
      );
    }
    return points.length > 0 ? <circle cx={points[0].x} cy={points[0].y} r={4} fill={color} /> : null;
  }

  if (tool === 'polyline' || tool === 'area') {
    if (allPts.length < 2) return allPts.length === 1 ? <circle cx={allPts[0].x} cy={allPts[0].y} r={4} fill={color} /> : null;
    const ptsStr = allPts.map(p => `${p.x},${p.y}`).join(' ');
    return (
      <g>
        {tool === 'area' ? (
          <polygon points={ptsStr} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={2} strokeDasharray="6,3" />
        ) : (
          <polyline points={ptsStr} fill="none" stroke={color} strokeWidth={2} strokeDasharray="6,3" />
        )}
        {allPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
      </g>
    );
  }

  if (tool === 'calibrate') {
    if (points.length === 1 && mousePos) {
      return (
        <g>
          <line x1={points[0].x} y1={points[0].y} x2={mousePos.x} y2={mousePos.y} stroke={color} strokeWidth={2} strokeDasharray="4,4" />
          <circle cx={points[0].x} cy={points[0].y} r={5} fill={color} />
        </g>
      );
    }
    return points.length > 0 ? <circle cx={points[0].x} cy={points[0].y} r={5} fill={color} /> : null;
  }

  return null;
}
