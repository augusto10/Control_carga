import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link, 
  Alert, 
  IconButton, 
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Head from 'next/head';
import NextLink from 'next/link';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const { login, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redireciona usuários já autenticados
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Mostra um loader enquanto verifica a autenticação
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    console.log('Iniciando tentativa de login...');
    console.log('Dados do formulário:', formData);
    
    try {
      console.log('Chamando a função login...');
      await login(formData);
      enqueueSnackbar('Login efetuado com sucesso!', { variant: 'success' });
    } catch (err: any) {
      console.error('Erro durante o login:', err);
      const rawMessage = err.response?.data?.message || err.message || 'Erro ao fazer login. Verifique suas credenciais.';
      let friendlyMessage = rawMessage;
      const lower = rawMessage.toLowerCase();
      if (lower.includes('não encontrado')) {
        friendlyMessage = 'Usuário não existe. Por favor, cadastre-se.';
      } else if (
        lower.includes('senha') ||
        lower.includes('credenciais') ||
        lower.includes('incorreta') ||
        lower.includes('invalid')
      ) {
        friendlyMessage = 'Usuário ou senha inválida.';
      }
      enqueueSnackbar(friendlyMessage, { variant: 'error' });
      setError(friendlyMessage);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Head>
        <title>Login | Controle de Carga</title>
      </Head>
      
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
            Controle de Carga
          </Typography>
          
          <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
            <Typography component="h2" variant="h5" align="center" sx={{ mb: 3 }}>
              Acessar Conta
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="E-mail"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="senha"
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                id="senha"
                autoComplete="current-password"
                value={formData.senha}
                onChange={handleChange}
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Entrar'
                )}
              </Button>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link component={NextLink} href="/esqueci-senha" variant="body2">
  Esqueceu sua senha?
</Link>
              </Box>
            </Box>
          </Paper>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Controle de Carga
            </Typography>
          </Box>
        </Box>
      </Container>
    </>
  );
}
