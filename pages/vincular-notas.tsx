import React, { useState, useEffect } from 'react';
import useStore from '../store/store';
import { 
  Container,
  Typography,
  Paper,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Divider
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';

const VincularNotasPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const { id } = router.query;
  
  const { 
    notasDisponiveis, 
    fetchNotas, 
    fetchControles,
    vincularNotas
  } = useStore();
  
  const [notasSelecionadas, setNotasSelecionadas] = useState<string[]>([]);

  useEffect(() => {
    fetchNotas();
  }, [fetchNotas]);

  const handleToggleNota = (notaId: string) => {
    const currentIndex = notasSelecionadas.indexOf(notaId);
    const newSelecionadas = [...notasSelecionadas];

    if (currentIndex === -1) {
      newSelecionadas.push(notaId);
    } else {
      newSelecionadas.splice(currentIndex, 1);
    }

    setNotasSelecionadas(newSelecionadas);
  };

  const handleVincular = async () => {
    try {
      await vincularNotas(id as string, notasSelecionadas);
      enqueueSnackbar('Notas vinculadas com sucesso!', { variant: 'success' });
      router.push('/listar-controles');
    } catch (error) {
      enqueueSnackbar('Erro ao vincular notas', { variant: 'error' });
      console.error(error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Vincular Notas ao Controle
        </Typography>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notas Disponíveis:
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <List>
          {notasDisponiveis
            .filter(nota => !nota.controleId)
            .map((nota) => (
              <ListItem key={nota.id}>
                <ListItemText 
                  primary={`Nota: ${nota.numeroNota}`}
                  secondary={`Código: ${nota.codigo}`} 
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    onChange={() => handleToggleNota(nota.id)}
                    checked={notasSelecionadas.indexOf(nota.id) !== -1}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
        </List>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          size="large"
          onClick={handleVincular}
          disabled={notasSelecionadas.length === 0}
        >
          Vincular Notas Selecionadas
        </Button>
      </Box>
    </Container>
  );
};

export default VincularNotasPage;
