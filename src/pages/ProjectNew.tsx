import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

const TEMPLATES = [
  { value: 'florida_residential', label: 'Florida Residential (USA)', units: 'imperial', currency: 'USD', numFmt: 'us' },
  { value: 'usa_general', label: 'USA General', units: 'imperial', currency: 'USD', numFmt: 'us' },
  { value: 'international_metric', label: 'Internacional (Métrico)', units: 'metric', currency: 'EUR', numFmt: 'international' },
  { value: 'custom', label: 'Personalizado', units: 'imperial', currency: 'USD', numFmt: 'us' },
];

export default function ProjectNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    location: '',
    project_type: 'residential',
    regional_template: 'florida_residential',
    unit_system: 'imperial',
    levels: 1,
    typical_height: 9,
    typical_height_unit: 'ft',
    total_area: undefined as number | undefined,
    total_area_unit: 'ft2',
    currency: 'USD',
    number_format: 'us',
    notes: '',
  });

  const handleTemplateChange = (value: string) => {
    const tpl = TEMPLATES.find(t => t.value === value);
    if (tpl) {
      setForm(f => ({
        ...f,
        regional_template: value,
        unit_system: tpl.units,
        currency: tpl.currency,
        number_format: tpl.numFmt,
        typical_height_unit: tpl.units === 'imperial' ? 'ft' : 'm',
        total_area_unit: tpl.units === 'imperial' ? 'ft2' : 'm2',
        typical_height: tpl.units === 'imperial' ? 9 : 2.7,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'El nombre del proyecto es requerido', variant: 'destructive' });
      return;
    }
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...form,
        user_id: user.id,
        status: 'draft',
        total_area: form.total_area || null,
      } as any)
      .select('id')
      .single();

    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Proyecto creado' });
      navigate(`/projects/${(data as any).id}`);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Nombre del proyecto *</Label>
                  <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Residencia Smith - Miami" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input id="location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Miami, FL" />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de proyecto</Label>
                  <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residencial</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="remodeling">Remodelación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Plantilla regional</Label>
                  <Select value={form.regional_template} onValueChange={handleTemplateChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sistema de unidades</Label>
                  <Select value={form.unit_system} onValueChange={v => setForm(f => ({ ...f, unit_system: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imperial">Imperial (ft, in)</SelectItem>
                      <SelectItem value="metric">Métrico (m, cm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="levels">Niveles</Label>
                  <Input id="levels" type="number" min={1} value={form.levels} onChange={e => setForm(f => ({ ...f, levels: parseInt(e.target.value) || 1 }))} />
                </div>

                <div className="space-y-2">
                  <Label>Altura típica ({form.typical_height_unit})</Label>
                  <Input type="number" step="0.1" value={form.typical_height} onChange={e => setForm(f => ({ ...f, typical_height: parseFloat(e.target.value) || 0 }))} />
                </div>

                <div className="space-y-2">
                  <Label>Área total ({form.total_area_unit})</Label>
                  <Input type="number" step="0.01" value={form.total_area ?? ''} onChange={e => setForm(f => ({ ...f, total_area: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="Opcional" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Notas</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales del proyecto..." rows={3} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Creando...' : 'Crear Proyecto'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
