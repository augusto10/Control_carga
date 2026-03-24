import { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Search, 
  UserPlus, 
  RefreshCw, 
  Edit, 
  Trash2, 
  Truck, 
  Phone, 
  FileText, 
  CreditCard, 
  User,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import InputMask from 'react-input-mask';

interface TransportadoraApi {
  id: string;
  nome: string;
  descricao: string;
}

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnh: string;
  transportadoraId: string;
  transportadora?: TransportadoraApi;
}

export default function MotoristasPage() {
  const { user } = useAuth();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [transportadoras, setTransportadoras] = useState<TransportadoraApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [currentMotorista, setCurrentMotorista] = useState<Motorista | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    cnh: '',
    transportadoraId: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // Confirmação de exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Toast (simples implementation for now, ideally use a context)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [motRes, transRes] = await Promise.all([
        api.get<Motorista[]>('/api/motoristas'),
        api.get<TransportadoraApi[]>('/api/transportadoras')
      ]);
      setMotoristas(motRes.data);
      setTransportadoras(transRes.data);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canDelete = () => {
    return user && ['ADMIN', 'GERENTE'].includes(user.tipo);
  };

  const handleOpenNovo = () => {
    setFormData({
      nome: '',
      telefone: '',
      cpf: '',
      cnh: '',
      transportadoraId: ''
    });
    setIsEditing(false);
    setIsFormModalOpen(true);
  };

  const handleOpenEditar = (motorista: Motorista) => {
    setFormData({
      nome: motorista.nome,
      telefone: motorista.telefone,
      cpf: motorista.cpf,
      cnh: motorista.cnh,
      transportadoraId: motorista.transportadoraId
    });
    setCurrentMotorista(motorista);
    setIsEditing(true);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentMotorista(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (isEditing && currentMotorista) {
        await api.put(`/api/motoristas/${currentMotorista.id}`, formData);
        showToast('Motorista atualizado com sucesso!');
      } else {
        await api.post('/api/motoristas', formData);
        showToast('Motorista criado com sucesso!');
      }
      handleCloseFormModal();
      await carregarDados();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao salvar motorista';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = (motorista: Motorista) => {
    setCurrentMotorista(motorista);
    setIsConfirmModalOpen(true);
  };

  const executeDelete = async () => {
    if (!currentMotorista) return;
    
    try {
      setLoading(true);
      await api.post('/api/motoristas/delete', { id: currentMotorista.id });
      setMotoristas(prev => prev.filter(m => m.id !== currentMotorista.id));
      showToast('Motorista excluído com sucesso!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao excluir motorista';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
      setIsConfirmModalOpen(false);
      setCurrentMotorista(null);
    }
  };

  const filteredMotoristas = motoristas.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cpf.includes(searchTerm) ||
    m.cnh.includes(searchTerm) ||
    (m.transportadora?.descricao || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout
      title="Gerenciar Motoristas"
      subtitle="Cadastre e gerencie os motoristas e suas transportadoras"
    >
      <Head>
        <title>Motoristas | ControlCarga</title>
      </Head>

      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 w-full md:max-w-md">
            <SearchInput 
              placeholder="Buscar por nome, CPF, CNH ou transportadora..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button 
              variant="secondary" 
              iconLeft={<RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />}
              onClick={carregarDados}
              disabled={loading}
              className="flex-1 md:flex-none"
            >
              Atualizar
            </Button>
            <Button 
              variant="primary" 
              iconLeft={<UserPlus className="w-4 h-4" />}
              onClick={handleOpenNovo}
              className="flex-1 md:flex-none"
            >
              <span className="hidden sm:inline">Novo Motorista</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* Tabela de Motoristas */}
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-4 font-semibold text-textMain">Motorista</th>
                  <th className="px-4 py-4 font-semibold text-textMain hidden sm:table-cell">Documentos</th>
                  <th className="px-4 py-4 font-semibold text-textMain hidden md:table-cell">Contato</th>
                  <th className="px-4 py-4 font-semibold text-textMain hidden lg:table-cell">Transportadora</th>
                  <th className="px-4 py-4 font-semibold text-textMain text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && motoristas.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="h-10 bg-slate-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredMotoristas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-textMuted">
                        <User className="w-10 h-10 opacity-20" />
                        <p>Nenhum motorista encontrado.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMotoristas.map((motorista) => (
                    <tr key={motorista.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {motorista.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-textMain truncate">{motorista.nome}</span>
                            <span className="text-xs text-textMuted truncate md:hidden">
                              {motorista.transportadora?.descricao || 'Sem transportadora'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-textMain">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>CPF: {motorista.cpf}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-textMain">
                            <CreditCard className="w-3 h-3 text-slate-400" />
                            <span>CNH: {motorista.cnh}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-textMain">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{motorista.telefone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <Badge variant="neutral" className="flex items-center gap-1.5 w-fit">
                          <Truck className="w-3 h-3" />
                          {motorista.transportadora?.descricao || 'Não vinculada'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleOpenEditar(motorista)}
                            title="Editar Motorista"
                          >
                            <Edit className="w-4 h-4 text-primary" />
                          </Button>
                          {canDelete() && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleConfirmDelete(motorista)}
                              title="Excluir Motorista"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>
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

      {/* Modal de Formulário */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title={isEditing ? 'Editar Motorista' : 'Novo Motorista'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input 
                  type="text"
                  required
                  className="pl-10"
                  placeholder="Nome do motorista"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <InputMask
                  mask="(99) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                >
                  {(inputProps: any) => (
                    <Input 
                      {...inputProps}
                      type="tel"
                      required
                      className="pl-10"
                      placeholder="(00) 00000-0000"
                    />
                  )}
                </InputMask>
              </div>
            </div>

            {/* CPF e CNH */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <InputMask
                    mask="999.999.999-99"
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                  >
                    {(inputProps: any) => (
                      <Input 
                        {...inputProps}
                        type="text"
                        required
                        className="pl-10"
                        placeholder="000.000.000-00"
                      />
                    )}
                  </InputMask>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>CNH</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input 
                    type="text"
                    required
                    className="pl-10"
                    placeholder="Número da CNH"
                    value={formData.cnh}
                    onChange={(e) => setFormData(prev => ({ ...prev, cnh: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Transportadora */}
            <div className="space-y-1.5">
              <Label>Transportadora</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <div className="pl-10">
                  <Select
                    value={formData.transportadoraId}
                    onChange={(e) => setFormData(prev => ({ ...prev, transportadoraId: e.target.value }))}
                    required
                    className="w-full"
                  >
                    <option value="">Selecione uma transportadora...</option>
                    {transportadoras.map(t => (
                      <option key={t.id} value={t.id}>{t.descricao}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={handleCloseFormModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Motorista')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">Esta ação não pode ser desfeita.</p>
          </div>
          <p className="text-slate-600">
            Tem certeza que deseja excluir o motorista <strong>{currentMotorista?.nome}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={executeDelete} disabled={loading}>
              {loading ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast.show && (
        <div className={cn(
          "fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 z-50 flex items-center gap-2",
          toast.type === 'success' ? "bg-emerald-600" : "bg-rose-600"
        )}>
          {toast.type === 'success' ? <RefreshCw className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </AppLayout>
  );
}

(MotoristasPage as any).usesAppLayout = true;
