import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/services/api';
import { 
  User as UserIcon,
  Mail,
  Lock,
  Camera,
  Save,
  X,
  Edit2,
  Trash2,
  Trophy,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import ImageCapture from '@/components/ImageCapture';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface PerfilFormData {
  nome: string;
  email: string;
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

function PerfilUsuarioContent() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  const { user, updateUser } = auth;
  const router = useRouter();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openCamera, setOpenCamera] = useState(false);
  
  const [formData, setFormData] = useState<PerfilFormData>({
    nome: user?.nome || '',
    email: user?.email || '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        nome: user.nome || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    setEditing(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData(prev => ({
      ...prev,
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: ''
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.nome.trim()) {
      setError('O nome é obrigatório');
      return false;
    }

    if (formData.novaSenha || formData.confirmarSenha) {
      if (!formData.senhaAtual) {
        setError('A senha atual é obrigatória para alterar a senha');
        return false;
      }

      if (formData.novaSenha.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres');
        return false;
      }

      if (formData.novaSenha !== formData.confirmarSenha) {
        setError('As senhas não coincidem');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const dataToUpdate: any = {
        nome: formData.nome.trim(),
        email: formData.email.trim()
      };
      
      if (formData.novaSenha) {
        dataToUpdate.senhaAtual = formData.senhaAtual;
        dataToUpdate.novaSenha = formData.novaSenha;
      }
      
      const response = await api.put('/api/auth/perfil', dataToUpdate);
      updateUser(response.data);
      
      setSuccess('Perfil atualizado com sucesso!');
      setEditing(false);
      setFormData(prev => ({ ...prev, senhaAtual: '', novaSenha: '', confirmarSenha: '' }));
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      setError(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const fotoBase64 = e.target?.result as string;
        try {
          const response = await api.post('/api/usuarios/upload-foto-base64', { fotoBase64 });
          updateUser({ ...user, foto: response.data.fotoUrl });
          setSuccess('Foto de perfil atualizada com sucesso!');
          setTimeout(() => setSuccess(null), 5000);
        } catch (error: any) {
          setError(error.response?.data?.message || 'Erro ao fazer upload da foto');
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setError('Erro ao processar a imagem');
      setUploadingPhoto(false);
    }
  };

  const handleCameraImage = async (imageDataUrl: string) => {
    try {
      setUploadingPhoto(true);
      setError(null);
      const response = await api.post('/api/usuarios/upload-foto-base64', { fotoBase64: imageDataUrl });
      updateUser({ ...user, foto: response.data.fotoUrl });
      setSuccess('Foto de perfil atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Erro ao enviar foto da câmera');
    } finally {
      setUploadingPhoto(false);
      setOpenCamera(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title="Meu Perfil" subtitle="Gerencie suas informações pessoais e de acesso">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
        
        {/* Coluna Esquerda: Avatar e Resumo */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="text-center p-8 overflow-visible relative">
              <div className="relative inline-block mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center mx-auto">
                  {user?.foto ? (
                    <img src={user.foto} alt={user.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-primary">
                      {user?.nome?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {editing && (
                  <div className="absolute -bottom-2 -right-2 flex gap-2">
                    <button
                      onClick={() => setOpenCamera(true)}
                      className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-dark transition-all hover:scale-110"
                      title="Tirar foto"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <label className="w-10 h-10 bg-white text-slate-600 border border-slate-200 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-slate-50 transition-all hover:scale-110">
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                      {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </label>
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-1">{user?.nome}</h2>
              <p className="text-slate-500 mb-6 flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>

              <div className="flex justify-center gap-2 mb-8">
                <Badge variant="info" className="px-4 py-1.5 rounded-full flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user?.tipo}
                </Badge>
                <Badge variant="success" className="px-4 py-1.5 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Ativo
                </Badge>
              </div>

              {!editing && (
                <Button 
                  onClick={handleEditClick}
                  className="w-full py-6 text-base font-semibold shadow-lg shadow-primary/20"
                >
                  <Edit2 className="w-5 h-5 mr-2" />
                  Editar Perfil
                </Button>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Conquistas</h3>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Seu progresso e conquistas serão exibidos aqui em breve.
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Coluna Direita: Formulário */}
        <div className="lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-8 h-full">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Informações Pessoais</h3>
                  <p className="text-slate-500">Mantenha seus dados sempre atualizados</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Nome Completo</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        disabled={!editing || loading}
                        className={cn(
                          "w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                          !editing && "opacity-60 cursor-not-allowed bg-slate-100"
                        )}
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">E-mail de Acesso</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!editing || loading}
                        className={cn(
                          "w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                          !editing && "opacity-60 cursor-not-allowed bg-slate-100"
                        )}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {editing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-6 pt-6 border-t border-slate-100"
                    >
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <Lock className="w-5 h-5" />
                        <h4>Segurança e Senha</h4>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Senha Atual</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            name="senhaAtual"
                            type="password"
                            value={formData.senhaAtual}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                        <p className="text-xs text-slate-400">Obrigatório para realizar qualquer alteração</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Nova Senha</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              name="novaSenha"
                              type="password"
                              value={formData.novaSenha}
                              onChange={handleInputChange}
                              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="Nova senha (min. 6 caracteres)"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Confirmar Nova Senha</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              name="confirmarSenha"
                              type="password"
                              value={formData.confirmarSenha}
                              onChange={handleInputChange}
                              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="Repita a nova senha"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {editing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="py-6 px-8"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="py-6 px-12 shadow-lg shadow-primary/20"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                      )}
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                )}
              </form>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Alertas e Toasts */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={cn(
              "fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl z-[100] flex items-center gap-3 w-[calc(100%-2rem)] sm:w-auto min-w-[300px] max-w-[420px] transition-all duration-300",
              error ? "bg-red-600 text-white" : "bg-slate-900 text-white"
            )}
          >
            {error ? (
              <X className="w-5 h-5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="font-medium text-sm sm:text-base flex-1">{error || success}</span>
            <button 
              onClick={() => { setError(null); setSuccess(null); }}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Câmera */}
      <ImageCapture
        open={openCamera}
        onClose={() => setOpenCamera(false)}
        onImageCapture={handleCameraImage}
        maxImages={1}
        currentImages={[]}
      />
    </AppLayout>
  );
}

export default function PerfilUsuario() {
  return (
    <ProtectedRoute>
      <PerfilUsuarioContent />
    </ProtectedRoute>
  );
}

(PerfilUsuario as any).usesAppLayout = true;
