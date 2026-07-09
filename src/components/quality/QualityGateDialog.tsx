import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useQualityGate } from '@/hooks/useQualityGate';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onApproved?: () => void;
}

export default function QualityGateDialog({ open, onClose, projectId, onApproved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: gateResult, isLoading, refetch } = useQualityGate(open ? projectId : undefined);
  const [forceComment, setForceComment] = useState('');
  const [showForce, setShowForce] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if user is admin (from profile)
  const [isAdmin, setIsAdmin] = useState(false);
  if (user && !isAdmin) {
    supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.role === 'admin') setIsAdmin(true); });
  }

  const handleApprove = async (force = false) => {
    if (!user || !gateResult) return;
    setSaving(true);
    try {
      // Save gate result
      await supabase.from('quality_gate_results').insert({
        project_id: projectId,
        executed_by: user.id,
        passed: force ? false : gateResult.passed,
        results: gateResult.results as any,
        force_approved: force,
        force_comment: force ? forceComment : null,
      } as any);

      // Update project status
      await supabase.from('projects').update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        force_approved: force,
      } as any).eq('id', projectId);

      toast({ title: force ? 'Aprobación forzada' : 'Proyecto aprobado' });
      onApproved?.();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Gate de Calidad
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Verificando...</div>
        ) : gateResult ? (
          <div className="space-y-4 py-2">
            {/* Overall status */}
            <div className={`flex items-center gap-2 p-3 rounded ${gateResult.passed ? 'bg-success/10' : 'bg-destructive/10'}`}>
              {gateResult.passed ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium text-sm">
                {gateResult.passed ? 'Todas las validaciones pasaron' : 'Hay validaciones pendientes'}
              </span>
            </div>

            {/* Rules list */}
            <div className="space-y-2">
              {gateResult.results.map(rule => (
                <div key={rule.ruleId} className="border rounded p-3">
                  <div className="flex items-center gap-2">
                    {rule.passed ? (
                      <CheckCircle className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="text-sm font-medium">{rule.ruleName}</span>
                    {!rule.passed && (
                      <Badge variant="destructive" className="text-[10px] ml-auto">
                        {rule.failures.length} falla{rule.failures.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {!rule.passed && rule.failures.length > 0 && (
                    <div className="mt-2 pl-6 space-y-0.5 max-h-24 overflow-y-auto">
                      {rule.failures.slice(0, 10).map((f, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{f.message}</p>
                      ))}
                      {rule.failures.length > 10 && (
                        <p className="text-xs text-muted-foreground">...y {rule.failures.length - 10} más</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Force approval for admin */}
            {!gateResult.passed && isAdmin && (
              <div className="border-t pt-3">
                {!showForce ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowForce(true)}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Forzar aprobación (admin)
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Justificación de aprobación forzada (obligatorio)..."
                      value={forceComment}
                      onChange={e => setForceComment(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs"
                      onClick={() => handleApprove(true)}
                      disabled={!forceComment.trim() || saving}
                    >
                      Confirmar aprobación forzada
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {gateResult?.passed && (
            <Button onClick={() => handleApprove(false)} disabled={saving}>
              {saving ? 'Aprobando...' : 'Aprobar proyecto'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
