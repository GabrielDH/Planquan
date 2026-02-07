import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Table } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  measurementCount: number;
}

export default function ExportDialog({ open, onClose, onExportPDF, onExportCSV, measurementCount }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Exportar Mediciones</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {measurementCount} medición{measurementCount !== 1 ? 'es' : ''} para exportar.
        </p>
        <div className="space-y-2 py-2">
          <Button variant="outline" className="w-full justify-start h-12" onClick={() => { onExportPDF(); onClose(); }}>
            <FileText className="mr-3 h-5 w-5 text-destructive" />
            <div className="text-left">
              <div className="text-sm font-medium">PDF</div>
              <div className="text-xs text-muted-foreground">Reporte con tabla de mediciones</div>
            </div>
          </Button>
          <Button variant="outline" className="w-full justify-start h-12" onClick={() => { onExportCSV(); onClose(); }}>
            <Table className="mr-3 h-5 w-5 text-success" />
            <div className="text-left">
              <div className="text-sm font-medium">CSV / Excel</div>
              <div className="text-xs text-muted-foreground">Datos tabulares para análisis</div>
            </div>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
