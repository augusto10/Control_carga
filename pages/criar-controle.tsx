import React, { useState } from 'react';
import { useStore } from '../store/store';
import { 
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  FormControl,
  FormHelperText
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';

const CriarControlePage = () => {
  const [motorista, setMotorista] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [errors, setErrors] = useState({ motorista: '', responsavel: '' });
  const { criarControle } = useStore();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const validate = () => {
    let valid = true;
    const newErrors = { motorista: '', responsavel: '' };
    
    if (!motorista.trim()) {
      newErrors.motorista = 'Motorista é obrigatório';
      valid = false;
    }
    
    if (!responsavel.trim()) {
      newErrors.responsavel = 'Responsável é obrigatório';
      valid = false;
    }
    
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      try {
        const controle = await criarControle({ motorista, responsavel });
        enqueueSnackbar('Controle criado com sucesso!', { variant: 'success' });
        router.push(`/vincular-notas?id=${controle.id}`);
      } catch (error) {
        enqueueSnackbar('Erro ao criar controle', { variant: 'error' });
        console.error('Erro ao criar controle:', error);
      }
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Criar Controle de Carga
        </Typography>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.motorista}>
            <TextField
              label="Motorista"
              value={motorista}
              onChange={(e) => setMotorista(e.target.value)}
              error={!!errors.motorista}
            />
            {errors.motorista && <FormHelperText>{errors.motorista}</FormHelperText>}
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.responsavel}>
            <TextField
              label="Responsável"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              error={!!errors.responsavel}
            />
            {errors.responsavel && <FormHelperText>{errors.responsavel}</FormHelperText>}
          </FormControl>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              type="submit" 
              variant="contained" 
              size="large"
              sx={{ mt: 2 }}
            >
              Criar Controle
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default CriarControlePage;
