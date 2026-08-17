import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Truck, 
  Users, 
  Settings, 
  Menu, 
  X, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  Search,
  LogOut,
  User,
  ClipboardList,
  AlertTriangle,
  History,
  Map,
  Tags
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import UserMenu from '../UserMenu';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  fluid?: boolean;
}

export function AppLayout({ 
  children, 
  title, 
  subtitle, 
  showHeader = true,
  breadcrumbs,
  actions,
  fluid = false
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarHoverExpanded, setSidebarHoverExpanded] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { user, logout } = useAuth();
  const SIDEBAR_COLLAPSED_KEY = 'app_layout_sidebar_collapsed';
  const SIDEBAR_AUTO_CLOSE_MS = 30000;
  const hiddenMenuNames = new Set([
    'Painel Gerencial',
    'Checklist Recebimento',
    'Controle de Materiais'
  ]);

  const menuItems = [
    { name: 'Início', icon: LayoutDashboard, href: '/', exact: true },
    { 
      name: 'Pedidos', 
      icon: ShoppingCart, 
      children: [
        { name: 'Pedidos Entregas', href: '/admin/pedidos' },
        { name: 'Kanban de Pedidos', href: '/kanban-pedidos' },
        { name: 'Rastrear Pedidos Entrega', href: '/ssw-accert' },
      ]
    },
    {
      name: 'Gestão de Notas',
      icon: FileText,
      children: [
        { name: 'Adicionar Notas', href: '/adicionar-notas' },
        { name: 'Consultar Notas', href: '/consultar-notas' },
      ]
    },
    { 
      name: 'Controle de Carga', 
      icon: Truck,
      children: [
        { name: 'Criar Controle', href: '/criar-controle' },
        { name: 'Listar Controles', href: '/controles' },
        { name: 'Baixar Entregas', href: '/baixar-entregas' },
      ]
    },
    {
      name: 'Etiquetas',
      icon: Tags,
      children: [
        { name: 'Etiquetas de Produto', href: '/criar-etiquetas' },
        { name: 'Gerar PDF Etiquetas por Marca', href: '/etiquetas-por-marca' },
        { name: 'Etiquetas de Transporte', href: '/etiquetas-transporte' },

      ]
    },
    {
      name: 'Roteirização',
      icon: Map,
      children: [
        { name: 'Roteirização', href: '/roteirizacao' },
      ]
    },
    { 
      name: 'Checklist Recebimento', 
      icon: History,
      children: [
        { name: 'Novo Checklist', href: '/checklist-recebimento/regras-ouro' },
        { name: 'Relatórios Checklist', href: '/checklist-recebimento/relatorios' },
        { name: 'Alertas de Validade', href: '/checklist-recebimento/relatorio-validade' },
        { name: 'Relatórios Avançados', href: '/checklist-recebimento/relatorios-avancados' },
      ]
    },
    { 
      name: 'Cadastros', 
      icon: Users,
      children: [
        { name: 'Usuários', href: '/admin/usuarios', adminOnly: true },
        { name: 'Motoristas', href: '/admin/motoristas' },
        { name: 'Funcionários', href: '/funcionarios-clientes', adminOnly: true },
        { name: 'Clientes', href: '/funcionarios-clientes', adminOnly: true },
      ]
    },
    { 
      name: 'Controle de Materiais', 
      icon: ClipboardList,
      children: [
        { name: 'Cadastro de Materiais', href: '/materiais/cadastro', roles: ['ADMIN','GERENTE'] },
        { name: 'Solicitar Materiais', href: '/materiais/solicitar', roles: ['ADMIN','GERENTE','SEPARADOR','CONFERENTE','AUDITOR','USUARIO'] },
        { name: 'Aprovar Solicitações', href: '/materiais/aprovar', roles: ['ADMIN','GERENTE'] },
        { name: 'Relatórios', href: '/materiais/relatorios', roles: ['ADMIN','GERENTE'] },
      ]
    },
    { 
      name: 'Relatórios e Análises', 
      icon: LayoutDashboard,
      children: [
        { name: 'Relatório de Entregas', href: '/relatorios/entregas' },
        { name: 'Relatório de Pallets', href: '/relatorios/pallets' },
        { name: 'Relatório de Controles', href: '/relatorios/controles-carga' },
        { name: 'Pendencias de Entrega', href: '/relatorios/pendencias-entrega' },
        { name: 'Fretes', href: '/relatorios/fretes' },
      ]
    },
    { name: 'Configurações', icon: Settings, href: '/admin/configuracoes', adminOnly: true },
    { name: 'Meu Perfil', icon: User, href: '/perfil' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    return exact ? router.pathname === path : router.pathname.startsWith(path);
  };

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const monthKey = new Date().toISOString().slice(0, 7);
    const warmKey = `pedidos_month_cache_warm:${monthKey}`;
    if (window.sessionStorage.getItem(warmKey)) return;

    window.sessionStorage.setItem(warmKey, '1');
    void fetch('/api/pedidos/externos?preload_month=1', {
      credentials: 'include',
      headers: { accept: 'application/json' }
    }).then((response) => {
      if (!response.ok) throw new Error('Falha ao aquecer cache de pedidos');
    }).catch(() => {
      window.sessionStorage.removeItem(warmKey);
    });
  }, [user]);

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sidebarCollapsed && !sidebarOpen) return;

    let timeoutId = window.setTimeout(() => {
      setSidebarCollapsed(true);
      setSidebarOpen(false);
    }, SIDEBAR_AUTO_CLOSE_MS);

    const resetAutoClose = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setSidebarCollapsed(true);
        setSidebarOpen(false);
      }, SIDEBAR_AUTO_CLOSE_MS);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetAutoClose, { passive: true }));

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetAutoClose));
    };
  }, [sidebarCollapsed, sidebarOpen]);

  const handleToggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => !prev);
    setSidebarHoverExpanded(false);
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const sidebarExpanded = !sidebarCollapsed || sidebarHoverExpanded;

  return (
    <div className="min-h-screen bg-app-bg flex text-textMain">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => {
          if (typeof window !== 'undefined' && window.innerWidth >= 768 && sidebarCollapsed) {
            setSidebarHoverExpanded(true);
          }
        }}
        onMouseLeave={() => {
          if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            setSidebarHoverExpanded(false);
          }
        }}
        className={cn(
        "fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-50 transition-all duration-300 md:translate-x-0 md:static md:block",
        sidebarExpanded ? "w-64 md:w-64" : "w-64 md:w-20",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6">
            {sidebarExpanded && (
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Navegação
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems
              .filter((item: any) => {
                if (hiddenMenuNames.has(item.name)) return false;
                if (item.adminOnly && user?.tipo !== 'ADMIN' && user?.tipo !== 'GERENTE') return false;
                return true;
              })
              .map((item: any) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                const activeTop = item.href ? isActive(item.href, item.exact) : hasChildren && item.children.some((c: any) => isActive(c.href));
                const open = openSubmenus[item.name] || false;
                const ItemIcon = item.icon;
                return (
                  <div key={item.name} className="space-y-1">
                    {item.href && !hasChildren ? (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                          !sidebarExpanded && "md:justify-center md:px-2",
                          activeTop ? "bg-primary text-white" : "text-textMuted hover:bg-slate-50 hover:text-textMain"
                        )}
                        title={!sidebarExpanded ? item.name : undefined}
                      >
                        <ItemIcon className={cn("w-5 h-5", activeTop ? "text-white" : "text-textMuted group-hover:text-primary")} />
                        <span className={cn("truncate", !sidebarExpanded && "md:hidden")}>{item.name}</span>
                        {activeTop && sidebarExpanded && <ChevronRight className="w-4 h-4 ml-auto" />}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!sidebarExpanded) {
                            setSidebarHoverExpanded(true);
                            setOpenSubmenus((prev) => ({ ...prev, [item.name]: true }));
                            return;
                          }
                          toggleSubmenu(item.name);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                          !sidebarExpanded && "md:justify-center md:px-2",
                          activeTop ? "bg-primary text-white" : "text-textMuted hover:bg-slate-50 hover:text-textMain"
                        )}
                        title={!sidebarExpanded ? item.name : undefined}
                      >
                        <ItemIcon className={cn("w-5 h-5", activeTop ? "text-white" : "text-textMuted group-hover:text-primary")} />
                        <span className={cn("truncate", !sidebarExpanded && "md:hidden")}>{item.name}</span>
                        {sidebarExpanded && (
                          <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", open ? "rotate-180" : "")} />
                        )}
                      </button>
                    )}
                    {hasChildren && open && sidebarExpanded && (
                      <div className="pl-8 space-y-1">
                        {item.children
                          .filter((c: any) => {
                            if (c.adminOnly && user?.tipo !== 'ADMIN' && user?.tipo !== 'GERENTE') return false;
                            if (c.roles && Array.isArray(c.roles)) return c.roles.includes(user?.tipo);
                            return true;
                          })
                          .map((c: any) => {
                            const subActive = isActive(c.href);
                            return (
                              <Link
                                key={c.name}
                                href={c.href}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                                  subActive ? "bg-primary/10 text-primary" : "text-textMuted hover:bg-slate-50 hover:text-textMain"
                                )}
                              >
                                <div className={cn("w-1.5 h-1.5 rounded-full", subActive ? "bg-primary" : "bg-slate-300")} />
                                <span className="truncate">{c.name}</span>
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-slate-100">
            <div className={cn(
              "p-2 rounded-xl bg-slate-50 border border-slate-100",
              !sidebarExpanded ? "flex justify-center" : "flex items-center gap-3"
            )}>
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-white">
                {user?.foto ? (
                  <img src={user.foto} alt={user.nome} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-slate-400" />
                )}
              </div>
              {sidebarExpanded && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.nome || 'Usuário'}</p>
                    <p className="text-xs text-textMuted truncate">{user?.email || 'admin@sistema.com'}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg text-textMuted hover:text-danger hover:bg-danger/5 transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <button
              className="hidden md:inline-flex p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={handleToggleSidebarCollapsed}
              title={sidebarExpanded ? 'Recolher menu' : 'Expandir menu'}
            >
              {!sidebarExpanded ? (
                <ChevronRight className="w-5 h-5 text-textMuted" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-textMuted" />
              )}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-primary/20 shadow-lg">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">Control<span className="text-primary">Carga</span></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-textMuted hidden md:block">
              {(!showHeader && subtitle) ? subtitle : 'Acompanhamento detalhado de vendas e entregas'}
            </span>
            <button className="hidden sm:flex p-2 rounded-lg hover:bg-slate-100 transition-colors relative">
              <Bell className="w-5 h-5 text-textMuted" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
            <div className="flex items-center">
              <UserMenu showInlineLabel />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className={cn(
            "mx-auto animate-in fade-in duration-500",
            fluid ? "max-w-none" : "max-w-7xl"
          )}>
            {showHeader && (
              <div className="mb-6 md:mb-8">
                <div className="flex flex-col gap-4">
                  {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="flex items-center text-sm text-slate-500">
                      {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                          {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />}
                          {crumb.href ? (
                            <Link href={crumb.href} className="hover:text-primary transition-colors">
                              {crumb.label}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-900">{crumb.label}</span>
                          )}
                        </React.Fragment>
                      ))}
                    </nav>
                  )}

                  <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md shadow-sm px-5 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
                        {title}
                      </h1>
                      {subtitle && (
                        <p className="text-sm md:text-base text-slate-600">
                          {subtitle}
                        </p>
                      )}
                    </div>
                    {actions && (
                      <div className="flex items-center gap-2">
                        {actions}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
