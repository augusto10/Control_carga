import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Grid,
  Checkbox,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface PedidoConferido {
  id: string;
  dataCriacao: string;
  pedido100: boolean;
  inconsistencia: boolean;
  motivosInconsistencia: string[];
  observacoes: string | null;
  conferente: Usuario;
}

interface Pedido {
  id: string;
  numeroPedido: string;
  dataCriacao: string;
  controle: {
    id: string;
    numeroManifesto: string | null;
    motorista: string;
    responsavel: string;
    transportadora: string;
    separador: Usuario | null;
    auditor: Usuario | null;
  } | null;
  conferido: PedidoConferido | null;
}

interface Filtros {
  dataInicio: Date | null;
  dataFim: Date | null;
  status: 'todos' | 'com-inconsistencia' | 'sem-inconsistencia';
}

function PaginaConferenciaPedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);
  const [modalAberto, setModalAberto] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [pedido100, setPedido100] = useState('sim');
  const [inconsistencia, setInconsistencia] = useState('nao');
  const [motivos, setMotivos] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [filtros, setFiltros] = useState<Filtros>({
    dataInicio: null,
    dataFim: null,
    status: 'todos'
  });

  // Carregar pedidos
  const carregarPedidos = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      const params = new URLSearchParams();
      
      if (filtros.dataInicio) {
        params.append('dataInicio', filtros.dataInicio.toISOString());
      }
      
      if (filtros.dataFim) {
        params.append('dataFim', filtros.dataFim.toISOString());
      }
      
      if (filtros.status !== 'todos') {
        params.append('status', filtros.status);
      }
      
      const response = await api.get(`/api/pedidos/listar-conferidos?${params.toString()}`);
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setErro('Erro ao carregar a lista de pedidos. Tente novamente mais tarde.');
    } finally {
      setCarregando(false);
    }
  };

  // Carregar pedidos quando os filtros mudarem
  useEffect(() => {
    carregarPedidos();
  }, [filtros]);

  // Manipuladores de eventos
  const handleAbrirModal = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setModalAberto(true);
    
    // Se o pedido já foi conferido, preencher os campos
    if (pedido.conferido) {
      setPedido100(pedido.conferido.pedido100 ? 'sim' : 'nao');
      setInconsistencia(pedido.conferido.inconsistencia ? 'sim' : 'nao');
      setMotivos(pedido.conferido.motivosInconsistencia);
      setObservacoes(pedido.conferido.observacoes || '');
    } else {
      // Resetar campos para novo registro
      setPedido100('sim');
      setInconsistencia('nao');
      setMotivos([]);
      setObservacoes('');
    }
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setPedidoSelecionado(null);
  };

  const handleMotivoChange = (event: SelectChangeEvent<typeof motivos>) => {
    const { value } = event.target;
    setMotivos(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSalvarConferencia = async () => {
    if (!pedidoSelecionado || !user) return;
    
    try {
      const response = await api.post('/api/conferencias', {
        pedidoId: pedidoSelecionado.id,
        pedido100,
        inconsistencia,
        motivosInconsistencia: inconsistencia === 'sim' ? motivos : [],
        observacoes: observacoes || undefined
      });
      
      setSucesso('Conferência registrada com sucesso!');
      await carregarPedidos();
      handleFecharModal();
    } catch (error) {
      console.error('Erro ao salvar conferência:', error);
      setErro('Erro ao salvar a conferência. Tente novamente.');
    }
  };
  
  // Manipuladores de paginação
  const handleMudarPagina = (event: unknown, novaPagina: number) => {
    setPagina(novaPagina);
  };

  const handleMudarLinhasPorPagina = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinhasPorPagina(parseInt(event.target.value, 10));
    setPagina(0);
  };
  
  // Fechar notificações
  const handleFecharNotificacao = () => {
    setErro(null);
    setSucesso(null);
  };
  
  // Dados para a tabela paginada
  const pedidosPaginados = pedidos.slice(
    pagina * linhasPorPagina,
    (pagina + 1) * linhasPorPagina
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Notificações */}
      <Snackbar 
        open={!!erro} 
        autoHideDuration={6000} 
        onClose={handleFecharNotificacao}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleFecharNotificacao} severity="error" sx={{ width: '100%' }}>
          {erro}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!sucesso} 
        autoHideDuration={6000} 
        onClose={handleFecharNotificacao}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleFecharNotificacao} severity="success" sx={{ width: '100%' }}>
          {sucesso}
        </Alert>
      </Snackbar>

      {/* Título e Filtros */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Controle de Conferência de Pedidos
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Data Inicial"
            type="date"
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value ? new Date(e.target.value) : null})}
          />
          <TextField
            label="Data Final"
            type="date"
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            onChange={(e) => setFiltros({...filtros, dataFim: e.target.value ? new Date(e.target.value) : null})}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filtros.status}
              label="Status"
              onChange={(e) => setFiltros({...filtros, status: e.target.value as any})}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="com-inconsistencia">Com Inconsistência</MenuItem>
              <MenuItem value="sem-inconsistencia">Sem Inconsistência</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Tabela de Pedidos */}
      <Paper sx={{ width: '100%', overflow: 'hidden', mb: 2 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nº Pedido</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Transportadora</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : pedidosPaginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                pedidosPaginados.map((pedido) => (
                  <TableRow key={pedido.id} hover>
                    <TableCell>{pedido.numeroPedido}</TableCell>
                    <TableCell>
                      {format(new Date(pedido.dataCriacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{pedido.controle?.motorista || '-'}</TableCell>
                    <TableCell>{pedido.controle?.responsavel || '-'}</TableCell>
                    <TableCell>{pedido.controle?.transportadora || '-'}</TableCell>
                    <TableCell>
                      {pedido.conferido ? (
                        <Chip 
                          label={pedido.conferido.inconsistencia ? 'Com Inconsistência' : 'Conferido'}
                          color={pedido.conferido.inconsistencia ? 'error' : 'success'}
                          size="small"
                        />
                      ) : (
                        <Chip label="Pendente" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        variant="contained" 
                        size="small"
                        color={pedido.conferido ? 'info' : 'primary'}
                        onClick={() => handleAbrirModal(pedido)}
                      >
                        {pedido.conferido ? 'Ver Detalhes' : 'Registrar Conferência'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={pedidos.length}
          rowsPerPage={linhasPorPagina}
          page={pagina}
          onPageChange={handleMudarPagina}
          onRowsPerPageChange={handleMudarLinhasPorPagina}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Modal de Conferência */}
      <Dialog open={modalAberto} onClose={handleFecharModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {pedidoSelecionado?.conferido ? 'Detalhes da Conferência' : 'Registrar Conferência'}
        </DialogTitle>
        <DialogContent>
          {pedidoSelecionado && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Pedido:</strong> {pedidoSelecionado.numeroPedido}
                  </Typography>
                  {pedidoSelecionado.controle && (
                    <>
                      <Typography variant="body2">
                        <strong>Motorista:</strong> {pedidoSelecionado.controle.motorista}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Responsável:</strong> {pedidoSelecionado.controle.responsavel}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Transportadora:</strong> {pedidoSelecionado.controle.transportadora}
                      </Typography>
                    </>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Pedido 100%</InputLabel>
                    <Select
                      value={pedido100}
                      label="Pedido 100%"
                      onChange={(e) => setPedido100(e.target.value)}
                      disabled={!!pedidoSelecionado.conferido}
                    >
                      <MenuItem value="sim">Sim</MenuItem>
                      <MenuItem value="nao">Não</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Inconsistência</InputLabel>
                    <Select
                      value={inconsistencia}
                      label="Inconsistência"
                      onChange={(e) => setInconsistencia(e.target.value)}
                      disabled={!!pedidoSelecionado.conferido}
                    >
                      <MenuItem value="sim">Sim</MenuItem>
                      <MenuItem value="nao">Não</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {inconsistencia === 'sim' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Motivos da Inconsistência</InputLabel>
                      <Select
                        multiple
                        value={motivos}
                        onChange={handleMotivoChange}
                        input={<OutlinedInput label="Motivos da Inconsistência" />}
                        renderValue={(selected) => selected.join(', ')}
                        disabled={!!pedidoSelecionado.conferido}
                      >
                        {MOTIVOS_INCONSISTENCIA.map((motivo) => (
                          <MenuItem key={motivo} value={motivo}>
                            <Checkbox checked={motivos.indexOf(motivo) > -1} />
                            <ListItemText primary={motivo} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    disabled={!!pedidoSelecionado.conferido}
                    margin="normal"
                  />
                </Grid>

                {pedidoSelecionado.conferido && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      <strong>Conferente:</strong> {pedidoSelecionado.conferido.conferente.nome}
                      <br />
                      <strong>Data da Conferência:</strong>{' '}
                      {format(new Date(pedidoSelecionado.conferido.dataCriacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleFecharModal} color="inherit">
            Fechar
          </Button>
          {!pedidoSelecionado?.conferido && (
            <Button 
              onClick={handleSalvarConferencia} 
              variant="contained" 
              color="primary"
              disabled={inconsistencia === 'sim' && motivos.length === 0}
            >
              Salvar Conferência
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PaginaConferenciaPedidos;
