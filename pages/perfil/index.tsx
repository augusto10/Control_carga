import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Avatar,
  Divider,
  Alert,
  AlertTitle,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  InputAdornment,
  useTheme,
  alpha
} from '@mui/material';
import { Save, Edit, Visibility, VisibilityOff, PhotoCamera } from '@mui/icons-material';
import { api } from '../../services/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import ImageCapture from '../../components/ImageCapture';

type UserData = {
  id: string;
  nome: string;
  email: string;
  tipo: 'ADMIN' | 'USUARIO';
  ativo: boolean;
};

type FormData = {
  nome: string;
  email: string;
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
};

function PerfilContent() {
  const theme = useTheme();
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [openCamera, setOpenCamera] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });

  useEffect(() => {
    if (user) {
      setUserData({
        id: user.id,
        nome: user.nome || '',
        email: user.email || '',
        tipo: user.tipo as 'ADMIN' | 'USUARIO',
        ativo: user.ativo !== false,
      });
      
      setFormData(prev => ({
        ...prev,
        nome: user.nome || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validar senhas se estiver alterando a senha
      if (formData.novaSenha || formData.confirmarSenha) {
        if (formData.novaSenha !== formData.confirmarSenha) {
          throw new Error('As senhas não conferem');
        }
        if (formData.novaSenha.length < 6) {
          throw new Error('A nova senha deve ter no mínimo 6 caracteres');
        }
      }

      const response = await api.put('/api/auth/perfil', {
        nome: formData.nome,
        email: formData.email,
        senhaAtual: formData.senhaAtual || undefined,
        novaSenha: formData.novaSenha || undefined,
      });

      updateUser(response.data.user);
      setSuccess('Perfil atualizado com sucesso!');
      setEditing(false);
      
      // Limpar campos de senha
      setFormData(prev => ({
        ...prev,
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: '',
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const openFilePicker = () => {
    const input = document.getElementById('photo-upload') as HTMLInputElement | null;
    input?.click();
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
      setError('');
      
      // Converter arquivo para base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fotoBase64 = e.target?.result as string;
        
        try {
          const response = await api.post('/api/usuarios/upload-foto-base64', {
            fotoBase64
          });
          updateUser({ ...user, foto: response.data.fotoUrl });
          setSuccess('Foto de perfil atualizada com sucesso!');
        } catch (err: any) {
          setError(err?.response?.data?.message || 'Erro ao fazer upload da foto');
        } finally {
          setUploadingPhoto(false);
        }
      };
      
      reader.onerror = () => {
        setError('Erro ao ler o arquivo');
        setUploadingPhoto(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
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
      setError('');
      
      // Enviar base64 diretamente
      const response = await api.post('/api/usuarios/upload-foto-base64', {
        fotoBase64: imageDataUrl
      });
      
      updateUser({ ...user, foto: response.data.fotoUrl });
      setSuccess('Foto de perfil atualizada com sucesso!');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao enviar foto da câmera');
    } finally {
      setUploadingPhoto(false);
      setOpenCamera(false);
    }
  };

  if (!userData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6" align="center">Carregando...</Typography>
      </Container>
    );
  }

  return (
    <>
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Meu Perfil
        </Typography>
        <Button
          variant={editing ? 'outlined' : 'contained'}
          color="primary"
          startIcon={<Edit />}
          onClick={() => setEditing(!editing)}
        >
          {editing ? 'Cancelar' : 'Editar Perfil'}
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 120,
              height: 120,
              fontSize: 48,
              mb: 2,
              bgcolor: 'primary.main',
            }}
            src={user?.foto || undefined}
          >
            {!user?.foto && (userData.nome?.charAt(0).toUpperCase() || 'U')}
          </Avatar>
          {editing && (
            <>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
                disabled={uploadingPhoto}
              />
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button size="small" variant="outlined" onClick={openFilePicker} disabled={uploadingPhoto}>
                  Anexar do dispositivo
                </Button>
                <Button size="small" variant="contained" onClick={() => setOpenCamera(true)} disabled={uploadingPhoto}>
                  Tirar foto agora
                </Button>
              </Box>
            </>
          )}
          
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" component="div" fontWeight="bold">
              {userData.nome}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userData.email}
            </Typography>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                bgcolor: userData.tipo === 'ADMIN' ? 'secondary.main' : 'primary.main',
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                mt: 1,
              }}
            >
              {userData.tipo === 'ADMIN' ? 'Administrador' : 'Usuário'}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {error && (
          <Alert 
            severity="error"
            variant="standard"
            sx={{ 
              mb: 3,
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
        )}

        {success && (
          <Alert 
            severity="success"
            variant="standard"
            sx={{ 
              mb: 3,
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
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome Completo"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                disabled={!editing || loading}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-mail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!editing || loading}
                margin="normal"
                required
              />
            </Grid>

            {editing && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Alterar Senha
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Deixe em branco se não quiser alterar a senha.
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Senha Atual"
                    name="senhaAtual"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senhaAtual}
                    onChange={handleChange}
                    disabled={loading}
                    margin="normal"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nova Senha"
                    name="novaSenha"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.novaSenha}
                    onChange={handleChange}
                    disabled={loading}
                    margin="normal"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Confirmar Nova Senha"
                    name="confirmarSenha"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmarSenha}
                    onChange={handleChange}
                    disabled={loading}
                    margin="normal"
                  />
                </Grid>
              </>
            )}

            {editing && (
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading}
                  startIcon={<Save />}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </Paper>
    </Container>
    <ImageCapture
      open={openCamera}
      onClose={() => setOpenCamera(false)}
      onImageCapture={handleCameraImage}
      maxImages={1}
      currentImages={[]}
    />
    </>
  );
}

export default function Perfil() {
  return (
    <ProtectedRoute>
      <PerfilContent />
    </ProtectedRoute>
  );
}
