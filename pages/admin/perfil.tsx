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
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Stack,
  InputAdornment,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Save as SaveIcon, 
  Cancel as CancelIcon, 
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Badge as BadgeIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { AuthContext } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminRoute from '../../components/admin/AdminRoute';
import RankingComponent from '../../components/RankingComponent';
import { obterMinhaPontuacao, PontuacaoResponse } from '../../services/gamificacaoService';
import ImageCapture from '../../components/ImageCapture';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
      <AnimatePresence>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          sx={{ py: { xs: 2, md: 4 } }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              {/* Coluna da Esquerda: Perfil e Resumo */}
              <Grid item xs={12} md={4}>
                <Stack spacing={3}>
                  <MotionCard
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                      overflow: 'visible'
                    }}
                  >
                    <CardContent sx={{ pt: 6, pb: 4, px: 3, textAlign: 'center' }}>
                      <Box position="relative" display="inline-block" sx={{ mb: 3 }}>
                        <Avatar 
                          src={user?.foto || undefined} 
                          sx={{ 
                            width: 140, 
                            height: 140, 
                            fontSize: '3rem',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            border: '4px solid white'
                          }}
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
                          <Tooltip title="Alterar foto">
                            <label htmlFor="photo-upload">
                              <IconButton
                                component="span"
                                sx={{
                                  position: 'absolute',
                                  bottom: 5,
                                  right: 5,
                                  backgroundColor: 'primary.main',
                                  color: 'white',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                  '&:hover': {
                                    backgroundColor: 'primary.dark',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s',
                                  width: 42,
                                  height: 42,
                                }}
                                disabled={uploadingPhoto}
                              >
                                {uploadingPhoto ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraIcon />}
                              </IconButton>
                            </label>
                          </Tooltip>
                        )}
                      </Box>

                      <Typography variant="h5" fontWeight={700} gutterBottom>
                        {user?.nome}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        {user?.email}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }}>
                        <Chip 
                          label={user?.tipo} 
                          color="primary" 
                          size="small" 
                          variant="soft"
                          sx={{ fontWeight: 600, borderRadius: 1.5 }} 
                        />
                        <Chip 
                          label="Ativo" 
                          color="success" 
                          size="small" 
                          variant="soft"
                          sx={{ fontWeight: 600, borderRadius: 1.5 }} 
                        />
                      </Stack>

                      {editing && (
                        <MotionBox
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 1.5,
                            mt: 2,
                            p: 2,
                            bgcolor: 'rgba(0,0,0,0.02)',
                            borderRadius: 3
                          }}
                        >
                          <Typography variant="caption" fontWeight={600} color="text.secondary" uppercase>
                            Opções de Foto
                          </Typography>
                          <Button 
                            fullWidth
                            size="small" 
                            variant="outlined" 
                            onClick={openFilePicker} 
                            disabled={uploadingPhoto}
                            startIcon={<PhotoCameraIcon />}
                            sx={{ borderRadius: 2 }}
                          >
                            Galeria
                          </Button>
                          <Button 
                            fullWidth
                            size="small" 
                            variant="contained" 
                            onClick={() => setOpenCamera(true)} 
                            disabled={uploadingPhoto}
                            startIcon={<PhotoCameraIcon />}
                            sx={{ borderRadius: 2 }}
                          >
                            Câmera
                          </Button>
                        </MotionBox>
                      )}
                    </CardContent>
                  </MotionCard>

                  {/* Componente de Ranking ou Estatísticas Rápidas */}
                  {!editing && (
                    <MotionCard
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      sx={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 4,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          🏆 Conquistas
                        </Typography>
                        <Divider sx={{ my: 2, opacity: 0.5 }} />
                        {/* Se houver componente de ranking específico, pode ser inserido aqui */}
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                          Seu progresso e conquistas serão exibidos aqui.
                        </Typography>
                      </CardContent>
                    </MotionCard>
                  )}
                </Stack>
              </Grid>

              {/* Coluna da Direita: Formulário de Edição */}
              <Grid item xs={12} md={8}>
                <MotionCard
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  sx={{
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                      <Box>
                        <Typography variant="h5" fontWeight={700} color="primary.main">
                          Informações do Perfil
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Gerencie suas informações pessoais e de acesso
                        </Typography>
                      </Box>
                      {!editing && (
                        <Button 
                          variant="contained" 
                          color="primary" 
                          startIcon={<EditIcon />}
                          onClick={handleEditClick}
                          sx={{ 
                            borderRadius: 2,
                            px: 3,
                            boxShadow: '0 4px 12px rgba(0, 118, 255, 0.3)',
                            '&:hover': {
                              boxShadow: '0 6px 16px rgba(0, 118, 255, 0.4)',
                            }
                          }}
                        >
                          Editar
                        </Button>
                      )}
                    </Box>

                    <form onSubmit={handleSubmit}>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            label="Nome Completo"
                            name="nome"
                            value={formData.nome}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            disabled={!editing || loading}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonIcon color="action" />
                                </InputAdornment>
                              ),
                              sx: { borderRadius: 3 }
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            label="E-mail"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            disabled={!editing || loading}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <EmailIcon color="action" />
                                </InputAdornment>
                              ),
                              sx: { borderRadius: 3 }
                            }}
                          />
                        </Grid>

                        {editing && (
                          <Grid item xs={12}>
                            <MotionBox
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <Divider sx={{ my: 4 }}>
                                <Chip 
                                  label="Alterar Senha" 
                                  size="small" 
                                  icon={<LockIcon />} 
                                  sx={{ fontWeight: 600 }}
                                />
                              </Divider>

                              <Stack spacing={3}>
                                <TextField
                                  label="Senha Atual"
                                  name="senhaAtual"
                                  type="password"
                                  value={formData.senhaAtual}
                                  onChange={handleInputChange}
                                  fullWidth
                                  disabled={loading}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <LockIcon color="action" />
                                      </InputAdornment>
                                    ),
                                    sx: { borderRadius: 3 }
                                  }}
                                  helperText="Necessário apenas se desejar alterar sua senha"
                                />
                                
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6}>
                                    <TextField
                                      label="Nova Senha"
                                      name="novaSenha"
                                      type="password"
                                      value={formData.novaSenha}
                                      onChange={handleInputChange}
                                      fullWidth
                                      disabled={loading}
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <LockIcon color="action" />
                                          </InputAdornment>
                                        ),
                                        sx: { borderRadius: 3 }
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={6}>
                                    <TextField
                                      label="Confirmar Nova Senha"
                                      name="confirmarSenha"
                                      type="password"
                                      value={formData.confirmarSenha}
                                      onChange={handleInputChange}
                                      fullWidth
                                      disabled={loading}
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <LockIcon color="action" />
                                          </InputAdornment>
                                        ),
                                        sx: { borderRadius: 3 }
                                      }}
                                    />
                                  </Grid>
                                </Grid>
                              </Stack>
                            </MotionBox>
                          </Grid>
                        )}

                        {editing && (
                          <Grid item xs={12}>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                              <Button
                                variant="outlined"
                                color="inherit"
                                onClick={handleCancelEdit}
                                disabled={loading}
                                startIcon={<CloseIcon />}
                                sx={{ borderRadius: 2, px: 3 }}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                sx={{ 
                                  borderRadius: 2, 
                                  px: 4,
                                  boxShadow: '0 4px 12px rgba(0, 118, 255, 0.3)'
                                }}
                              >
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                              </Button>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </form>
                  </CardContent>
                </MotionCard>
              </Grid>
            </Grid>
          </Container>
        </MotionBox>
      </AnimatePresence>

      {/* Snackbar para mensagens de erro */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error" 
          variant="standard"
          sx={{ 
            width: '100%', 
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            backgroundColor: alpha(theme.palette.error.main, 0.15),
            color: theme.palette.error.dark,
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            '& .MuiAlert-icon': {
              color: theme.palette.error.main,
            },
            boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
            fontWeight: 600,
          }}
        >
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
        <Alert 
          onClose={() => setSuccessMessage(null)} 
          severity="success" 
          variant="standard"
          sx={{ 
            width: '100%', 
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            backgroundColor: alpha(theme.palette.success.main, 0.15),
            color: theme.palette.success.dark,
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
            '& .MuiAlert-icon': {
              color: theme.palette.success.main,
            },
            boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
            fontWeight: 600,
          }}
        >
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
