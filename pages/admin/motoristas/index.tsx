import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Truck, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Phone, 
  CreditCard, 
  User as UserIcon,
  X
} from 'lucide-react';
import { api } from '@/services/api';
import AdminRoute from '@/components/admin/AdminRoute';
import InputMask from '@/components/InputMask';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/utils/cn';

// Mapeamento para exibir nomes amigáveis das transportadoras
const transportadoraNomes: Record<string, string> = {
  'ACERT': 'ACERT Transportes',
  'ACCERT': 'ACCERT Transportes', 
  'EXPRESSO_GOIAS': 'Expresso Goiás',
  'TERCEIRIZADA': 'Terceirizada',
  'DETAFRA_TRANSPORTES': 'Detafra Transportes',
  'RETIRA_VENDEDOR': 'Retira Vendedor',
  'RETIRA_CLIENTE': 'Retira Cliente',
  'VLOG': 'VLOG Transportes'
};

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnh: string;
  transportadoraId: string;
}

export default function MotoristasPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; motorista: Motorista | null }>({ open: false, motorista: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<Motorista> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const filteredMotoristas = motoristas.filter(m => 
    (m.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.cpf || '').includes(searchTerm) ||
    (m.cnh && m.cnh.includes(searchTerm)) ||
    (transportadoraNomes[m.transportadoraId] || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const motRes = await api.get<Motorista[]>('/api/motoristas');
      setMotoristas(motRes.data);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleOpenNovo = () => {
    setCurrent({ nome: '', telefone: '', cpf: '', cnh: '', transportadoraId: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Motorista) => {
    // Ao editar, removemos a formatação de CPF e Telefone para que a validação de comprimento funcione
    setCurrent({
      ...m,
      cpf: m.cpf?.replace(/\D/g, '') || '',
      telefone: m.telefone?.replace(/\D/g, '') || ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrent(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrent(prev => ({ ...prev!, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;

    if (!current.nome?.trim()) {
      showToast('Nome é obrigatório', 'error');
      return;
    }

    if (!current.cpf || current.cpf.length !== 11) {
      showToast('CPF deve ter 11 dígitos', 'error');
      return;
    }

    if (!current.telefone || (current.telefone.length !== 10 && current.telefone.length !== 11)) {
      showToast('Telefone deve ter 10 ou 11 dígitos', 'error');
      return;
    }

    if (!current.transportadoraId) {
      showToast('Transportadora é obrigatória', 'error');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/api/motoristas/${current.id}`, current);
        showToast('Motorista atualizado com sucesso!');
      } else {
        await api.post('/api/motoristas', current);
        showToast('Motorista criado com sucesso!');
      }
      handleCloseModal();
      await carregar();
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Erro ao salvar motorista';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!deleteModal.motorista) return;
    const id = deleteModal.motorista.id;
    
    try {
      setLoading(true);
      await api.post('/api/motoristas/delete', { id });
      setMotoristas(prev => prev.filter(m => m.id !== id));
      showToast('Motorista excluído com sucesso');
      setDeleteModal({ open: false, motorista: null });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao excluir motorista';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminRoute>
      <AppLayout title="Gestão de Motoristas" subtitle="Cadastre e gerencie os motoristas autorizados para transporte de carga">
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="w-full md:w-96">
              <SearchInput 
                placeholder="Buscar por nome, CPF ou transportadora..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={carregar} disabled={loading} className="flex-1 md:flex-none">
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                Atualizar
              </Button>
              <Button onClick={handleOpenNovo} className="flex-1 md:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Novo Motorista</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Motorista</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Contato</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Documentação</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Transportadora</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && motoristas.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Carregando...</td>
                      </tr>
                    ))
                  ) : filteredMotoristas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <UserIcon className="w-12 h-12 mb-3 opacity-20" />
                          <p className="text-lg font-medium text-slate-500">Nenhum motorista encontrado</p>
                          <p className="text-sm">Tente ajustar os filtros ou adicione um novo motorista</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMotoristas.map((motorista) => (
                      <tr key={motorista.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                              {motorista.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">{motorista.nome}</div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">ID: {motorista.id.slice(0, 8)}</div>
                              <div className="sm:hidden mt-1 flex flex-wrap gap-1">
                                <Badge variant="info" size="sm" className="px-1.5 py-0">
                                  {transportadoraNomes[motorista.transportadoraId]?.split(' ')[0] || motorista.transportadoraId.slice(0, 8)}
                                </Badge>
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0 rounded flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />
                                  {motorista.telefone}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{motorista.telefone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-600">
                              <CreditCard className="w-4 h-4 text-slate-400" />
                              <span className="text-sm font-mono">CPF: {motorista.cpf}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 pl-6">
                              <span className="text-xs font-mono text-slate-400">CNH: {motorista.cnh}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          <Badge variant="info">
                            {transportadoraNomes[motorista.transportadoraId] || motorista.transportadoraId}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenEdit(motorista)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeleteModal({ open: true, motorista })}
                              className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

        {/* Modal Cadastro/Edição */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={isEditing ? 'Editar Motorista' : 'Novo Motorista'}
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Cadastrar')}
              </Button>
            </div>
          }
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nome Completo</label>
              <input 
                name="nome"
                value={current?.nome || ''}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Telefone</label>
                <InputMask
                  mask="telefone"
                  value={current?.telefone || ''}
                  onChange={(val) => setCurrent(prev => ({ ...prev!, telefone: val }))}
                  required
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">CPF</label>
                <InputMask
                  mask="cpf"
                  value={current?.cpf || ''}
                  onChange={(val) => setCurrent(prev => ({ ...prev!, cpf: val }))}
                  required
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">CNH</label>
                <input 
                  name="cnh"
                  value={current?.cnh || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  placeholder="Número da CNH"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Transportadora</label>
                <select 
                  name="transportadoraId"
                  value={current?.transportadoraId || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(transportadoraNomes).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </Modal>

        {/* Modal de Exclusão */}
        <Modal
          isOpen={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, motorista: null })}
          title="Excluir Motorista"
          size="sm"
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteModal({ open: false, motorista: null })} disabled={loading}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmarExclusao} disabled={loading}>
                {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <p className="text-slate-600">
              Tem certeza que deseja excluir o motorista <strong>{deleteModal.motorista?.nome}</strong>?
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>
        </Modal>

        {/* Toast Simples */}
        {toast.show && (
          <div className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-8 md:bottom-8 px-6 py-3 rounded-xl shadow-2xl z-[200] flex items-center gap-3 animate-in slide-in-from-bottom-10 md:slide-in-from-right-full duration-300 w-[calc(100%-2rem)] max-w-[400px] md:w-auto",
            toast.type === 'success' ? "bg-slate-900 text-white" : "bg-danger text-white"
          )}>
            {toast.type === 'success' ? (
              <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center text-[10px]">✓</div>
            ) : (
              <X className="w-5 h-5 text-white" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        )}
      </AppLayout>
    </AdminRoute>
  );
}

(MotoristasPage as any).usesAppLayout = true;
