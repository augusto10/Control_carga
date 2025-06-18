import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { ApiError, ApiResponse } from '../../types/api';
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
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { AuthContext } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';

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

export default function PerfilUsuario() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  const { user, updateUser } = auth;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  interface UsuarioResponse {
    id: string;
    nome: string;
    email: string;
    tipo: string;
    dataCriacao: string;
    dataAtualizacao: string;
  }
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<PerfilFormData>({
    nome: '',
    email: '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  // Carregar dados do usuário
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

    // Se estiver alterando a senha, validar os campos de senha
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
      
      // Se houver nova senha, adicionar ao objeto de atualização
      if (formData.novaSenha) {
        dataToUpdate.senhaAtual = formData.senhaAtual;
        dataToUpdate.novaSenha = formData.novaSenha;
      }
      
      // Chamar a API para atualizar o perfil
      const response = await api.put('/api/auth/perfil', dataToUpdate);
      
      // Atualizar o usuário no contexto de autenticação
      updateUser(response.data);
      
      // Mostrar mensagem de sucesso
      setSuccess('Perfil atualizado com sucesso!');
      setEditing(false);
      
      // Limpar os campos de senha
      setFormData(prev => ({
        ...prev,
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      }));
      
      // Fechar a mensagem de sucesso após 5 segundos
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err.message || 'Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setLoading(false);
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
              <Avatar 
                sx={{ 
                  width: 120, 
                  height: 120, 
                  fontSize: 48,
                  mb: 2
                }}
              >
                {user.nome?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h6">{user.nome}</Typography>
              <Typography variant="body2" color="textSecondary">
                {user.tipo === 'ADMIN' ? 'Administrador' : 
                 user.tipo === 'GERENTE' ? 'Gerente' : 'Usuário'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {user.email}
              </Typography>
              
              {user.ultimoAcesso && (
                <Typography variant="caption" color="textSecondary" mt={1}>
                  Último acesso: {new Date(user.ultimoAcesso).toLocaleString()}
                </Typography>
              )}
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
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
}
