import { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Edit, 
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  Truck,
  Plus,
  FileText,
  User,
  Calendar,
  MoreVertical,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AdminRoute from '@/components/admin/AdminRoute';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { canDeleteControle } from '@/lib/auth/permissions';

interface Controle {
  id: string;
  numeroManifesto: string | null;
  motorista: string;
  responsavel: string;
  finalizado: boolean;
  transportadora: string;
  dataCriacao: string;
  dataFinalizacao?: string | null;
  notas: Array<{
    id: string;
    numeroNota: string;
    codigo: string;
  }>;
  usuario: {
    nome: string;
  };
}

function GerenciarControlesContent() {
  const { user } = useAuth();
  const [controles, setControles] = useState<Controle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentControle, setCurrentControle] = useState<Partial<Controle> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [notasSelecionadas, setNotasSelecionadas] = useState<string[]>([]);
  const [notasDisponiveis, setNotasDisponiveis] = useState<Controle['notas']>([]);
  const [notasLoading, setNotasLoading] = useState(false);
  const [notasErro, setNotasErro] = useState('');
  useEffect(() => {
    if (!isFormModalOpen || !currentControle?.id) return;
    let cancelled = false;
    setNotasLoading(true);
    setNotasErro('');
    api.get('/api/notas', { params: { disponiveis: '1', transportadoraDestino: currentControle.transportadora } })
      .then(({ data }) => { if (!cancelled) setNotasDisponiveis(data); })
      .catch(() => { if (!cancelled) setNotasErro('Não foi possível carregar as notas. Feche e abra a edição para tentar novamente.'); })
      .finally(() => { if (!cancelled) setNotasLoading(false); });
    return () => { cancelled = true; };
  }, [isFormModalOpen, currentControle?.id, currentControle?.transportadora]);
  const opcoesNotas = Array.from(new Map([...(currentControle?.notas || []), ...notasDisponiveis].map((nota) => [nota.id, nota])).values());
  
  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const filteredControles = controles.filter(c => 
    (c.numeroManifesto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.motorista || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.responsavel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.usuario?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Carregar controles quando o componente for montado
  useEffect(() => {
    carregarControles();
  }, []);

  const carregarControles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/controles');
      setControles(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Erro ao carregar controles:', error);
      setError('Não foi possível carregar a lista de controles.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditarControle = (controle: Controle) => {
    setNotasSelecionadas(controle.notas.map((nota) => nota.id));
    setNotasDisponiveis([]);
    setNotasErro('');
    setNotasLoading(true);
    setCurrentControle({
      ...controle,
      motorista: controle.motorista || '',
      responsavel: controle.responsavel || ''
    });
    setIsEditing(true);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentControle(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentControle(prev => ({
      ...prev!,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentControle || notasLoading || notasErro) return;

    try {
      setLoading(true);
      if (isEditing && currentControle.id) {
        await api.put(`/api/controles/${currentControle.id}`, {
          motorista: currentControle.motorista,
          responsavel: currentControle.responsavel,
          finalizado: currentControle.finalizado,
          notasIds: notasSelecionadas,
        });
        showToast('Controle atualizado com sucesso!');
      }
      handleCloseFormModal();
      await carregarControles();
    } catch (error: any) {
      console.error('Erro ao salvar controle:', error);
      showToast(error.response?.data?.message || 'Erro ao salvar controle', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirControle = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este controle? As notas e os pedidos serão desvinculados e preservados. Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/api/controles/${id}`);
      setControles((atual) => atual.filter((controle) => controle.id !== id));
      showToast('Controle excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir controle:', error);
      showToast(error.response?.data?.message || 'Erro ao excluir controle', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarControle = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja finalizar este controle?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.put(`/api/controles/${id}`, { finalizado: true });
      setControles((atual) => atual.map((controle) => controle.id === id ? response.data : controle));
      showToast('Controle finalizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao finalizar controle:', error);
      showToast(error.response?.data?.message || 'Erro ao finalizar controle', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ABERTO':
        return { label: 'Aberto', variant: 'info' as const, icon: Clock };
      case 'EM_ANDAMENTO':
        return { label: 'Em Andamento', variant: 'warning' as const, icon: RefreshCw };
      case 'FINALIZADO':
        return { label: 'Finalizado', variant: 'success' as const, icon: CheckCircle2 };
      case 'CANCELADO':
        return { label: 'Cancelado', variant: 'danger' as const, icon: XCircle };
      default:
        return { label: status, variant: 'neutral' as const, icon: AlertCircle };
    }
  };

  return (
    <AppLayout 
      fluid
      title="Gestão de Controles" 
      subtitle="Visualize, edite e gerencie todos os controles de carga do sistema"
    >
      <Head>
        <title>Controles | ControlCarga</title>
      </Head>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <SearchInput 
              placeholder="Buscar por número, motorista ou responsável..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              iconLeft={<RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />}
              onClick={carregarControles}
              disabled={loading}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* Tabela de Controles */}
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold text-textMain">Número</th>
                  <th className="px-6 py-4 font-semibold text-textMain">Motorista</th>
                  <th className="px-6 py-4 font-semibold text-textMain hidden md:table-cell">Responsável</th>
                  <th className="px-6 py-4 font-semibold text-textMain hidden sm:table-cell">Notas</th>
                  <th className="px-6 py-4 font-semibold text-textMain">Status</th>
                  <th className="px-6 py-4 font-semibold text-textMain hidden lg:table-cell">Data Criação</th>
                  <th className="px-6 py-4 font-semibold text-textMain hidden xl:table-cell">Usuário</th>
                  <th className="px-6 py-4 font-semibold text-textMain text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && controles.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="h-10 bg-slate-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredControles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-textMuted">
                        <Truck className="w-10 h-10 opacity-20" />
                        <p>Nenhum controle encontrado.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredControles.map((controle) => {
                    const statusInfo = getStatusInfo(controle.finalizado ? 'FINALIZADO' : 'ABERTO');
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr key={controle.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-textMain">
                            {controle.numeroManifesto || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {controle.motorista?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-textMain">{controle.motorista || 'Não informado'}</span>
                              <span className="text-xs text-textMuted">ID: {controle.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell text-textMain">
                          {controle.responsavel || 'Não informado'}
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          {controle.notas && controle.notas.length > 0 ? (
                            <Badge variant="info" className="gap-1">
                              <FileText className="w-3 h-3" />
                              {controle.notas.length} nota(s)
                            </Badge>
                          ) : (
                            <span className="text-xs text-textMuted italic">Sem notas</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="flex flex-col text-xs">
                            <span className="text-textMain font-medium">
                              {format(new Date(controle.dataCriacao), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span className="text-textMuted flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(controle.dataCriacao), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden xl:table-cell text-xs text-textMuted font-medium">
                          {controle.usuario?.nome || '-'}
                        </td>
                        <td className="sticky right-0 bg-white px-6 py-4 text-right min-w-[180px]">
                          <div className="flex flex-nowrap items-center justify-end gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleOpenEditarControle(controle)}
                              title="Editar Controle"
                            >
                              <Edit className="w-4 h-4 text-primary" />
                            </Button>
                            {user?.tipo === 'ADMIN' && <Button
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleExcluirControle(controle.id)}
                              disabled={loading || !canDeleteControle(user, { finalizado: controle.finalizado, notasCount: controle.notas?.length || 0 })}
                              aria-label="Excluir controle"
                              title="Excluir controle"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>}
                            {!controle.finalizado && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleFinalizarControle(controle.id)}
                                title="Finalizar"
                                aria-label="Finalizar controle"
                                disabled={loading}
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal de Formulário */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title="Editar Controle"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label>Número do Controle</Label>
                <Input 
                  type="text"
                  disabled
                  value={currentControle?.numeroManifesto || ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Motorista</Label>
                <Input 
                  type="text"
                  name="motorista"
                  required
                  value={currentControle?.motorista || ''}
                  onChange={handleInputChange}
                  placeholder="Nome do motorista"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Input 
                  type="text"
                  name="responsavel"
                  required
                  value={currentControle?.responsavel || ''}
                  onChange={handleInputChange}
                  placeholder="Responsável pela carga"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select 
                  name="finalizado"
                  value={currentControle?.finalizado ? 'FINALIZADO' : 'ABERTO'}
                  onChange={(event) => setCurrentControle((atual) => ({ ...atual, finalizado: event.target.value === 'FINALIZADO' }))}
                >
                  <option value="ABERTO">Aberto</option>
                  <option value="FINALIZADO">Finalizado</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adicionar ou remover notas</Label>
            {notasLoading && <p className="text-sm text-textMuted">Carregando notas...</p>}
            {notasErro && <p role="alert" className="text-sm text-rose-600">{notasErro}</p>}
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {opcoesNotas.map((nota) => (
                <label key={nota.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50">
                  <input type="checkbox" checked={notasSelecionadas.includes(nota.id)} disabled={loading || notasLoading || Boolean(notasErro)}
                    onChange={(event) => setNotasSelecionadas((atual) => event.target.checked ? [...atual, nota.id] : atual.filter((id) => id !== nota.id))} />
                  <span className="text-sm">NF: {nota.numeroNota} - {nota.codigo}</span>
                </label>
              ))}
              {!notasLoading && opcoesNotas.length === 0 && <p className="p-3 text-sm text-textMuted">Nenhuma nota disponível.</p>}
            </div>
            <p className="text-sm text-textMuted">{notasSelecionadas.length} nota(s) selecionada(s). Desmarque para remover do controle.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={handleCloseFormModal} type="button">
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              loading={loading}
              disabled={!currentControle?.motorista || !currentControle?.responsavel || notasLoading || Boolean(notasErro)}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toasts */}
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
}

export default function GerenciarControles() {
  return (
    <AdminRoute>
      <GerenciarControlesContent />
    </AdminRoute>
  );
}

(GerenciarControles as any).usesAppLayout = true;
