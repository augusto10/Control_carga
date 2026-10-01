import { useState, useEffect } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Link, 
  Paper,
  CircularProgress,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  
  const { login, isAuthenticated, error: authError } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (authError) {
      setErrorLocal(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    setIsLoading(true);

    try {
      if (!email || !senha) {
        setErrorLocal('Por favor, preencha todos os campos');
        setIsLoading(false);
        return;
      }

      await login({ email, senha });
      enqueueSnackbar('Login realizado com sucesso!', { variant: 'success' });
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);
      // O erro já é tratado no AuthContext e disponibilizado via authError
    } finally {
      setIsLoading(false);
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
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000") no-repeat center center fixed',
          backgroundSize: 'cover',
          width: '100vw',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <Container component="main" maxWidth="xs" sx={{ zIndex: 1, position: 'relative' }}>
          <Paper
            elevation={6}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 3,
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <Box sx={{ mb: 2, bgcolor: 'primary.main', p: 1.5, borderRadius: '50%' }}>
              <LockOutlinedIcon sx={{ color: 'white' }} />
            </Box>
            
            <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: 'primary.main' }}>
              Controle de Carga
            </Typography>

            {errorLocal && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {errorLocal}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="E-mail"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
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
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
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
                sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 'bold', fontSize: '1rem', borderRadius: 2 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Entrar'
                )}
              </Button>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link component={NextLink} href="/esqueci-senha" variant="body2" sx={{ fontWeight: 500 }}>
                  Esqueceu sua senha?
                </Link>
              </Box>
            </Box>
          </Paper>
          
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
              © {new Date().getFullYear()} Controle de Carga - Todos os direitos reservados
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
