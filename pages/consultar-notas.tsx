import { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TablePagination,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
  Avatar,
  alpha
} from '@mui/material';
import { 
  Search, 
  FilterList, 
  Refresh, 
  Delete as DeleteIcon,
  Description as NoteIcon,
  Event as EventIcon,
  QrCode as QrCodeIcon,
  LocalShipping as ShippingIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useStore } from '../store/store';
import { useSnackbar } from 'notistack';
import ResponsiveContainer from '../components/ResponsiveContainer';
import ProtectedRoute from '../components/ProtectedRoute';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import formatISO9075 from 'date-fns/formatISO9075';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);
const MotionTableRow = motion(TableRow);

interface FiltrosNotas {
  numeroNota?: string;
  codigo?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: 'TODAS' | 'DISPONIVEIS' | 'VINCULADAS';
}

const ConsultarNotas = () => {
  const [filtros, setFiltros] = useState<FiltrosNotas>({
    status: 'TODAS'
  });
  const [pagina, setPagina] = useState(0);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);
  const [carregando, setCarregando] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { enqueueSnackbar } = useSnackbar();
  const { notas, fetchNotas, deleteNota } = useStore();

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      carregarNotas();
    }, 500);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filtros]);

  const carregarNotas = async () => {
    setCarregando(true);
    try {
      await fetchNotas(
        filtros.dataInicio,
        filtros.dataFim,
        filtros.numeroNota,
        filtros.codigo
      );
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      setCarregando(false);
    }
  };

  const handleMudarPagina = (event: unknown, novaPagina: number) => {
    setPagina(novaPagina);
  };

  const handleMudarLinhasPorPagina = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinhasPorPagina(parseInt(event.target.value, 10));
    setPagina(0);
  };

  const filtrarNotas = () => {
    return notas.filter(nota => {
      if (filtros.status === 'DISPONIVEIS' && nota.controleId) {
        return false;
      }
      if (filtros.status === 'VINCULADAS' && !nota.controleId) {
        return false;
      }
      return true;
    });
  };

  const notasFiltradas = filtrarNotas();
  const notasPaginadas = notasFiltradas.slice(
    pagina * linhasPorPagina,
    pagina * linhasPorPagina + linhasPorPagina
  );

  const handleExcluirNota = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await deleteNota(id);
      enqueueSnackbar('Nota excluída com sucesso!', { variant: 'success' });
      await carregarNotas();
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'Erro ao excluir nota', { variant: 'error' });
    }
  };

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Consultar Notas' }
        ]}
      >
        {/* Header */}
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          mb={4}
        >
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Box 
            sx={{ 
              p: 1.5, 
              borderRadius: 3, 
              background: 'linear-gradient(135deg, #ed6c02 0%, #e65100 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(237, 108, 2, 0.25)',
              display: 'flex'
            }}
          >
            <NoteIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="800" sx={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>
              Consultar Notas
            </Typography>
            <Typography variant="body1" color="text.secondary" fontWeight="500">
              Gerencie e acompanhe as Notas Fiscais cadastradas
            </Typography>
          </Box>
        </Box>
      </MotionBox>

      {/* Filters Section */}
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <FilterList color="primary" />
          <Typography variant="h6" fontWeight="700">Filtros de Busca</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Número da Nota"
              placeholder="Ex: 12345"
              value={filtros.numeroNota || ''}
              onChange={(e) => setFiltros({ ...filtros, numeroNota: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCodeIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2.5 }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filtros.dataInicio || ''}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              InputProps={{
                sx: { borderRadius: 2.5 }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filtros.dataFim || ''}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              InputProps={{
                sx: { borderRadius: 2.5 }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              select
              label="Status"
              value={filtros.status || 'TODAS'}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value as any })}
              SelectProps={{ native: true }}
              InputProps={{
                sx: { borderRadius: 2.5 }
              }}
            >
              <option value="TODAS">Todas</option>
              <option value="DISPONIVEIS">Disponíveis</option>
              <option value="VINCULADAS">Vinculadas</option>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center', pt: 1 }}>
              <Tooltip title="Limpar Filtros">
                <Button 
                  onClick={() => setFiltros({ status: 'TODAS' })}
                  variant="outlined"
                  sx={{ borderRadius: 2.5, minWidth: 48, p: 1 }}
                >
                  <CloseIcon />
                </Button>
              </Tooltip>
              <Button 
                fullWidth
                onClick={carregarNotas}
                variant="contained"
                disabled={carregando}
                startIcon={carregando ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
                sx={{ 
                  borderRadius: 2.5, 
                  height: 48,
                  textTransform: 'none',
                  fontWeight: '700'
                }}
              >
                Atualizar
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </MotionPaper>

      {/* Table Section */}
      <TableContainer 
        component={MotionPaper}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        sx={{ 
          borderRadius: 4,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(248, 250, 252, 0.5)' }}>Nota Fiscal</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(248, 250, 252, 0.5)' }}>Código</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'rgba(248, 250, 252, 0.5)' }}>Volumes</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(248, 250, 252, 0.5)' }}>Data Cadastro</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(248, 250, 252, 0.5)' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(248, 250, 252, 0.5)' }}>Vínculo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'rgba(248, 250, 252, 0.5)' }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress thickness={4} size={40} />
                    <Typography variant="body2" color="text.secondary" mt={2}>Buscando notas...</Typography>
                  </TableCell>
                </TableRow>
              ) : notasPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Box sx={{ opacity: 0.3, mb: 2 }}>
                      <NoteIcon sx={{ fontSize: 60 }} />
                    </Box>
                    <Typography variant="h6" color="text.secondary">Nenhuma nota encontrada</Typography>
                    <Typography variant="body2" color="text.disabled">Tente ajustar seus filtros de busca</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                notasPaginadas.map((nota, index) => (
                  <MotionTableRow 
                    key={nota.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (index * 0.05) }}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="700" color="primary.main">
                        {nota.numeroNota}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {nota.codigo}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={nota.volumes || '1'} 
                        size="small" 
                        sx={{ fontWeight: '600', bgcolor: 'grey.100' }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatISO9075(new Date(nota.dataCriacao))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={nota.controleId ? "Vinculada" : "Disponível"} 
                        color={nota.controleId ? "success" : "warning"}
                        size="small"
                        variant={nota.controleId ? "filled" : "outlined"}
                        sx={{ fontWeight: '600', borderRadius: 1.5 }}
                      />
                    </TableCell>
                    <TableCell>
                      {nota.controle ? (
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="caption" display="block">Manifesto: {nota.controle.numeroManifesto || 'N/A'}</Typography>
                              <Typography variant="caption" display="block">Motorista: {nota.controle.motorista}</Typography>
                              <Typography variant="caption" display="block">Transportadora: {nota.controle.transportadora}</Typography>
                            </Box>
                          }
                          arrow
                        >
                          <Chip 
                            icon={<ShippingIcon sx={{ fontSize: '14px !important' }} />}
                            label={nota.controle.numeroManifesto || nota.controle.id.substring(0, 8)} 
                            size="small"
                            variant="outlined"
                            sx={{ cursor: 'pointer', fontWeight: '500' }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">Sem vínculo</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={nota.controleId ? "Não é possível excluir nota vinculada" : "Excluir nota"}>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleExcluirNota(nota.id)}
                          disabled={!!nota.controleId}
                          sx={{ 
                            '&:hover': { bgcolor: 'error.lighter' }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </MotionTableRow>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={notasFiltradas.length}
        rowsPerPage={linhasPorPagina}
        page={pagina}
        onPageChange={handleMudarPagina}
        onRowsPerPageChange={handleMudarLinhasPorPagina}
        labelRowsPerPage="Notas por página:"
        sx={{ mt: 1 }}
      />
      </ResponsiveContainer>
    </ProtectedRoute>
  );
};

export default ConsultarNotas;
