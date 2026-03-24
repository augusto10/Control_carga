import { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Users, 
  UserPlus, 
  Search, 
  RefreshCw, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Clock,
  MoreVertical,
  AlertCircle,
  User,
  ShieldAlert,
  ShieldCheck,
  Package,
  FileCheck,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { TipoUsuario } from '@prisma/client';
import AdminRoute from '@/components/admin/AdminRoute';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  dataCriacao: string;
  ultimoAcesso?: string | null;
  senha?: string;
  confirmarSenha?: string;
  foto?: string | null;
}

export default function GerenciarUsuariosPage() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState<Partial<Usuario> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Confirmação
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    type: 'danger' | 'success';
  }>({
    title: '',
    message: '',
    onConfirm: async () => {},
    type: 'danger'
  });

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

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/usuarios');
      setUsuarios(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      setError('Não foi possível carregar a lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNovoUsuario = () => {
    setCurrentUsuario({
      nome: '',
      email: '',
      tipo: 'USUARIO' as TipoUsuario,
      ativo: true,
      senha: '',
      confirmarSenha: ''
    });
    setIsEditing(false);
    setIsFormModalOpen(true);
  };

  const handleOpenEditarUsuario = (usuario: Usuario) => {
    setCurrentUsuario({
      ...usuario,
      senha: '',
      confirmarSenha: ''
    });
    setIsEditing(true);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentUsuario(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUsuario) return;

    try {
      setLoading(true);
      if (isEditing) {
        await api.post('/api/admin/usuarios/edit', {
          id: currentUsuario.id,
          nome: currentUsuario.nome,
          tipo: currentUsuario.tipo,
          senha: currentUsuario.senha,
          ativo: currentUsuario.ativo
        });
        showToast('Usuário atualizado com sucesso!');
      } else {
        await api.post('/api/admin/usuarios', currentUsuario);
        showToast('Usuário criado com sucesso!');
      }
      handleCloseFormModal();
      await carregarUsuarios();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      showToast(error.response?.data?.message || 'Erro ao salvar usuário', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (usuario: Usuario) => {
    const { id, ativo } = usuario;
    setConfirmConfig({
      title: ativo ? 'Desativar Usuário' : 'Ativar Usuário',
      message: ativo 
        ? `Tem certeza que deseja desativar o usuário ${usuario.nome}? Ele não poderá mais acessar o sistema.`
        : `Deseja ativar o acesso do usuário ${usuario.nome}?`,
      type: ativo ? 'danger' : 'success',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.post('/api/admin/usuarios/toggle-status', { id, ativo: !ativo });
          await carregarUsuarios();
          showToast(`Usuário ${!ativo ? 'ativado' : 'desativado'} com sucesso!`);
        } catch (error: any) {
          showToast('Erro ao atualizar status', 'error');
        } finally {
          setLoading(false);
          setIsConfirmModalOpen(false);
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoInfo = (tipo: TipoUsuario) => {
    switch (tipo) {
      case 'ADMIN': return { label: 'Administrador', variant: 'danger' as const, icon: ShieldAlert };
      case 'GERENTE': return { label: 'Gerente', variant: 'warning' as const, icon: ShieldCheck };
      case 'SEPARADOR': return { label: 'Separador', variant: 'info' as const, icon: Package };
      case 'CONFERENTE': return { label: 'Conferente', variant: 'info' as const, icon: FileCheck };
      case 'AUDITOR': return { label: 'Auditor', variant: 'neutral' as const, icon: Eye };
      default: return { label: 'Usuário', variant: 'neutral' as const, icon: User };
    }
  };

  return (
    <AdminRoute>
      <AppLayout 
        title="Gestão de Usuários" 
        subtitle="Administre as permissões e contas de acesso ao sistema"
      >
      <Head>
        <title>Usuários | ControlCarga</title>
      </Head>

      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 w-full md:max-w-md">
            <SearchInput 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button 
              variant="secondary" 
              iconLeft={<RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />}
              onClick={carregarUsuarios}
              disabled={loading}
              className="flex-1 md:flex-none"
            >
              Atualizar
            </Button>
            <Button 
              variant="primary" 
              iconLeft={<UserPlus className="w-4 h-4" />}
              onClick={handleOpenNovoUsuario}
              className="flex-1 md:flex-none"
            >
              <span className="hidden sm:inline">Novo Usuário</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-4 font-semibold text-textMain">Usuário</th>
                  <th className="px-4 py-4 font-semibold text-textMain hidden sm:table-cell">Perfil</th>
                  <th className="px-4 py-4 font-semibold text-textMain hidden md:table-cell">Status</th>
                  <th className="px-4 py-4 font-semibold text-textMain hidden lg:table-cell">Último Acesso</th>
                  <th className="px-4 py-4 font-semibold text-textMain text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && usuarios.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="h-10 bg-slate-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredUsuarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-textMuted">
                        <Users className="w-10 h-10 opacity-20" />
                        <p>Nenhum usuário encontrado.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsuarios.map((usuario) => {
                    const tipoInfo = getTipoInfo(usuario.tipo);
                    const TipoIcon = tipoInfo.icon;
                    
                    return (
                      <tr key={usuario.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {usuario.foto ? (
                                <img src={usuario.foto} alt={usuario.nome} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                usuario.nome.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-textMain truncate">{usuario.nome}</span>
                              <span className="text-xs text-textMuted truncate">{usuario.email}</span>
                              <div className="sm:hidden mt-1 flex gap-1">
                                <Badge variant={tipoInfo.variant} size="sm" className="px-1.5 py-0">
                                  {tipoInfo.label.split(' ')[0]}
                                </Badge>
                                {usuario.ativo ? (
                                  <Badge variant="success" size="sm" className="px-1.5 py-0">Ativo</Badge>
                                ) : (
                                  <Badge variant="neutral" size="sm" className="px-1.5 py-0">Inativo</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <Badge variant={tipoInfo.variant} className="flex items-center gap-1.5 w-fit whitespace-nowrap">
                            <TipoIcon className="w-3 h-3" />
                            {tipoInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          {usuario.ativo ? (
                            <Badge variant="success" className="gap-1 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="gap-1 whitespace-nowrap">
                              <XCircle className="w-3 h-3" />
                              Inativo
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <div className="flex flex-col text-xs whitespace-nowrap">
                            <span className="text-textMain font-medium">
                              {usuario.ultimoAcesso 
                                ? new Date(usuario.ultimoAcesso).toLocaleDateString('pt-BR') 
                                : 'Nunca acessou'}
                            </span>
                            {usuario.ultimoAcesso && (
                              <span className="text-textMuted flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(usuario.ultimoAcesso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleOpenEditarUsuario(usuario)}
                              disabled={usuario.id === user?.id}
                              title="Editar Usuário"
                            >
                              <Edit className="w-4 h-4 text-primary" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleToggleStatus(usuario)}
                              disabled={usuario.id === user?.id}
                              title={usuario.ativo ? "Desativar" : "Ativar"}
                            >
                              {usuario.ativo ? (
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              )}
                            </Button>
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
        title={isEditing ? 'Editar Usuário' : 'Novo Usuário'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
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
                    placeholder="Nome do usuário"
                    value={currentUsuario?.nome || ''}
                    onChange={(e) => setCurrentUsuario(prev => ({ ...prev!, nome: e.target.value }))}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>E-mail Corporativo</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input 
                    type="email"
                    required
                    disabled={isEditing}
                    className="pl-10"
                    placeholder="email@empresa.com"
                    value={currentUsuario?.email || ''}
                    onChange={(e) => setCurrentUsuario(prev => ({ ...prev!, email: e.target.value }))}
                  />
                </div>
              </div>

              {/* Perfil */}
              <div className="space-y-1.5">
                <Label>Perfil de Acesso</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Select 
                    className="pl-10"
                    value={currentUsuario?.tipo || 'USUARIO'}
                    onChange={(e) => setCurrentUsuario(prev => ({ ...prev!, tipo: e.target.value as TipoUsuario }))}
                  >
                    <option value="ADMIN">Administrador (Acesso Total)</option>
                    <option value="GERENTE">Gerente (Gestão e Relatórios)</option>
                    <option value="USUARIO">Usuário (Operacional Básico)</option>
                    <option value="SEPARADOR">Separador (Área de Separação)</option>
                    <option value="CONFERENTE">Conferente (Área de Conferência)</option>
                    <option value="AUDITOR">Auditor (Área de Auditoria)</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Senhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label>
                  {isEditing ? 'Nova Senha (opcional)' : 'Senha'}
                </Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input 
                    type="password"
                    required={!isEditing}
                    className="pl-10"
                    placeholder="••••••••"
                    value={currentUsuario?.senha || ''}
                    onChange={(e) => setCurrentUsuario(prev => ({ ...prev!, senha: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar Senha</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input 
                    type="password"
                    required={!isEditing}
                    className="pl-10"
                    placeholder="••••••••"
                    value={currentUsuario?.confirmarSenha || ''}
                    onChange={(e) => setCurrentUsuario(prev => ({ ...prev!, confirmarSenha: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {currentUsuario?.senha && currentUsuario?.confirmarSenha && 
             currentUsuario.senha !== currentUsuario.confirmarSenha && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 animate-in fade-in zoom-in-95">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium">As senhas não coincidem</span>
              </div>
            )}

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 transition-all hover:bg-slate-100/50">
              <div className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox"
                  id="user-active"
                  className="sr-only peer"
                  checked={currentUsuario?.ativo || false}
                  onChange={(e) => setCurrentUsuario(prev => ({ ...prev!, ativo: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
              <label htmlFor="user-active" className="flex flex-col cursor-pointer">
                <span className="text-sm font-bold text-slate-700">Usuário Ativo</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Define se o usuário pode acessar o sistema</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button variant="ghost" onClick={handleCloseFormModal} type="button">
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              loading={loading}
              disabled={
                !currentUsuario?.nome || 
                !currentUsuario?.email || 
                (!isEditing && (!currentUsuario?.senha || currentUsuario.senha !== currentUsuario.confirmarSenha))
              }
            >
              {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmConfig.title}
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-sm text-textMuted leading-relaxed">
            {confirmConfig.message}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant={confirmConfig.type === 'danger' ? 'danger' : 'primary'}
              onClick={confirmConfig.onConfirm}
              loading={loading}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast.show && (
        <div className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 w-[calc(100%-2rem)] max-w-[400px] md:w-auto",
          toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
      </AppLayout>
    </AdminRoute>
  );
}

(GerenciarUsuariosPage as any).usesAppLayout = true;
