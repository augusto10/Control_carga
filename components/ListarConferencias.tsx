import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Box,
  IconButton,
  TablePagination,
  FormControlLabel,
  Switch,
  SelectChangeEvent,
  Stack,
  alpha,
  Tooltip,
  CircularProgress,
  Grid,
  Avatar,
  InputAdornment
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Save as SaveIcon, 
  Cancel as CancelIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  LocalShipping as LocalShippingIcon,
  Assignment as AssignmentIcon,
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
  GridOn as GridIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

const MOTIVOS_INCONSISTENCIA = [
  'AVARIA',
  'QUANTIDADE',
  'PRODUTO TROCADO',
  'EMBALAGEM',
  'PRODUTO SUJO',
  'PRODUTO VENCIDO',
  'ETIQUETAGEM',
  'LOTE',
  'SEM INCONSISTÊNCIA',
  'PRODUTO FALTANDO'
] as const;

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Conferencia {
  id: string;
  dataCriacao: string;
  pedido100: boolean;
  inconsistencia: boolean;
  motivosInconsistencia: string[];
  observacoes: string | null;
  conferente: Usuario;
  pedido: {
    id: string;
    numeroPedido: string;
    controle: {
      id: string;
      numeroManifesto: string | null;
      motorista: string;
      responsavel: string;
      transportadora: string;
    } | null;
  };
}

export default function ListarConferencias() {
  const { user } = useAuth();
  const [conferencias, setConferencias] = useState<Conferencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'com-inconsistencia' | 'sem-inconsistencia'>('todos');
  const [busca, setBusca] = useState('');
  
  // Estados para edição
  const [editando, setEditando] = useState<string | null>(null);
  const [editPedido100, setEditPedido100] = useState(false);
  const [editInconsistencia, setEditInconsistencia] = useState(false);
  const [editMotivos, setEditMotivos] = useState<string[]>([]);
  const [editObservacoes, setEditObservacoes] = useState('');

  const podeEditar = user?.tipo === 'ADMIN' || user?.tipo === 'GERENTE' || user?.tipo === 'AUDITOR';

  const carregarConferencias = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      const params = new URLSearchParams();
      
      if (filtroDataInicio) params.append('dataInicio', filtroDataInicio);
      if (filtroDataFim) params.append('dataFim', filtroDataFim);
      if (filtroStatus !== 'todos') params.append('status', filtroStatus);
      
      const response = await api.get(`/api/conferencias?${params.toString()}`);
      setConferencias(response.data);
    } catch (error) {
      console.error('Erro ao carregar conferências:', error);
      setErro('Erro ao carregar a lista de conferências. Tente novamente mais tarde.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarConferencias();
  }, [filtroDataInicio, filtroDataFim, filtroStatus]);

  const handleMudarPagina = (event: unknown, novaPagina: number) => {
    setPagina(novaPagina);
  };

  const handleMudarLinhasPorPagina = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinhasPorPagina(parseInt(event.target.value, 10));
    setPagina(0);
  };

  const handleIniciarEdicao = (conferencia: Conferencia) => {
    setEditando(conferencia.id);
    setEditPedido100(conferencia.pedido100);
    setEditInconsistencia(conferencia.inconsistencia);
    setEditMotivos([...conferencia.motivosInconsistencia]);
    setEditObservacoes(conferencia.observacoes || '');
  };

  const handleCancelarEdicao = () => {
    setEditando(null);
  };

  const handleSalvarEdicao = async (conferenciaId: string) => {
    try {
      await api.put(`/api/conferencias/${conferenciaId}`, {
        pedido100: editPedido100,
        inconsistencia: editInconsistencia,
        motivosInconsistencia: editInconsistencia ? editMotivos : [],
        observacoes: editObservacoes || null
      });
      
      await carregarConferencias();
      setEditando(null);
    } catch (error) {
      console.error('Erro ao atualizar conferência:', error);
      setErro('Erro ao atualizar a conferência. Tente novamente.');
    }
  };

  const handleMotivoChange = (event: SelectChangeEvent<typeof editMotivos>) => {
    const { value } = event.target;
    setEditMotivos(typeof value === 'string' ? value.split(',') : value);
  };

  // Dados filtrados e paginados
  const conferenciasFiltradas = conferencias.filter(conf => {
    const termoBusca = busca.toLowerCase();
    return (
      conf.pedido.numeroPedido.toLowerCase().includes(termoBusca) ||
      (conf.pedido.controle?.motorista || '').toLowerCase().includes(termoBusca) ||
      (conf.pedido.controle?.transportadora || '').toLowerCase().includes(termoBusca) ||
      (conf.pedido.controle?.responsavel || '').toLowerCase().includes(termoBusca)
    );
  });

  const conferenciasPaginadas = conferenciasFiltradas.slice(
    pagina * linhasPorPagina,
    (pagina + 1) * linhasPorPagina
  );

  const glassStyles = {
    background: alpha('#ffffff', 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
  };

  return (
    <Box>
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ mb: 4 }}
      >
        <MotionPaper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '24px',
            ...glassStyles
          }}
        >
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 2, 
                bgcolor: alpha('#3b82f6', 0.1), 
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FilterListIcon />
              </Box>
              <Typography variant="h6" fontWeight="800" color="text.primary">
                Filtros de Busca
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Buscar por pedido, motorista ou transportadora..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'primary.main', opacity: 0.7 }} />
                      </InputAdornment>
                    ),
                    sx: { 
                      borderRadius: '12px',
                      bgcolor: alpha('#fff', 0.5),
                    }
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2.5}>
                <TextField
                  fullWidth
                  label="Início"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2.5}>
                <TextField
                  fullWidth
                  label="Fim"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 600 }}>Status</InputLabel>
                  <Select
                    value={filtroStatus}
                    label="Status"
                    onChange={(e) => setFiltroStatus(e.target.value as any)}
                    sx={{ 
                      borderRadius: '12px',
                      bgcolor: alpha('#fff', 0.5),
                    }}
                  >
                    <MenuItem value="todos">Todos os registros</MenuItem>
                    <MenuItem value="com-inconsistencia">Com Inconsistência</MenuItem>
                    <MenuItem value="sem-inconsistencia">Sem Inconsistência</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {conferenciasFiltradas.length} registro(s) encontrado(s)
              </Typography>
              <Button 
                size="small" 
                variant="text" 
                startIcon={<RefreshIcon />}
                onClick={carregarConferencias}
                disabled={carregando}
                sx={{ 
                  borderRadius: '8px', 
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { bgcolor: alpha('#3b82f6', 0.05) }
                }}
              >
                Atualizar
              </Button>
            </Stack>
          </Stack>
        </MotionPaper>
      </MotionBox>

      {erro && (
        <MotionBox
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          sx={{ 
            p: 2, 
            mb: 3, 
            borderRadius: '12px', 
            bgcolor: alpha('#ef4444', 0.1), 
            border: `1px solid ${alpha('#ef4444', 0.2)}`,
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          <ErrorIcon fontSize="small" />
          <Typography variant="body2" fontWeight="700">{erro}</Typography>
        </MotionBox>
      )}

      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        elevation={0}
        sx={{ 
          width: '100%', 
          overflow: 'hidden', 
          borderRadius: '24px',
          ...glassStyles
        }}
      >
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Data / Hora</TableCell>
                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Nº Pedido</TableCell>
                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Motorista</TableCell>
                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Responsável</TableCell>
                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Transportadora</TableCell>
                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }} align="center">Pedido 100%</TableCell>
                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }} align="center">Status</TableCell>
                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Conferente</TableCell>
                {podeEditar && <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }} align="right">Ações</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence mode="wait">
                {carregando ? (
                  <MotionTableRow
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TableCell colSpan={podeEditar ? 9 : 8} align="center" sx={{ py: 12 }}>
                      <Stack spacing={3} alignItems="center">
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress size={48} thickness={4} sx={{ color: 'primary.main', opacity: 0.2 }} />
                          <CircularProgress 
                            size={48} 
                            thickness={4} 
                            sx={{ 
                              color: 'primary.main', 
                              position: 'absolute',
                              strokeLinecap: 'round'
                            }} 
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight="600">
                          Sincronizando conferências...
                        </Typography>
                      </Stack>
                    </TableCell>
                  </MotionTableRow>
                ) : conferenciasPaginadas.length === 0 ? (
                  <MotionTableRow
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TableCell colSpan={podeEditar ? 9 : 8} align="center" sx={{ py: 12 }}>
                      <Stack spacing={2} alignItems="center">
                        <Box sx={{ 
                          width: 64, 
                          height: 64, 
                          borderRadius: '50%', 
                          bgcolor: alpha('#94a3b8', 0.1), 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          mb: 1
                        }}>
                          <SearchIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                        </Box>
                        <Typography variant="h6" fontWeight="800" color="text.primary">Nenhuma conferência</Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight="500">Tente ajustar os filtros de busca</Typography>
                      </Stack>
                    </TableCell>
                  </MotionTableRow>
                ) : (
                  conferenciasPaginadas.map((conferencia, index) => (
                    <MotionTableRow 
                      key={conferencia.id} 
                      hover
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      sx={{ 
                        '&:hover': { bgcolor: alpha('#f1f5f9', 0.5) },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DateRangeIcon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.7 }} />
                          <Typography variant="body2" fontWeight="600">
                            {format(new Date(conferencia.dataCriacao), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={conferencia.pedido.numeroPedido} 
                          variant="filled" 
                          size="small" 
                          sx={{ 
                            fontWeight: 800, 
                            borderRadius: '6px', 
                            bgcolor: alpha('#3b82f6', 0.1),
                            color: '#2563eb'
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" color="text.primary">
                          {conferencia.pedido.controle?.motorista || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500" color="text.secondary">
                          {conferencia.pedido.controle?.responsavel || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: 'text.secondary' }}>
                          {conferencia.pedido.controle?.transportadora || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {editando === conferencia.id ? (
                          <Switch
                            checked={editPedido100}
                            onChange={(e) => setEditPedido100(e.target.checked)}
                            color="success"
                          />
                        ) : (
                          <Tooltip title={conferencia.pedido100 ? 'Pedido completo' : 'Pedido incompleto'}>
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              {conferencia.pedido100 ? (
                                <CheckCircleIcon sx={{ color: '#10b981' }} />
                              ) : (
                                <CancelIcon sx={{ color: alpha('#94a3b8', 0.3) }} />
                              )}
                            </Box>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editando === conferencia.id ? (
                          <FormControl fullWidth size="small" sx={{ minWidth: 100 }}>
                            <Select
                              value={editInconsistencia ? 'sim' : 'nao'}
                              onChange={(e) => setEditInconsistencia(e.target.value === 'sim')}
                              sx={{ borderRadius: '8px' }}
                            >
                              <MenuItem value="sim">Sim</MenuItem>
                              <MenuItem value="nao">Não</MenuItem>
                            </Select>
                          </FormControl>
                        ) : (
                          <Chip 
                            label={conferencia.inconsistencia ? 'Inconsistente' : 'Ok'} 
                            color={conferencia.inconsistencia ? 'error' : 'success'} 
                            size="small" 
                            sx={{ 
                              fontWeight: 800,
                              minWidth: 100,
                              borderRadius: '8px',
                              bgcolor: alpha(conferencia.inconsistencia ? '#ef4444' : '#10b981', 0.1),
                              color: conferencia.inconsistencia ? '#dc2626' : '#059669',
                              border: 'none'
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32, 
                            fontSize: '0.85rem', 
                            fontWeight: 700,
                            bgcolor: alpha('#6366f1', 0.1), 
                            color: '#6366f1',
                            boxShadow: `0 2px 8px ${alpha('#6366f1', 0.2)}`
                          }}>
                            {conferencia.conferente.nome.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight="700" color="text.primary">
                            {conferencia.conferente.nome.split(' ')[0]}
                          </Typography>
                        </Stack>
                      </TableCell>
                      {podeEditar && (
                        <TableCell align="right">
                          {editando === conferencia.id ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Salvar">
                                <IconButton 
                                  size="small" 
                                  sx={{ 
                                    color: '#10b981', 
                                    bgcolor: alpha('#10b981', 0.1), 
                                    '&:hover': { bgcolor: alpha('#10b981', 0.2) },
                                    borderRadius: '8px'
                                  }}
                                  onClick={() => handleSalvarEdicao(conferencia.id)}
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancelar">
                                <IconButton 
                                  size="small" 
                                  sx={{ 
                                    color: '#64748b', 
                                    bgcolor: alpha('#64748b', 0.1), 
                                    '&:hover': { bgcolor: alpha('#64748b', 0.2) },
                                    borderRadius: '8px'
                                  }}
                                  onClick={handleCancelarEdicao}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Tooltip title="Editar conferência">
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  color: 'primary.main', 
                                  bgcolor: alpha('#3b82f6', 0.05), 
                                  '&:hover': { bgcolor: alpha('#3b82f6', 0.1) },
                                  borderRadius: '8px'
                                }}
                                onClick={() => handleIniciarEdicao(conferencia)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </MotionTableRow>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={conferenciasFiltradas.length}
          rowsPerPage={linhasPorPagina}
          page={pagina}
          onPageChange={handleMudarPagina}
          onRowsPerPageChange={handleMudarLinhasPorPagina}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{ borderTop: '1px solid', borderColor: alpha('#e2e8f0', 0.6) }}
        />
      </MotionPaper>

      {/* Modal para editar motivos e observações */}
      <AnimatePresence>
        {editando && (
          <Dialog 
            open={!!editando} 
            onClose={handleCancelarEdicao} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: '24px',
                p: 1,
                background: alpha('#ffffff', 0.9),
                backdropFilter: 'blur(16px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: `1px solid ${alpha('#ffffff', 0.5)}`
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#1e293b', pb: 1, pt: 3, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: alpha('#3b82f6', 0.1), 
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AssignmentIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="800">Editar Detalhes</Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Conferência #{conferencias.find(c => c.id === editando)?.pedido.numeroPedido}
                  </Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ px: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
                Atualize as informações de inconsistência e observações deste pedido.
              </Typography>
              
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ fontWeight: 600 }}>Motivos da Inconsistência</InputLabel>
                  <Select
                    multiple
                    value={editMotivos}
                    onChange={handleMotivoChange}
                    input={<OutlinedInput label="Motivos da Inconsistência" sx={{ borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }} />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small" 
                            sx={{ 
                              borderRadius: '6px', 
                              fontWeight: 700,
                              bgcolor: alpha('#3b82f6', 0.1),
                              color: 'primary.main'
                            }} 
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {MOTIVOS_INCONSISTENCIA.map((motivo) => (
                      <MenuItem key={motivo} value={motivo}>
                        <Checkbox checked={editMotivos.indexOf(motivo) > -1} />
                        <ListItemText primary={motivo} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Observações"
                  multiline
                  rows={4}
                  placeholder="Adicione observações relevantes sobre esta conferência..."
                  value={editObservacoes}
                  onChange={(e) => setEditObservacoes(e.target.value)}
                  InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 4, pt: 2, gap: 1.5 }}>
              <Button 
                onClick={handleCancelarEdicao}
                color="inherit"
                sx={{ 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  px: 3,
                  textTransform: 'none',
                  color: 'text.secondary',
                  '&:hover': { bgcolor: alpha('#000000', 0.05) }
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => editando && handleSalvarEdicao(editando)}
                variant="contained"
                sx={{ 
                  borderRadius: '12px', 
                  fontWeight: 800, 
                  px: 4,
                  textTransform: 'none',
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  '&:hover': { 
                    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s'
                }}
              >
                Salvar Alterações
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>
    </Box>
  );
}
