import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../services/api';
import { 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Box, 
  Avatar, 
  IconButton, 
  Divider, 
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';
import { AuthContext } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminRoute from '../../components/admin/AdminRoute';
import RankingComponent from '../../components/RankingComponent';
import { obterMinhaPontuacao, PontuacaoResponse } from '../../services/gamificacaoService';
import ImageCapture from '../../components/ImageCapture';

interface PerfilFormData {
  nome: string;
  email: string;
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

interface PerfilFormErrors {
  nome?: string;
  email?: string;
  senhaAtual?: string;
  novaSenha?: string;
  confirmarSenha?: string;
}

function PerfilUsuarioContent() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  const { user, updateUser } = auth;
  // router mantido para uso futuro
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pontuacao, setPontuacao] = useState<PontuacaoResponse | null>(null);
  const [carregandoPontuacao, setCarregandoPontuacao] = useState(true);
  const [openCamera, setOpenCamera] = useState(false);
  const openFilePicker = () => {
    const input = document.getElementById('photo-upload') as HTMLInputElement | null;
    input?.click();
  };

  interface UsuarioResponse {
    id: string;
    nome: string;
    email: string;
  }
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<PerfilFormData>({
    nome: user?.nome || '',
    email: user?.email || '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  // Interface para o tipo de erro da API
  interface ApiErrorResponse {
    response?: {
      data?: {
        message?: string;
      };
    };
    message?: string;
  }
  
  // Garantir que setSuccess está definido
  const setSuccessMessage = (message: string | null) => {
    setSuccess(message);
  };

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  useEffect(() => {
    const carregarPontuacao = async () => {
      try {
        const dadosPontuacao = await obterMinhaPontuacao();
        setPontuacao(dadosPontuacao);
      } catch (err) {
        console.error('Erro ao carregar pontuação:', err);
      } finally {
        setCarregandoPontuacao(false);
      }
    };

    if (user?.id) {
      carregarPontuacao();
    }
  }, [user?.id]);

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
      
      setSuccessMessage('Perfil atualizado com sucesso!');
      setEditing(false);
      
      setFormData(prev => ({
        ...prev,
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      }));
      
      setTimeout(() => setSuccessMessage(null), 5000);
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

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);

      // Converter arquivo para base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fotoBase64 = e.target?.result as string;
        
        try {
          const response = await api.post('/api/usuarios/upload-foto-base64', {
            fotoBase64
          });
          updateUser({ ...user, foto: response.data.fotoUrl });
          setSuccessMessage('Foto de perfil atualizada com sucesso!');
        } catch (error: any) {
          console.error('Erro ao fazer upload da foto:', error);
          setError(error.response?.data?.message || 'Erro ao fazer upload da foto');
        } finally {
          setUploadingPhoto(false);
        }
      };
      
      reader.onerror = () => {
        setError('Erro ao ler o arquivo');
        setUploadingPhoto(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      setError('Erro ao processar a imagem');
      setUploadingPhoto(false);
    }
  };

  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const type = blob.type || 'image/jpeg';
    return new File([blob], filename, { type });
  };

  const handleCameraImage = async (imageDataUrl: string) => {
    try {
      setUploadingPhoto(true);
      setError(null);
      
      // Enviar base64 diretamente
      const response = await api.post('/api/usuarios/upload-foto-base64', {
        fotoBase64: imageDataUrl
      });
      
      updateUser({ ...user, foto: response.data.fotoUrl });
      setSuccessMessage('Foto de perfil atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar foto da câmera:', error);
      setError(error?.response?.data?.message || 'Erro ao enviar foto da câmera');
    } finally {
      setUploadingPhoto(false);
      setOpenCamera(false);
    }
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AdminLayout title="Meu Perfil">
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h1">
              Meu Perfil
            </Typography>
            {!editing && (
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<EditIcon />}
                onClick={handleEditClick}
              >
                Editar Perfil
              </Button>
            )}
          </Box>

          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              mb={{ xs: 3, md: 0 }}
              minWidth={200}
            >
              <Box position="relative" display="inline-block">
                <Avatar 
                  src={user?.foto || undefined} 
                  sx={{ width: 100, height: 100, mr: 3 }}
                >
                  {!user?.foto && user?.nome?.charAt(0).toUpperCase()}
                </Avatar>
                <input
                  accept="image/*"
                  type="file"
                  id="photo-upload"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={uploadingPhoto}
                />
                {editing && (
                  <label htmlFor="photo-upload">
                    <IconButton
                      color="primary"
                      component="span"
                      sx={{
                        position: 'absolute',
                        bottom: -5,
                        right: 15,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                        width: 36,
                        height: 36,
                      }}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraIcon />}
                    </IconButton>
                  </label>
                )}
              </Box>
              {editing && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={openFilePicker} disabled={uploadingPhoto}>
                    Anexar do dispositivo
                  </Button>
                  <Button size="small" variant="contained" onClick={() => setOpenCamera(true)} disabled={uploadingPhoto}>
                    Tirar foto agora
                  </Button>
                </Box>
              )}
              <Box>
                <Typography variant="h5" gutterBottom>
                  {user?.nome}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {user?.email}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Tipo: {user?.tipo}
                </Typography>
              </Box>
            </Box>

            <Box flex={1}>
              <form onSubmit={handleSubmit}>
                <TextField
                  label="Nome Completo"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  required
                  disabled={!editing || loading}
                />
                
                <TextField
                  label="E-mail"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  required
                  disabled={!editing || loading}
                />

                {editing && (
                  <>
                    <Divider sx={{ my: 3 }}>
                      <Typography variant="body2" color="textSecondary">
                        Alterar Senha (opcional)
                      </Typography>
                    </Divider>

                    <TextField
                      label="Senha Atual"
                      name="senhaAtual"
                      type="password"
                      value={formData.senhaAtual}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={loading}
                    />
                    
                    <TextField
                      label="Nova Senha"
                      name="novaSenha"
                      type="password"
                      value={formData.novaSenha}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={loading}
                      helperText="Deixe em branco para manter a senha atual"
                    />
                    
                    <TextField
                      label="Confirmar Nova Senha"
                      name="confirmarSenha"
                      type="password"
                      value={formData.confirmarSenha}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      disabled={loading}
                    />
                  </>
                )}

                {editing && (
                  <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleCancelEdit}
                      disabled={loading}
                      startIcon={<CancelIcon />}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                    >
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </Box>
                )}
              </form>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Snackbar para mensagens de erro */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Snackbar para mensagens de sucesso */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>

      {/* Modal de câmera */}
      <ImageCapture
        open={openCamera}
        onClose={() => setOpenCamera(false)}
        onImageCapture={handleCameraImage}
        maxImages={1}
        currentImages={[]}
      />
    </AdminLayout>
  );
}

export default function PerfilUsuario() {
  return (
    <AdminRoute>
      <PerfilUsuarioContent />
    </AdminRoute>
  );
}
