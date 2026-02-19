import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatCard } from '@/components/ui/StatCard';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Filter, 
  RefreshCw, 
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  FilePlus,
  ClipboardList,
  ShoppingCart
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';

const ConsultarNotas = () => {
  const [loading, setLoading] = useState(true);
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const [start, setStart] = useState(hoje);
  const [end, setEnd] = useState(hoje);
  const [numeroNota, setNumeroNota] = useState('');
  const { notas, fetchNotas, deleteNota } = useStore();
  
  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  const [stats, setStats] = useState({
    notasHoje: 0,
    notasMes: 0,
    loading: true
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats({
            notasHoje: data.notasHoje || 0,
            notasMes: data.notasMes || 0,
            loading: false
          });
        }
      } catch (error) {
        console.error('Erro ao carregar stats:', error);
        setStats(s => ({ ...s, loading: false }));
      }
    };
    loadStats();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const loadNotas = useCallback(async (s = start, e = end, n = numeroNota) => {
    setLoading(true);
    try {
      await fetchNotas(s, e, n);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      showToast('Erro ao carregar notas', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchNotas, start, end, numeroNota]);

  useEffect(() => {
    loadNotas();
  }, [loadNotas]);

  const handleFiltrarHoje = () => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    setStart(hoje);
    setEnd(hoje);
    loadNotas(hoje, hoje, numeroNota);
  };

  const handleLimparFiltros = () => {
    setStart('');
    setEnd('');
    setNumeroNota('');
    loadNotas('', '', '');
  };

  const handleExcluirNota = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteNota(id);
      showToast('Nota excluída com sucesso!');
      await loadNotas();
    } catch (error) {
      let errorMessage = 'Erro ao excluir nota. Tente novamente.';
      if (error instanceof Error) errorMessage = error.message;
      showToast(errorMessage, 'error');
    }
  };

  return (
    <AppLayout 
      title="Consultar Notas Fiscais" 
      subtitle="Gerencie e visualize as notas fiscais emitidas"
    >
      <div className="space-y-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
            title="Notas do Mês" 
            value={stats.notasMes} 
            icon={Calendar}
            color="indigo"
            trend="Acumulado mensal"
            loading={stats.loading}
            delay={0.2}
          />
        </div>

        {/* Filtros */}
        <Card className="overflow-visible">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-sm">
              <Filter className="w-4 h-4 text-primary" />
              <h2>Filtros de Consulta</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Número da Nota
                </Label>
                <SearchInput
                  placeholder="Ex: 12345"
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Data Início
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="date"
                    className="pl-10"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Data Fim
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="date"
                    className="pl-10"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Button 
                  variant="primary"
                  className="flex-1 h-[42px] font-bold uppercase tracking-wider text-xs"
                  onClick={() => loadNotas()}
                  loading={loading}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleFiltrarHoje}
                  className="bg-white rounded-xl"
                >
                  <CalendarDays className="w-4 h-4 mr-2 text-primary" />
                  Hoje
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLimparFiltros}
                  className="bg-white rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2 text-slate-500" />
                  Limpar Filtros
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  <strong className="text-slate-700">Período:</strong> {start ? format(new Date(start + 'T12:00:00'), 'dd/MM/yyyy') : 'Início'} - {end ? format(new Date(end + 'T12:00:00'), 'dd/MM/yyyy') : 'Fim'}
                </span>
                <span className="mx-2 text-slate-300">|</span>
                <span>
                  <strong className="text-slate-700">Total:</strong> {notas.length} nota(s)
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabela */}
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data de Criação</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Número da Nota</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volumes</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-slate-500 font-medium">Carregando notas...</p>
                      </div>
                    </td>
                  </tr>
                ) : notas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                          <FileText className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-lg font-bold text-slate-600">Nenhuma nota encontrada</p>
                        <p className="text-sm">Tente ajustar seus filtros de busca para encontrar o que procura</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  notas.map((nota) => (
                    <tr key={nota.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">
                            {nota.dataCriacao ? format(new Date(nota.dataCriacao), 'dd/MM/yyyy') : '-'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {nota.dataCriacao ? format(new Date(nota.dataCriacao), 'HH:mm') : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-sm font-bold text-slate-900">{nota.numeroNota}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{nota.codigo || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{nota.volumes || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {nota.controleId ? (
                          <div className="flex flex-col">
                            <Badge variant="success" className="flex items-center gap-1.5 w-fit px-3 py-1 rounded-full mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Carga</span>
                            </Badge>
                            <span className="text-[10px] text-slate-500 font-medium ml-1">
                              Vínculo: {nota.controle?.dataCriacao ? format(new Date(nota.controle.dataCriacao), 'dd/MM') : 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="warning" className="flex items-center gap-1.5 w-fit px-3 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Disponível</span>
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          {!nota.controleId ? (
                            <button 
                              onClick={() => handleExcluirNota(nota.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Excluir Nota"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          ) : (
                            <div className="w-9 h-9" /> // Espaçador
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 w-[calc(100%-2rem)] max-w-[400px] md:w-auto",
          toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </AppLayout>
  );
};

export default ConsultarNotas;

(ConsultarNotas as any).usesAppLayout = true;
