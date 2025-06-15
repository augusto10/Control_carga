import { useState } from 'react';
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
import { Person as PersonIcon, Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import Layout from '../components/Layout';

const Perfil = () => {
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState({
    nome: 'Usuário Teste',
    email: 'usuario@exemplo.com',
    telefone: '(11) 99999-9999',
    cargo: 'Administrador',
    dataCadastro: '15/06/2023'
  });

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = () => {
    setEditMode(false);
    // Aqui você pode adicionar a lógica para salvar as alterações
  };

  const handleCancel = () => {
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

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h1">
              Meu Perfil
            </Typography>
            {!editMode ? (
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
              <Avatar 
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
              {editMode && (
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<EditIcon />}
                  sx={{ mt: 1 }}
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

export default Perfil;
