import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { USER_TYPES } from '../types/auth-types';
import { 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Box, 
  Avatar,
  Divider,
  Grid,
  IconButton,
  InputAdornment
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { Person as PersonIcon, Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';

const PerfilContent = () => {
  const { user, isLoading } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    dataCadastro: '',
    avatarUrl: ''
  });

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Carrega dados do usuário quando disponíveis
  useEffect(() => {
    if (user) {
      setUserData({
        nome: user.nome || '',
        email: user.email || '',
        telefone: '', // Ajustar quando houver campo telefone no backend
        cargo: user.tipo,
        dataCadastro: new Date(user.dataCriacao).toLocaleDateString('pt-BR'),
        avatarUrl: (user as any).avatarUrl || ''
      });
      // Se existe foto no usuário, define preview
      if ((user as any).avatarUrl) {
        setPreviewUrl((user as any).avatarUrl);
      }
    }
  }, [user]);

  const handleEdit = () => {
    if (user?.tipo === USER_TYPES.ADMIN) {
      setEditMode(true);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      setUserData(prev => ({
        ...prev,
        avatarUrl: previewUrl
      }));
    }
    setEditMode(false);
    // TODO: Enviar as alterações (incluindo foto) para o backend
  };

  const handleCancel = () => {
    setSelectedPhoto(null);
    setPreviewUrl(null);
    setEditMode(false);
    // Aqui você pode reverter as alterações não salvas se necessário
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Se ainda carregando usuário, mostra loader simples
  if (isLoading || !user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h6">Carregando...</Typography>
      </Box>
    );
  }

  const isAdmin = user.tipo === USER_TYPES.ADMIN;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h1">
              Meu Perfil
            </Typography>
            {isAdmin && !editMode ? (
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={handleEdit}
              >
                Editar Perfil
              </Button>
            ) : (
              <Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<CheckIcon />}
                  onClick={handleSave}
                  sx={{ mr: 1 }}
                >
                  Salvar
                </Button>
                <Button 
                  variant="outlined" 
                  color="error"
                  startIcon={<CloseIcon />}
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
              </Box>
            )}
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                    type="file"
                    accept="image/*"
                    id="avatar-upload-input"
                    hidden
                    onChange={handlePhotoChange}
                  />
                  <Avatar 
                src={previewUrl || userData.avatarUrl || undefined}
                sx={{ 
                  width: 150, 
                  height: 150, 
                  mb: 2,
                  fontSize: '3rem',
                  bgcolor: 'primary.main'
                }}
              >
                {userData.nome.charAt(0).toUpperCase()}
              </Avatar>
              {isAdmin && editMode && (
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<PhotoCamera />}
                  sx={{ mt: 1 }}
                  component="label"
                  htmlFor="avatar-upload-input"
                >
                  Alterar Foto
                </Button>
              )}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="h6">{userData.nome}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {userData.cargo}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Membro desde {userData.dataCadastro}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Informações Pessoais
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nome Completo"
                    name="nome"
                    value={userData.nome}
                    onChange={handleChange}
                    disabled={!editMode}
                    variant={editMode ? "outlined" : "filled"}
                    InputProps={!editMode ? { disableUnderline: true } : {}}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Cargo"
                    name="cargo"
                    value={userData.cargo}
                    onChange={handleChange}
                    disabled={!editMode}
                    variant={editMode ? "outlined" : "filled"}
                    InputProps={!editMode ? { disableUnderline: true } : {}}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="E-mail"
                    name="email"
                    type="email"
                    value={userData.email}
                    onChange={handleChange}
                    disabled={!editMode}
                    variant={editMode ? "outlined" : "filled"}
                    InputProps={!editMode ? { disableUnderline: true } : {}}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    name="telefone"
                    value={userData.telefone}
                    onChange={handleChange}
                    disabled={!editMode}
                    variant={editMode ? "outlined" : "filled"}
                    InputProps={!editMode ? { disableUnderline: true } : {}}
                  />
                </Grid>
              </Grid>
              
              {editMode && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Alterar Senha
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Senha Atual"
                        type="password"
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Nova Senha"
                        type="password"
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Confirmar Nova Senha"
                        type="password"
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Layout>
  );
};

const Perfil = () => {
  return (
    <ProtectedRoute>
      <PerfilContent />
    </ProtectedRoute>
  );
};

export default Perfil;
