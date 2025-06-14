import React from 'react';
import { useStore } from '../store/store';
import { 
  Container,
  Typography,
  Button
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';

const CriarControlePage = () => {
  const { criarControle } = useStore();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const handleNovo = async () => {
    try {
      const controle = await criarControle({ motorista: 'PENDENTE', responsavel: 'PENDENTE' });
      router.push(`/vincular-notas?id=${controle.id}`);
    } catch (e) {
      enqueueSnackbar('Erro ao iniciar controle', { variant: 'error' });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Novo Controle de Carga
      </Typography>
      <Button variant="contained" size="large" fullWidth onClick={handleNovo}>
        Selecionar Notas
      </Button>
    </Container>
  );
};

export default CriarControlePage;
