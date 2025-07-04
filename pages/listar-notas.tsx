import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button, Container, Typography, Box, List, ListItem, ListItemText, CircularProgress, Chip, TextField } from '@mui/material';
import { useStore } from '../store/store';
import { format } from 'date-fns';

const ListarNotas = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const { notas, fetchNotas } = useStore();

  useEffect(() => {
    const loadNotas = async () => {
      await fetchNotas(start, end);
      setLoading(false);
    };
    loadNotas();
  }, [fetchNotas, start, end]);

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Consultar Notas
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Data início"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <TextField
          label="Data fim"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <Button variant="contained" onClick={() => setLoading(true)}>Filtrar</Button>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {notas.map((nota) => (
            <ListItem key={nota.id} divider>
              <ListItemText 
                primary={`Nota: ${nota.numeroNota}`} 
                secondary={`Código: ${nota.codigo}`} 
              />
              {nota.controleId ? (
                <Chip label="Em carga" color="success" />
              ) : (
                <Chip label="Disponível" color="warning" />
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
};

export default ListarNotas;
