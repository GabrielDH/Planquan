import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Upload, FileText, Image, Eye, Trash2, Download,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.tiff,.tif,.dwg,.dxf';
const FOLDERS = ['Architectural', 'Structural', 'MEP', 'Site', 'Permitting', 'Other'];

const STATUS_MAP: Record<string, string> = { draft: 'Borrador', in_review: 'En revisión', approved: 'Aprobado' };
const TYPE_MAP: Record<string, string> = { residential: 'Residencial', commercial: 'Comercial', remodeling: 'Remodelación' };

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('Architectural');

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase.from('projects').select('*').eq('id', projectId).single();
    setProject(data);
  }, [projectId]);

  const loadFiles = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('folder')
      .order('created_at', { ascending: false });
    setFiles((data as any[]) || []);
  }, [projectId]);

  useEffect(() => { loadProject(); loadFiles(); }, [loadProject, loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !user || !projectId) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'tiff', 'tif'].includes(ext);
      const isPdf = ext === 'pdf';
      const isCad = ['dwg', 'dxf'].includes(ext);
      const fileType = isPdf ? 'pdf' : isImage ? ext : isCad ? ext : 'other';

      const storagePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file);

      if (uploadError) {
        toast({ title: 'Error', description: `Error subiendo ${file.name}: ${uploadError.message}`, variant: 'destructive' });
        continue;
      }

      let totalPages = 1;
      if (isPdf) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          totalPages = pdf.numPages;
        } catch { /* default 1 */ }
      }

      await supabase.from('project_files').insert({
        project_id: projectId,
        user_id: user.id,
        file_name: file.name,
        original_file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        storage_path: storagePath,
        folder: selectedFolder,
        total_pages: totalPages,
      } as any);
    }

    setUploading(false);
    loadFiles();
    toast({ title: 'Archivos subidos' });
    e.target.value = '';
  };

  const handleDelete = async (fileId: string, storagePath: string) => {
    await supabase.storage.from('project-files').remove([storagePath]);
    await supabase.from('project_files').delete().eq('id', fileId);
    loadFiles();
    toast({ title: 'Archivo eliminado' });
  };

  if (!project) {
    return <AppLayout><div className="p-6"><p>Cargando proyecto...</p></div></AppLayout>;
  }

  const groupedFiles = FOLDERS.reduce((acc, folder) => {
    const folderFiles = files.filter(f => f.folder === folder);
    if (folderFiles.length > 0) acc[folder] = folderFiles;
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Proyectos
        </Button>

        {/* Project Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {project.location && `${project.location} · `}
                  {TYPE_MAP[project.project_type] || project.project_type} ·{' '}
                  {project.unit_system === 'imperial' ? 'Imperial' : 'Métrico'}
                </p>
              </div>
              <Badge>{STATUS_MAP[project.status] || project.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">Niveles:</span> {project.levels}</div>
            <div><span className="text-muted-foreground">Altura:</span> {project.typical_height} {project.typical_height_unit}</div>
            {project.total_area && <div><span className="text-muted-foreground">Área:</span> {project.total_area} {project.total_area_unit}</div>}
            <div><span className="text-muted-foreground">Archivos:</span> {files.length}</div>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Subir planos</p>
                <p className="text-xs text-muted-foreground mb-2">PDF, JPG, PNG, TIFF, DWG, DXF</p>
              </div>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Input
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  onChange={handleUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Button disabled={uploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Subiendo...' : 'Seleccionar archivos'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        {files.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay archivos. Sube planos para comenzar.</p>
          </Card>
        ) : (
          Object.entries(groupedFiles).map(([folder, folderFiles]) => (
            <div key={folder} className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{folder}</h3>
              <div className="space-y-1">
                {folderFiles.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    {f.file_type === 'pdf' ? <FileText className="h-5 w-5 text-destructive" /> : <Image className="h-5 w-5 text-info" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.original_file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.file_type.toUpperCase()} · {(f.file_size / 1024).toFixed(0)} KB
                        {f.total_pages > 1 && ` · ${f.total_pages} páginas`}
                        {` · Rev ${f.current_revision}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'].includes(f.file_type) && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/projects/${projectId}/viewer/${f.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id, f.storage_path)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
