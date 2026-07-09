import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogCategory, CatalogItem, CatalogItemFormData } from '@/types/catalog';

/**
 * Hook to manage catalog categories.
 */
export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['catalog-categories', user?.id],
    queryFn: async (): Promise<CatalogCategory[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('catalog_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order');
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });
}

/**
 * Hook to manage catalog items with search/filter.
 */
export function useCatalogItems(options?: { categoryId?: string; search?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['catalog-items', user?.id, options?.categoryId, options?.search],
    queryFn: async (): Promise<CatalogItem[]> => {
      if (!user) return [];
      let query = supabase
        .from('catalog_items')
        .select('*, catalog_categories(name)')
        .eq('user_id', user.id)
        .order('name');

      if (options?.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,code.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ((data as any[]) || []).map(item => ({
        ...item,
        category_name: item.catalog_categories?.name || null,
      }));
    },
    enabled: !!user,
  });
}

/**
 * Hook to create a catalog item.
 */
export function useCreateItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CatalogItemFormData) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('catalog_items')
        .insert({
          user_id: user.id,
          name: formData.name,
          code: formData.code || null,
          category_id: formData.category_id || null,
          unit_of_measure: formData.unit_of_measure,
          unit_price: formData.unit_price,
          description: formData.description || '',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
    },
  });
}

/**
 * Hook to update a catalog item.
 */
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: CatalogItemFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('catalog_items')
        .update({
          name: formData.name,
          code: formData.code || null,
          category_id: formData.category_id || null,
          unit_of_measure: formData.unit_of_measure,
          unit_price: formData.unit_price,
          description: formData.description || '',
        } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
    },
  });
}

/**
 * Hook to delete a catalog item.
 * Checks for active assignments before deleting.
 */
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check for active assignments
      const { count } = await supabase
        .from('measurement_item_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('catalog_item_id', id);

      if (count && count > 0) {
        throw new Error(`ACTIVE_ASSIGNMENTS:${count}`);
      }

      const { error } = await supabase
        .from('catalog_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
    },
  });
}

/**
 * Hook to create a catalog category.
 */
export function useCreateCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; parent_id?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: result, error } = await supabase
        .from('catalog_categories')
        .insert({
          user_id: user.id,
          name: data.name,
          parent_id: data.parent_id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
    },
  });
}

/**
 * Hook to update a catalog category.
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, parent_id }: { id: string; name: string; parent_id?: string | null }) => {
      const { data, error } = await supabase
        .from('catalog_categories')
        .update({ name, parent_id: parent_id ?? null } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
    },
  });
}

/**
 * Hook to delete a catalog category.
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('catalog_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
    },
  });
}

/**
 * Hook to get the count of active assignments for a catalog item.
 */
export function useItemAssignmentCount(itemId: string) {
  return useQuery({
    queryKey: ['item-assignment-count', itemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('measurement_item_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('catalog_item_id', itemId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!itemId,
  });
}
