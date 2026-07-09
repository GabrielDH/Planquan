import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Trash2, Edit2, FolderTree, Download, Upload } from 'lucide-react';
import {
  useCategories,
  useCatalogItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useCreateCategory,
  useDeleteCategory,
} from '@/hooks/useCatalog';
import { CatalogItem, CatalogCategory, CatalogItemFormData } from '@/types/catalog';
import CatalogItemForm from '@/components/catalog/CatalogItemForm';
import ImportExportDialog from '@/components/catalog/ImportExportDialog';
import { cn } from '@/lib/utils';

export default function CatalogManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: items = [], isLoading } = useCatalogItems({ categoryId: selectedCategory, search });
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const createCategory = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const handleCreateItem = async (data: CatalogItemFormData) => {
    try {
      await createItem.mutateAsync(data);
      toast({ title: 'Ítem creado' });
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateItem = async (data: CatalogItemFormData) => {
    if (!editingItem) return;
    try {
      await updateItem.mutateAsync({ ...data, id: editingItem.id });
      toast({ title: 'Ítem actualizado' });
      setEditingItem(null);
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (item: CatalogItem) => {
    try {
      await deleteItem.mutateAsync(item.id);
      toast({ title: 'Ítem eliminado' });
    } catch (err: any) {
      if (err.message?.startsWith('ACTIVE_ASSIGNMENTS:')) {
        const count = err.message.split(':')[1];
        const confirmed = window.confirm(
          `Este ítem tiene ${count} asignación(es) activa(s). ¿Eliminar de todos modos?`
        );
        if (confirmed) {
          // Force delete by removing assignments first
          // For now just show the warning
          toast({ title: 'Eliminación cancelada', description: 'Elimine las asignaciones primero.' });
        }
      } else {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newCategoryName.trim() });
      setNewCategoryName('');
      setShowNewCategory(false);
      toast({ title: 'Categoría creada' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (cat: CatalogCategory) => {
    const confirmed = window.confirm(`¿Eliminar la categoría "${cat.name}"? Los ítems quedarán sin categoría.`);
    if (!confirmed) return;
    try {
      await deleteCategoryMutation.mutateAsync(cat.id);
      if (selectedCategory === cat.id) setSelectedCategory(undefined);
      toast({ title: 'Categoría eliminada' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar: Categories */}
      <div className="w-56 border-r bg-card p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <FolderTree className="h-4 w-4" />
            Categorías
          </h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewCategory(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showNewCategory && (
          <div className="flex gap-1 mb-2">
            <Input
              className="h-7 text-xs"
              placeholder="Nombre..."
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
              autoFocus
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleCreateCategory}>OK</Button>
          </div>
        )}

        <div className="space-y-0.5 flex-1 overflow-y-auto">
          <button
            className={cn(
              'w-full text-left text-xs px-2 py-1.5 rounded transition-colors',
              !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
            onClick={() => setSelectedCategory(undefined)}
          >
            Todos los ítems
          </button>
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center group">
              <button
                className={cn(
                  'flex-1 text-left text-xs px-2 py-1.5 rounded transition-colors truncate',
                  selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100"
                onClick={() => handleDeleteCategory(cat)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Main: Items list */}
      <div className="flex-1 flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Catálogo de Ítems</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              // Export handled inside ImportExportDialog
              setShowImport(true);
            }}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
            <Button size="sm" onClick={() => { setEditingItem(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Ítem
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium">Código</th>
                <th className="text-left p-3 font-medium">Nombre</th>
                <th className="text-left p-3 font-medium">Categoría</th>
                <th className="text-left p-3 font-medium">Unidad</th>
                <th className="text-right p-3 font-medium">Precio Unit.</th>
                <th className="text-right p-3 font-medium w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No hay ítems. Crea uno o importa un catálogo.</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{item.code || '—'}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{item.category_name || '—'}</td>
                    <td className="p-3">{item.unit_of_measure}</td>
                    <td className="p-3 text-right font-mono">${item.unit_price.toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingItem(item); setShowForm(true); }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forms/Dialogs */}
      {showForm && (
        <CatalogItemForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
          categories={categories}
          initialData={editingItem ? {
            name: editingItem.name,
            code: editingItem.code || undefined,
            category_id: editingItem.category_id || undefined,
            unit_of_measure: editingItem.unit_of_measure,
            unit_price: editingItem.unit_price,
            description: editingItem.description || undefined,
          } : undefined}
          isEditing={!!editingItem}
        />
      )}

      {showImport && (
        <ImportExportDialog
          open={showImport}
          onClose={() => setShowImport(false)}
          items={items}
          categories={categories}
        />
      )}
    </div>
  );
}
