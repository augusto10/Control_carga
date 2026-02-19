import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import { 
  FilePlus, 
  ClipboardList, 
  ShoppingCart,
  Clock,
  TrendingUp, 
  RefreshCw,
  CheckSquare, 
  AlertTriangle, 
  Plus, 
  Search, 
  Tag, 
  ListChecks, 
  BarChart2
} from 'lucide-react';

function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    notasHoje: 0,
    controlesHoje: 0,
    pedidosHoje: 0,
    controlesPendentes: 0,
    loading: true
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const loadDashboardStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      const res = await fetch('/api/dashboard/resumo-hoje', { credentials: 'include' });
      const data = res.ok ? await res.json() : {};

      setStats({
        notasHoje: data.notasHoje || 0,
        controlesHoje: data.controlesHoje || 0,
        pedidosHoje: data.pedidosHoje || 0,
        controlesPendentes: data.controlesPendentes || 0,
        loading: false
      });
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardStats();
    }
  }, [isAuthenticated]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const menuCards = [
    {
      title: 'Adicionar Notas',
      description: 'Entrada de novas NFs',
      icon: FilePlus,
      href: '/adicionar-notas',
      color: 'blue',
    },
    {
      title: 'Criar Controle',
      description: 'Novo controle de carga',
      icon: Plus,
      href: '/criar-controle',
      color: 'green',
    },
    {
      title: 'Consultar Notas',
      description: 'Busca e histórico de NFs',
      icon: Search,
      href: '/consultar-notas',
      color: 'orange',
    },
    {
      title: 'Consultar Controles',
      description: 'Status de carregamentos',
      icon: ClipboardList,
      href: '/controles',
      color: 'purple',
    },
    {
      title: 'Checklist Empilhadeiras',
      description: 'Inspeção obrigatória',
      icon: CheckSquare,
      href: '/checklist-empilhadeiras',
      color: 'amber',
    },
    {
      title: 'Gerar Etiquetas',
      description: 'ZPL e Código de Barras',
      icon: Tag,
      href: '/gerar-etiquetas',
      color: 'red',
    },
    {
      title: 'Recebimento',
      description: 'Checklist e Regras de Ouro',
      icon: ListChecks,
      href: '/checklist-recebimento/regras-ouro',
      color: 'indigo',
    },
    {
      title: 'Relatórios',
      description: 'Indicadores e análises',
      icon: BarChart2,
      href: '/relatorios',
      color: 'cyan',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AppLayout 
      title={`Olá, ${user?.nome?.split(' ')[0] || 'Usuário'}`}
      subtitle={`${getGreeting()}! Aqui está o resumo das atividades de hoje.`}
    >
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
            title="Notas de Hoje" 
            value={stats.notasHoje} 
            icon={FilePlus}
            color="blue"
            trend="Registradas hoje"
            loading={stats.loading}
            delay={0.1}
          />
          <StatCard 
            title="Controles de Hoje" 
            value={stats.controlesHoje} 
            icon={ClipboardList}
            color="green"
            trend="Gerados hoje"
            loading={stats.loading}
            delay={0.2}
          />
          <StatCard 
            title="Pedidos de Hoje" 
            value={stats.pedidosHoje} 
            icon={ShoppingCart}
            color="purple"
            trend="Recebidos hoje"
            loading={stats.loading}
            delay={0.3}
          />
        </div>

        {/* Menu Grid */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {menuCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (index * 0.05) }}
                whileHover={{ y: -5 }}
              >
                <a href={card.href} className="block h-full">
                  <Card className="h-full hover:shadow-lg transition-all duration-300 border-slate-200 group cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors duration-300 group-hover:text-white",
                        card.color === 'blue' && "bg-blue-50 text-blue-600 group-hover:bg-blue-600",
                        card.color === 'green' && "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600",
                        card.color === 'orange' && "bg-orange-50 text-orange-600 group-hover:bg-orange-600",
                        card.color === 'purple' && "bg-purple-50 text-purple-600 group-hover:bg-purple-600",
                        card.color === 'amber' && "bg-amber-50 text-amber-600 group-hover:bg-amber-600",
                        card.color === 'red' && "bg-rose-50 text-rose-600 group-hover:bg-rose-600",
                        card.color === 'indigo' && "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600",
                        card.color === 'cyan' && "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600",
                      )}>
                        <card.icon size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

Home.usesAppLayout = true; // Disable default _app.tsx layout wrapping to avoid duplication

export default Home;