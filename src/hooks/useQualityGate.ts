import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { runQualityGate } from '@/lib/quality-gate';
import { QualityGateResult } from '@/types/quality';

/**
 * Hook to run quality gate validation for a project.
 */
export function useQualityGate(projectId: string | undefined) {
  return useQuery({
    queryKey: ['quality-gate', projectId],
    queryFn: async (): Promise<QualityGateResult> => {
      if (!projectId) throw new Error('No project ID');

      // Fetch all project files
      const { data: files } = await supabase
        .from('project_files')
        .select('id, total_pages')
        .eq('project_id', projectId);

      const fileIds = (files || []).map((f: any) => f.id);

      // Fetch all scales for project files
      const { data: scales } = await supabase
        .from('page_scales')
        .select('file_id, page_number')
        .in('file_id', fileIds.length > 0 ? fileIds : ['__none__']);

      // Fetch all measurements for project
      const { data: measurements } = await supabase
        .from('measurements')
        .select('id, file_id, page_number, measurement_type, value, label')
        .eq('project_id', projectId);

      const results = runQualityGate({
        files: (files as any[]) || [],
        scales: (scales as any[]) || [],
        measurements: (measurements as any[]) || [],
      });

      return {
        passed: results.every(r => r.passed),
        results,
        executedAt: new Date().toISOString(),
      };
    },
    enabled: !!projectId,
    staleTime: 0, // Always refetch when requested
  });
}
