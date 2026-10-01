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

interface Controle {
  id: string;
  numero: string;
  motorista: string;
  responsavel: string;
  status: 'ABERTO' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  dataCriacao: string;
  dataFinalizacao?: string | null;
  notasFiscais: Array<{
    id: string;
    numero: string;
    valor: number;
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
    (c.numero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    if (!currentControle) return;

    try {
      setLoading(true);
      if (isEditing && currentControle.id) {
        await api.put(`/api/controles/${currentControle.id}`, currentControle);
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
    if (!window.confirm('Tem certeza que deseja excluir este controle? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/controles/delete', { id });
      await carregarControles();
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
      await api.patch(`/api/controles/${id}/finalizar`);
      await carregarControles();
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
        return { label: 'Aberto', variant: 'primary' as const, icon: Clock };
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
            <table className="w-full text-sm text-left">
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
                    const statusInfo = getStatusInfo(controle.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr key={controle.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-textMain">
                            {controle.numero || '-'}
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
                          {controle.notasFiscais && controle.notasFiscais.length > 0 ? (
                            <Badge variant="info" className="gap-1">
                              <FileText className="w-3 h-3" />
                              {controle.notasFiscais.length} nota(s)
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
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleOpenEditarControle(controle)}
                              title="Editar Controle"
                            >
                              <Edit className="w-4 h-4 text-primary" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleExcluirControle(controle.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>
                            {controle.status !== 'FINALIZADO' && controle.status !== 'CANCELADO' && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleFinalizarControle(controle.id)}
                                title="Finalizar"
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
                  value={currentControle?.numero || ''}
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
                  name="status"
                  value={currentControle?.status || 'ABERTO'}
                  onChange={handleInputChange}
                >
                  <option value="ABERTO">Aberto</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="FINALIZADO">Finalizado</option>
                  <option value="CANCELADO">Cancelado</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={handleCloseFormModal} type="button">
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              loading={loading}
              disabled={!currentControle?.motorista || !currentControle?.responsavel}
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
