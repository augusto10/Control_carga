import React from 'react';
import { getCsrfToken, getProviders, signIn } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Alert,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useRouter } from 'next/router';

interface SignInProps {
  csrfToken: string;
  providers: Record<string, any> | null;
}

const SignIn: React.FC<SignInProps> = ({ csrfToken, providers }) => {
  const router = useRouter();
  const { error } = router.query;

  return (
    <Container component="main" maxWidth="xs">
      <Paper 
        elevation={3} 
        sx={{ 
          marginTop: 8, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: 4 
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Acessar Sistema
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            Credenciais inválidas. Por favor, tente novamente.
          </Alert>
        )}

        {providers && Object.values(providers).map((provider) => {
          if (provider.id === 'credentials') {
            return (
              <Box component="form" method="post" action="/api/auth/callback/credentials" sx={{ mt: 1 }} key={provider.name}>
                <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="Email"
                  name="username"
                  autoComplete="email"
                  autoFocus
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Senha"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                >
                  Entrar
                </Button>
              </Box>
            );
          }
          return null;
        })}
      </Paper>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const csrfToken = await getCsrfToken(context);
  const providers = await getProviders();
  return {
    props: { 
      csrfToken: csrfToken ?? null,
      providers 
    },
  };
};

export default SignIn;
