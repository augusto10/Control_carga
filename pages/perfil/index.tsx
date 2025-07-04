import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
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
} from '@mui/material';
import { Save, Edit, Visibility, VisibilityOff } from '@mui/icons-material';
import { api } from '../../services/api';
import ProtectedRoute from '../../components/ProtectedRoute';

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });

  useEffect(() => {
    if (session?.user) {
      setUserData(session.user);
      setFormData({
        nome: session.user.name || '',
        email: session.user.email || '',
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: '',
      });
    }
  }, [session]);

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

      setUserData(response.data.user);
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

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!session?.user) {
    return null;
  }

  return (
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
          >
            {userData?.nome?.charAt(0).toUpperCase() || session?.user?.nome?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" component="div" fontWeight="bold">
              {userData?.nome || session?.user?.nome || ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userData?.email || session?.user?.email || ''}
            </Typography>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                bgcolor: (userData?.tipo || session?.user?.tipo) === 'ADMIN' ? 'secondary.main' : 'primary.main',
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                mt: 1,
              }}
            >
              {(userData?.tipo || session?.user?.tipo) === 'ADMIN' ? 'Administrador' : 'Usuário'}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Erro</AlertTitle>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Sucesso</AlertTitle>
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
  );
}

export default function Perfil() {
  return (
    <ProtectedRoute>
      <PerfilContent />
    </ProtectedRoute>
  );
}
