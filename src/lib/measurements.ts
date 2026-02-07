import { Point } from '@/types/viewer';

export function pointDistance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function realDistance(p1: Point, p2: Point, pixelsPerUnit: number): number {
  return pointDistance(p1, p2) / pixelsPerUnit;
}

export function polylineLength(points: Point[], pixelsPerUnit: number): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += pointDistance(points[i - 1], points[i]);
  }
  return total / pixelsPerUnit;
}

export function polygonArea(points: Point[], pixelsPerUnit: number): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  area = Math.abs(area) / 2;
  return area / (pixelsPerUnit * pixelsPerUnit);
}

export function formatMeasurement(value: number, unit: string): string {
  if (unit === 'ft') {
    if (value < 1) {
      return `${(value * 12).toFixed(1)} in`;
    }
    const feet = Math.floor(value);
    const inches = ((value - feet) * 12);
    if (inches < 0.1) return `${feet}'-0"`;
    return `${feet}'-${inches.toFixed(1)}"`;
  }
  if (unit === 'm') {
    if (value < 1) return `${(value * 100).toFixed(1)} cm`;
    return `${value.toFixed(2)} m`;
  }
  if (unit === 'ft2') return `${value.toFixed(1)} ft²`;
  if (unit === 'm2') return `${value.toFixed(2)} m²`;
  return `${value.toFixed(2)} ${unit}`;
}

export function getAreaUnit(linearUnit: string): string {
  if (linearUnit === 'ft') return 'ft2';
  if (linearUnit === 'm') return 'm2';
  return linearUnit + '2';
}

export function snapToPoint(
  point: Point,
  existingPoints: Point[],
  lastPoint: Point | null,
  threshold: number,
  snapEnabled: boolean
): { point: Point; snapped: boolean } {
  if (!snapEnabled) return { point, snapped: false };

  // Snap to existing points
  for (const ep of existingPoints) {
    if (Math.abs(point.x - ep.x) < threshold && Math.abs(point.y - ep.y) < threshold) {
      return { point: ep, snapped: true };
    }
  }

  // Snap to horizontal/vertical from last point
  if (lastPoint) {
    const snapped = { ...point };
    let didSnap = false;
    if (Math.abs(point.x - lastPoint.x) < threshold) {
      snapped.x = lastPoint.x;
      didSnap = true;
    }
    if (Math.abs(point.y - lastPoint.y) < threshold) {
      snapped.y = lastPoint.y;
      didSnap = true;
    }
    if (didSnap) return { point: snapped, snapped: true };
  }

  return { point, snapped: false };
}
