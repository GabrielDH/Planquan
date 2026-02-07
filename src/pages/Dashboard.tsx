import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, MapPin, Calendar, AlertTriangle } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  location: string;
  project_type: string;
  status: string;
  unit_system: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  in_review: { label: 'En revisión', variant: 'outline' },
  approved: { label: 'Aprobado', variant: 'default' },
};

const TYPE_MAP: Record<string, string> = {
  residential: 'Residencial',
  commercial: 'Comercial',
  remodeling: 'Remodelación',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setProjects((data as any[]) || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Disclaimer */}
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-warning-foreground">
            <strong>Estimación preliminar.</strong> No sustituye planos constructivos ni presupuesto ejecutivo. Verificar en obra y con profesionales responsables.
          </p>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus estimaciones de construcción</p>
          </div>
          <Button onClick={() => navigate('/projects/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-5 bg-muted rounded w-3/4" /></CardHeader>
                <CardContent><div className="h-4 bg-muted rounded w-1/2" /></CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Sin proyectos</h3>
            <p className="text-sm text-muted-foreground mb-4">Crea tu primer proyecto para comenzar a estimar.</p>
            <Button onClick={() => navigate('/projects/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Proyecto
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-semibold line-clamp-1">{p.name}</CardTitle>
                      <Badge variant={STATUS_MAP[p.status]?.variant || 'secondary'}>
                        {STATUS_MAP[p.status]?.label || p.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {p.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="line-clamp-1">{p.location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>{TYPE_MAP[p.project_type] || p.project_type}</span>
                      <span className="uppercase text-xs font-medium">{p.unit_system === 'imperial' ? 'IMP' : 'MET'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
