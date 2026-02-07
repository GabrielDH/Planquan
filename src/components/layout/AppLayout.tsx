import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, FileText, Ruler, Calculator, DollarSign,
  ClipboardList, Brain, LogOut, User, TriangleRight, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: ReactNode;
  href?: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Proyectos', icon: <LayoutDashboard className="h-4 w-4" />, href: '/' },
  { label: 'Takeoff', icon: <ClipboardList className="h-4 w-4" />, disabled: true },
  { label: 'Cómputos', icon: <Calculator className="h-4 w-4" />, disabled: true },
  { label: 'Presupuesto', icon: <DollarSign className="h-4 w-4" />, disabled: true },
  { label: 'IA Asistente', icon: <Brain className="h-4 w-4" />, disabled: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
          <TriangleRight className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-bold tracking-tight">PlanQuant</span>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const isActive = item.href && location.pathname === item.href;
            return item.disabled ? (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm opacity-40 cursor-not-allowed"
              >
                {item.icon}
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] font-medium bg-sidebar-accent rounded px-1.5 py-0.5">Pronto</span>
              </div>
            ) : (
              <Link
                key={item.label}
                to={item.href!}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                    : 'hover:bg-sidebar-accent/50'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 mb-2">
            <User className="h-3.5 w-3.5" />
            <span className="truncate">{user?.email}</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
