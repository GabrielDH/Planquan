import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CatalogCategory, CatalogItemFormData } from '@/types/catalog';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CatalogItemFormData) => void;
  categories: CatalogCategory[];
  initialData?: CatalogItemFormData;
  isEditing?: boolean;
}

export default function CatalogItemForm({ open, onClose, onSubmit, categories, initialData, isEditing }: Props) {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [unitOfMeasure, setUnitOfMeasure] = useState(initialData?.unit_of_measure || '');
  const [unitPrice, setUnitPrice] = useState(initialData?.unit_price?.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nombre es obligatorio';
    if (!unitOfMeasure.trim()) newErrors.unit_of_measure = 'Unidad es obligatoria';
    if (!unitPrice || isNaN(parseFloat(unitPrice)) || parseFloat(unitPrice) < 0) {
      newErrors.unit_price = 'Precio unitario debe ser un número válido ≥ 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      code: code.trim() || undefined,
      category_id: categoryId || undefined,
      unit_of_measure: unitOfMeasure.trim(),
      unit_price: parseFloat(unitPrice),
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Ítem' : 'Nuevo Ítem de Catálogo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Concreto 3000 PSI" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label>Código</Label>
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Ej: MAT-001" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin categoría</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Unidad de medida *</Label>
              <Input value={unitOfMeasure} onChange={e => setUnitOfMeasure(e.target.value)} placeholder="Ej: yd3, ft2, ea" />
              {errors.unit_of_measure && <p className="text-xs text-destructive">{errors.unit_of_measure}</p>}
            </div>
            <div className="space-y-1">
              <Label>Precio unitario ($) *</Label>
              <Input type="number" step="0.01" min="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0.00" />
              {errors.unit_price && <p className="text-xs text-destructive">{errors.unit_price}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Guardar' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
