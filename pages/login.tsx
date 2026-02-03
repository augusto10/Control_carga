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
  CircularProgress,
  Stack,
  useTheme,
  useMediaQuery,
  Avatar,
  alpha
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { 
  Visibility, 
  VisibilityOff, 
  LockOutlined as LockIcon,
  EmailOutlined as EmailIcon,
  LoginOutlined as LoginIcon
} from '@mui/icons-material';
import Head from 'next/head';
import NextLink from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redireciona usuários já autenticados
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Mostra um loader enquanto verifica a autenticação
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
        }}
      >
        <CircularProgress thickness={4} size={60} sx={{ color: 'white', mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 500 }}>
          Autenticando...
        </Typography>
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
    
    try {
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
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Container component="main" maxWidth="sm">
          <AnimatePresence>
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
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
                  mb: 5, 
                  fontWeight: 900,
                  color: '#ffffff',
                  textAlign: 'center',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  textShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                }}
              >
                Gestão Logística Esplendor
              </Typography>
              
              <MotionPaper 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                elevation={0}
                sx={{ 
                  p: { xs: 3, sm: 6 }, 
                  width: '100%', 
                  borderRadius: 5,
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }}
              >
                <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
                  <Avatar 
                    sx={{ 
                      m: 1, 
                      bgcolor: 'primary.main', 
                      width: 60, 
                      height: 60,
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                    }}
                  >
                    <LockIcon fontSize="large" />
                  </Avatar>
                  <Typography 
                    component="h2" 
                    variant="h4" 
                    fontWeight="800"
                    sx={{ color: '#1a1a1a', mt: 1 }}
                  >
                    Login
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entre com suas credenciais para acessar o painel
                  </Typography>
                </Box>
                
                <AnimatePresence mode="wait">
                  {error && (
                    <MotionBox
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      sx={{ mb: 3 }}
                    >
                      <Alert 
                        severity="error" 
                        variant="standard"
                        sx={{ 
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
                    </MotionBox>
                  )}
                </AnimatePresence>
                
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <Stack spacing={3}>
                    <TextField
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
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 3 }
                      }}
                    />
                    
                    <TextField
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
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color="action" />
                          </InputAdornment>
                        ),
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
                        sx: { borderRadius: 3 }
                      }}
                    />
                    
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={isLoading}
                      sx={{ 
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        borderRadius: 3,
                        background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                        boxShadow: '0 8px 20px rgba(25, 118, 210, 0.3)',
                        textTransform: 'none',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                          boxShadow: '0 12px 28px rgba(25, 118, 210, 0.4)',
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                      startIcon={isLoading ? null : <LoginIcon />}
                    >
                      {isLoading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        'Acessar Sistema'
                      )}
                    </Button>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Link 
                        component={NextLink} 
                        href="/esqueci-senha" 
                        variant="body2"
                        sx={{
                          color: 'primary.main',
                          fontWeight: '600',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        Esqueceu sua senha?
                      </Link>
                    </Box>
                  </Stack>
                </Box>
              </MotionPaper>
              
              <MotionBox 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                sx={{ mt: 4, textAlign: 'center' }}
              >
                <Typography 
                  variant="body2" 
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: '600',
                    textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                  }}
                >
                  © {new Date().getFullYear()} Gestão Logística Esplendor • Todos os direitos reservados
                </Typography>
              </MotionBox>
            </MotionBox>
          </AnimatePresence>
        </Container>
      </Box>
    </>
  );
}
