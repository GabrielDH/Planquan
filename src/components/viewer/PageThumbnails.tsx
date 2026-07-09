import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

const THUMBNAIL_WIDTH = 150;
const MAX_CONCURRENT_RENDERS = 3;

interface Props {
  pdfDoc: any; // PDFDocumentProxy
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  calibratedPages?: Set<number>; // pages that have scale calibration
}

export default function PageThumbnails({
  pdfDoc,
  currentPage,
  totalPages,
  onPageChange,
  calibratedPages = new Set(),
}: Props) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const renderQueue = useRef<number[]>([]);
  const activeRenders = useRef(0);

  // Generate thumbnails using intersection observer for lazy loading
  const observerRef = useRef<IntersectionObserver | null>(null);
  const thumbRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const renderThumbnail = useCallback(async (pageNum: number) => {
    if (!pdfDoc || thumbnails.has(pageNum) || loading.has(pageNum)) return;

    if (activeRenders.current >= MAX_CONCURRENT_RENDERS) {
      if (!renderQueue.current.includes(pageNum)) {
        renderQueue.current.push(pageNum);
      }
      return;
    }

    activeRenders.current++;
    setLoading(prev => new Set(prev).add(pageNum));

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const scale = THUMBNAIL_WIDTH / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const ctx = canvas.getContext('2d')!;

      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

      setThumbnails(prev => new Map(prev).set(pageNum, dataUrl));
    } catch (err) {
      console.error(`Failed to render thumbnail for page ${pageNum}:`, err);
    } finally {
      activeRenders.current--;
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(pageNum);
        return next;
      });

      // Process queue
      if (renderQueue.current.length > 0) {
        const next = renderQueue.current.shift()!;
        renderThumbnail(next);
      }
    }
  }, [pdfDoc, thumbnails, loading]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!pdfDoc || totalPages <= 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
            if (pageNum > 0) renderThumbnail(pageNum);
          }
        });
      },
      { root: containerRef.current, rootMargin: '100px' }
    );

    // Observe all thumb elements
    thumbRefs.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [pdfDoc, totalPages, renderThumbnail]);

  // Register thumbnail ref
  const setThumbRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      thumbRefs.current.set(pageNum, el);
      observerRef.current?.observe(el);
    } else {
      const existing = thumbRefs.current.get(pageNum);
      if (existing) observerRef.current?.unobserve(existing);
      thumbRefs.current.delete(pageNum);
    }
  }, []);

  // Render current page thumbnail immediately
  useEffect(() => {
    if (pdfDoc && !thumbnails.has(currentPage)) {
      renderThumbnail(currentPage);
    }
  }, [pdfDoc, currentPage, renderThumbnail, thumbnails]);

  // Scroll active thumbnail into view
  useEffect(() => {
    const el = thumbRefs.current.get(currentPage);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentPage]);

  if (!pdfDoc || totalPages <= 1) return null;

  return (
    <div
      ref={containerRef}
      className="w-44 border-r bg-card overflow-y-auto p-2 space-y-2"
    >
      <p className="text-xs font-medium text-muted-foreground px-1 mb-1">
        Páginas ({totalPages})
      </p>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
        <div
          key={pageNum}
          ref={(el) => setThumbRef(pageNum, el)}
          data-page={pageNum}
          className={cn(
            'relative cursor-pointer rounded border-2 overflow-hidden transition-all',
            currentPage === pageNum
              ? 'border-primary ring-2 ring-primary/30'
              : 'border-transparent hover:border-muted-foreground/30'
          )}
          onClick={() => onPageChange(pageNum)}
        >
          {thumbnails.has(pageNum) ? (
            <img
              src={thumbnails.get(pageNum)}
              alt={`Página ${pageNum}`}
              className="w-full h-auto block"
              draggable={false}
            />
          ) : (
            <div className="w-full aspect-[8.5/11] bg-muted animate-pulse flex items-center justify-center">
              <span className="text-xs text-muted-foreground">{pageNum}</span>
            </div>
          )}

          {/* Page number badge */}
          <div className="absolute bottom-1 left-1 bg-background/80 rounded px-1 text-[10px] font-mono">
            {pageNum}
          </div>

          {/* Calibration indicator */}
          {calibratedPages.has(pageNum) && (
            <div className="absolute top-1 right-1">
              <CheckCircle className="h-3.5 w-3.5 text-success fill-success/20" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
