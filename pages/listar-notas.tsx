import { useState, useEffect } from 'react';
import { Button, Container, Typography, Box, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import { useStore } from '../store/store';

const ListarNotas = () => {
  const [loading, setLoading] = useState(true);
  const { notas, fetchNotas } = useStore();

  useEffect(() => {
    const loadNotas = async () => {
      await fetchNotas();
      setLoading(false);
    };
    loadNotas();
  }, [fetchNotas]);

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Consultar Notas
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {notas.map((nota) => (
            <ListItem key={nota.id}>
              <ListItemText primary={`Nota: ${nota.numeroNota}`} secondary={`Código: ${nota.codigo}`} />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
};

export default ListarNotas;
