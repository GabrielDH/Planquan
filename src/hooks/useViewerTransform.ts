import { useState, useCallback } from 'react';
import { Point } from '@/types/viewer';

export interface ViewerTransform {
  zoom: number;
  rotation: number; // degrees 0-359
}

interface Size {
  width: number;
  height: number;
}

export function useViewerTransform(initialZoom = 0.5) {
  const [zoom, setZoom] = useState(initialZoom);
  const [rotation, setRotation] = useState(0);

  const rotateCW = useCallback(() => {
    setRotation(r => (r + 90) % 360);
  }, []);

  const rotateCCW = useCallback(() => {
    setRotation(r => (r - 90 + 360) % 360);
  }, []);

  const resetRotation = useCallback(() => {
    setRotation(0);
  }, []);

  const setFreeRotation = useCallback((deg: number) => {
    setRotation(((deg % 360) + 360) % 360);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(30, z * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(0.1, z / 1.2));
  }, []);

  const zoomReset = useCallback(() => {
    setZoom(initialZoom);
  }, [initialZoom]);

  return {
    zoom,
    setZoom,
    rotation,
    setRotation: setFreeRotation,
    rotateCW,
    rotateCCW,
    resetRotation,
    zoomIn,
    zoomOut,
    zoomReset,
  };
}

/**
 * Transform a screen-space point to page-space coordinates,
 * accounting for rotation around the center of the canvas.
 */
export function screenToPage(
  screenPt: Point,
  rotation: number,
  canvasSize: Size
): Point {
  if (rotation === 0) return screenPt;

  const cx = canvasSize.width / 2;
  const cy = canvasSize.height / 2;
  const rad = (-rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = screenPt.x - cx;
  const dy = screenPt.y - cy;

  return {
    x: dx * cos - dy * sin + cx,
    y: dx * sin + dy * cos + cy,
  };
}

/**
 * Transform a page-space point to screen-space coordinates,
 * accounting for rotation around the center of the canvas.
 */
export function pageToScreen(
  pagePt: Point,
  rotation: number,
  canvasSize: Size
): Point {
  if (rotation === 0) return pagePt;

  const cx = canvasSize.width / 2;
  const cy = canvasSize.height / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = pagePt.x - cx;
  const dy = pagePt.y - cy;

  return {
    x: dx * cos - dy * sin + cx,
    y: dx * sin + dy * cos + cy,
  };
}
