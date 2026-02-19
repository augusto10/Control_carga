import { useState, useEffect } from 'react';
import { Button, Container, Typography, Box, CircularProgress, Chip, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, Paper } from '@mui/material';
import { DeleteRounded } from '@mui/icons-material';
import { useStore } from '../store/store';
import { format } from 'date-fns';

const ListarNotas = () => {
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
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 3, boxShadow: 4, overflowX: 'auto', width: '90%', maxWidth: 1200, minWidth: 700 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#ff9800', height: 48 }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: 15, px: 2 }}>Data</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: 15, px: 2 }}>Número da Nota</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: 15, px: 2 }}>Status</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: 15, px: 2 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notas.map((nota, idx) => (
                <TableRow key={nota.id} sx={{ backgroundColor: idx % 2 === 0 ? '#fff9f1' : '#fff', height: 54 }}>
                  <TableCell sx={{ minWidth: 120, fontSize: 14, py: 1, px: 2 }}>{nota.dataCriacao ? format(new Date(nota.dataCriacao), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell sx={{ minWidth: 120, fontSize: 14, py: 1, px: 2 }}>{nota.numeroNota}</TableCell>
                  <TableCell>
                    {nota.controleId ? (
                      <Chip label="Em carga" color="success" size="small" sx={{ minWidth: 90, fontWeight: 600, letterSpacing: 0.5, fontSize: 13, height: 28, px: 1 }} />
                    ) : (
                      <Chip label="Disponível" color="warning" size="small" sx={{ minWidth: 90, fontWeight: 600, letterSpacing: 0.5, fontSize: 13, height: 28, px: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    {!nota.controleId && (
                      <Tooltip title="Excluir Nota">
                        <IconButton 
                          onClick={() => handleExcluirNota(nota.id)} 
                          size="small" 
                          sx={{ ml: 1, color: '#ff5722', bgcolor: '#fff3e0', borderRadius: 2, '&:hover': { bgcolor: '#ffe0b2', color: '#d84315' } }}
                        >
                          <DeleteRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      )}
    </Container>
  );
};

function handleExcluirNota(id: string) {
  alert(`Excluir nota ${id} (implementar ação real)`);
}

export default ListarNotas;
