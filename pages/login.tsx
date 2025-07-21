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
    } catch (err: unknown) {
      interface ApiError extends Error {
        response?: {
          data?: {
            message?: string;
          };
        };
        message: string;
      }
      console.error('Erro durante o login:', err);
      const error = err as ApiError;
      const rawMessage = error.response?.data?.message || error.message || 'Erro ao fazer login. Verifique suas credenciais.';
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
        <title>Login | Gestão Logística Esplendor</title>
      </Head>
      
      <Box
        sx={{
          minHeight: '100vh',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Container component="main" maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
          <Typography 
            component="h1" 
            variant="h3" 
            sx={{ 
              mb: 4, 
              fontWeight: 900,
              color: '#ffffff',
              textAlign: 'center',
              letterSpacing: '1px',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' }
            }}
          >
            GESTÃO LOGÍSTICA ESPLENDOR
          </Typography>
          
          <Paper 
            elevation={24} 
            sx={{ 
              p: 5, 
              width: '100%', 
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Typography 
              component="h2" 
              variant="h4" 
              align="center" 
              sx={{ 
                mb: 4, 
                fontWeight: 700,
                color: '#1a1a1a',
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
              }}
            >
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
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  py: 1.8,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #ff6b35 30%, #ff8c42 90%)',
                  boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #e55a2b 30%, #e57a35 90%)',
                    boxShadow: '0 6px 25px rgba(255, 107, 53, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: '#cccccc'
                  },
                  transition: 'all 0.3s ease'
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Entrar'
                )}
              </Button>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link 
                  component={NextLink} 
                  href="/esqueci-senha" 
                  variant="body2"
                  sx={{
                    color: '#ff6b35',
                    fontWeight: 500,
                    textDecoration: 'none',
                    '&:hover': {
                      color: '#e55a2b',
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Esqueceu sua senha?
                </Link>
              </Box>
            </Box>
          </Paper>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}
            >
              © {new Date().getFullYear()} Gestão Logística Esplendor
            </Typography>
          </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
