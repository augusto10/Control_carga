import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Users, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  ChevronRight,
  Calendar,
  UserPlus,
  Activity,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import AdminRoute from '@/components/admin/AdminRoute';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';

interface DashboardStats {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalControles: number;
  controlesFinalizados: number;
  controlesPendentes: number;
  pedidosHoje: number;
  pedidosMes: number;
  ultimosUsuarios: Array<{
    id: string;
    nome: string;
    email: string;
    ultimoAcesso: string | null;
  }>;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const primeiroDiaMes = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

      const [usuariosRes, controlesRes, pedidosHojeRes, pedidosMesRes] = await Promise.all([
        fetch('/api/admin/usuarios', { credentials: 'include' }),
        fetch('/api/controles', { credentials: 'include' }),
        fetch(`/api/pedidos/externos?limit=10000&offset=0&data_inicio=${hoje}&data_fim=${hoje}`, { credentials: 'include' }),
        fetch(`/api/pedidos/externos?limit=10000&offset=0&data_inicio=${primeiroDiaMes}&data_fim=${hoje}`, { credentials: 'include' })
      ]);

      const statsData: DashboardStats = {
        totalUsuarios: 0,
        usuariosAtivos: 0,
        totalControles: 0,
        controlesFinalizados: 0,
        controlesPendentes: 0,
        pedidosHoje: 0,
        pedidosMes: 0,
        ultimosUsuarios: []
      };

      if (usuariosRes.ok) {
        const usuarios = await usuariosRes.json();
        statsData.totalUsuarios = usuarios.length;
        statsData.usuariosAtivos = usuarios.filter((u: any) => u.ativo).length;
        statsData.ultimosUsuarios = usuarios
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map((u: any) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            ultimoAcesso: u.updatedAt
          }));
      }

      if (controlesRes.ok) {
        const controles = await controlesRes.json();
        statsData.totalControles = controles.length;
        statsData.controlesFinalizados = controles.filter((c: any) => c.finalizado).length;
        statsData.controlesPendentes = controles.filter((c: any) => !c.finalizado).length;
      }

      const filtrarPedidos = (lista: any[]) => {
        if (!Array.isArray(lista)) return 0;
        return lista.filter(p => {
          const fechado = String(p.PEDIDO_FECHADO || '').toUpperCase() === 'S';
          const isEntrega = p.TIPO_ENTREGA !== 'NDF' && p.TIPO_ENTREGA !== 'ATO';
          return fechado && isEntrega;
        }).length;
      };

      if (pedidosHojeRes.ok) {
        const data = await pedidosHojeRes.json();
        if (data.error) {
          console.error('[Dashboard] Erro ao carregar pedidos de hoje:', data.error);
          statsData.pedidosHoje = 0;
        } else {
          statsData.pedidosHoje = filtrarPedidos(data.data || []);
        }
      }

      if (pedidosMesRes.ok) {
        const data = await pedidosMesRes.json();
        if (data.error) {
          console.error('[Dashboard] Erro ao carregar pedidos do mês:', data.error);
          statsData.pedidosMes = 0;
        } else {
          statsData.pedidosMes = filtrarPedidos(data.data || []);
        }
      }

      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      loadStats();
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppLayout 
      title="Painel Administrativo" 
      subtitle="Visão geral e indicadores do sistema"
    >
      <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto px-4 sm:px-0">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
          <StatCard 
            title="Total de Usuários" 
            value={stats?.totalUsuarios || 0} 
            icon={Users}
            color="blue"
            loading={loading}
            delay={0.1}
          />
          <StatCard 
            title="Usuários Ativos" 
            value={stats?.usuariosAtivos || 0} 
            icon={CheckCircle2}
            color="green"
            loading={loading}
            delay={0.2}
          />
          <StatCard 
            title="Controles Totais" 
            value={stats?.totalControles || 0} 
            icon={ClipboardList}
            color="indigo"
            loading={loading}
            delay={0.3}
          />
          <StatCard 
            title="Controles Pendentes" 
            value={stats?.controlesPendentes || 0} 
            icon={Clock}
            color="orange"
            loading={loading}
            delay={0.4}
          />
          <StatCard 
            title="Pedidos de Hoje" 
            value={stats?.pedidosHoje || 0} 
            icon={CheckCircle2}
            color="cyan"
            loading={loading}
            delay={0.5}
          />
          <StatCard 
            title="Pedidos do Mês" 
            value={stats?.pedidosMes || 0} 
            icon={Calendar}
            color="blue"
            loading={loading}
            delay={0.6}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Últimos Usuários */}
          <motion.div 
            className="lg:col-span-7"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <UserPlus size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Últimos Usuários</h2>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadStats} 
                  disabled={loading}
                  className="bg-white"
                >
                  <RefreshCw size={14} className={cn("mr-2", loading && "animate-spin")} />
                  Atualizar
                </Button>
              </div>
              
              <div className="max-h-[450px] overflow-auto">
                {loading ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="flex justify-center">
                      <RefreshCw size={32} className="text-blue-500 animate-spin" />
                    </div>
                    <p className="text-slate-500 font-medium">Carregando usuários...</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    <AnimatePresence>
                      {stats?.ultimosUsuarios.length ? (
                        stats.ultimosUsuarios.map((usuario, index) => (
                          <motion.div
                            key={usuario.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                                {usuario.nome.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {usuario.nome}
                                </h4>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Clock size={12} />
                                  <span className="text-xs">
                                    {usuario.ultimoAcesso 
                                      ? `Acesso em ${new Date(usuario.ultimoAcesso).toLocaleString()}` 
                                      : 'Sem acessos registrados'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100 opacity-100">
                              <ChevronRight size={18} />
                            </button>
                          </motion.div>
                        ))
                      ) : (
                        <div className="p-16 text-center space-y-4">
                          <div className="flex justify-center opacity-20">
                            <Users size={64} />
                          </div>
                          <p className="text-slate-400 font-medium">Nenhum usuário encontrado</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Atividades Recentes */}
          <motion.div 
            className="lg:col-span-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="h-full overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <Activity size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Atividades do Sistema</h2>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Clock size={32} className="text-slate-300" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-700">Em Breve</h3>
                  <p className="text-slate-500 text-sm max-w-[280px] leading-relaxed">
                    O registro detalhado de atividades e logs do sistema será exibido aqui em uma atualização futura.
                  </p>
                </div>
                <div className="pt-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                    <AlertCircle size={12} />
                    Funcionalidade em desenvolvimento
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AdminDashboard() {
  return (
    <AdminRoute>
      <AdminDashboardContent />
    </AdminRoute>
  );
}

(AdminDashboard as any).usesAppLayout = true;
