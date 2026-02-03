import { useState, useEffect } from 'react';
import { Button, Container, Typography, Box, CircularProgress, Chip, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, Paper, Grid, Card, CardContent, alpha, useTheme } from '@mui/material';
import { DeleteRounded, Search as SearchIcon, Today as TodayIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { useStore } from '../store/store';
import ResponsiveContainer from '../components/ResponsiveContainer';
import ProtectedRoute from '../components/ProtectedRoute';
import { enqueueSnackbar } from 'notistack';
import { format } from 'date-fns';

const ListarNotas = () => {
  const [loading, setLoading] = useState(true);
  // Inicializar com a data atual
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const [start, setStart] = useState(hoje);
  const [end, setEnd] = useState(hoje);
  const [numeroNota, setNumeroNota] = useState('');
  const { notas, fetchNotas } = useStore();

  useEffect(() => {
    const loadNotas = async () => {
      setLoading(true);
      try {
        await fetchNotas(start, end, numeroNota);
      } catch (error) {
        console.error('Erro ao carregar notas:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNotas();
  }, [fetchNotas, numeroNota]);

  const handleFiltrarHoje = async () => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    setStart(hoje);
    setEnd(hoje);
    setLoading(true);
    try {
      await fetchNotas(hoje, hoje, numeroNota);
    } catch (error) {
      console.error('Erro ao filtrar por hoje:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLimparFiltros = async () => {
    setStart('');
    setEnd('');
    setNumeroNota('');
    setLoading(true);
    try {
      await fetchNotas('', '', '');
    } catch (error) {
      console.error('Erro ao limpar filtros:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Notas Fiscais' }
        ]}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Consultar Notas Fiscais
        </Typography>
      
      {/* Filtros */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon color="primary" />
            Filtros de Consulta
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Número da Nota"
                placeholder="Digite o número"
                value={numeroNota}
                onChange={(e) => setNumeroNota(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  startIcon={<TodayIcon />}
                  onClick={handleFiltrarHoje}
                  size="small"
                >
                  Hoje
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<CalendarIcon />}
                  onClick={handleLimparFiltros}
                  size="small"
                >
                  Todas as Datas
                </Button>
                <Button 
                  variant="contained" 
                  color="secondary"
                  startIcon={<SearchIcon />}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await fetchNotas(start, end, numeroNota);
                    } catch (error) {
                      console.error('Erro ao buscar notas:', error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  size="small"
                >
                  Buscar
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          {/* Resumo */}
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Período:</strong> {start ? format(new Date(start), 'dd/MM/yyyy') : 'Sem limite'} até {end ? format(new Date(end), 'dd/MM/yyyy') : 'Sem limite'}
              {' | '}
              <strong>Total encontrado:</strong> {notas.length} nota(s)
            </Typography>
          </Box>
        </CardContent>
      </Card>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                '& .MuiTableCell-head': {
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 16,
                  borderBottom: 'none'
                }
              }}>
                <TableCell>
                  Data de Criação
                </TableCell>
                <TableCell>
                  Número da Nota
                </TableCell>
                <TableCell>
                  Status
                </TableCell>
                <TableCell align="center">
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {start || end ? 'Nenhuma nota encontrada para o período selecionado.' : 'Nenhuma nota cadastrada.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                notas.map((nota, idx) => (
                  <TableRow 
                    key={nota.id} 
                    sx={{ 
                      backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc',
                      '&:hover': { backgroundColor: '#fff3e0' }
                    }}
                  >
                    <TableCell sx={{ fontSize: 14, py: 2 }}>
                      {nota.dataCriacao ? format(new Date(nota.dataCriacao), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, py: 2, fontWeight: 500 }}>
                      {nota.numeroNota}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      {nota.controleId ? (
                        <Chip 
                          label="Em Carga" 
                          color="success" 
                          size="small" 
                          sx={{ fontWeight: 600, minWidth: 90 }} 
                        />
                      ) : (
                        <Chip 
                          label="Disponível" 
                          color="warning" 
                          size="small" 
                          sx={{ fontWeight: 600, minWidth: 90 }} 
                        />
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      {!nota.controleId && (
                        <Tooltip title="Excluir Nota Fiscal">
                          <IconButton 
                            onClick={() => handleExcluirNota(nota.id)} 
                            size="small" 
                            sx={{ 
                              color: '#d32f2f', 
                              '&:hover': { 
                                backgroundColor: '#ffebee',
                                color: '#b71c1c'
                              } 
                            }}
                          >
                            <DeleteRounded />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      </ResponsiveContainer>
    </ProtectedRoute>
  );
};

// Função de exclusão real integrada ao backend
async function handleExcluirNota(id: string) {
  if (!confirm('Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.')) return;
  try {
    // Importando deleteNota dinamicamente do store para garantir contexto
    const { useStore } = await import('../store/store');
    const { deleteNota, fetchNotas } = useStore.getState();
    await deleteNota(id);
    enqueueSnackbar('Nota excluída com sucesso!', { variant: 'success', autoHideDuration: 3000 });
    await fetchNotas();
  } catch (error) {
    let errorMessage = 'Erro ao excluir nota. Tente novamente.';
    if (error instanceof Error) errorMessage = error.message;
    enqueueSnackbar(errorMessage, { variant: 'error', autoHideDuration: 5000 });
  }
}

export default ListarNotas;
