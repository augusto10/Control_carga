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
  SelectChangeEvent
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

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

  // Dados paginados
  const conferenciasPaginadas = conferencias.slice(
    pagina * linhasPorPagina,
    (pagina + 1) * linhasPorPagina
  );

  return (
    <div>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          Lista de Conferências
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Data Inicial"
            type="date"
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
          />
          <TextField
            label="Data Final"
            type="date"
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filtroStatus}
              label="Status"
              onChange={(e) => setFiltroStatus(e.target.value as any)}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="com-inconsistencia">Com Inconsistência</MenuItem>
              <MenuItem value="sem-inconsistencia">Sem Inconsistência</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {erro && (
        <Typography color="error" sx={{ mb: 2 }}>
          {erro}
        </Typography>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden', mb: 2 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Nº Pedido</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Transportadora</TableCell>
                <TableCell>100%</TableCell>
                <TableCell>Inconsistência</TableCell>
                <TableCell>Conferente</TableCell>
                {podeEditar && <TableCell>Ações</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={podeEditar ? 9 : 8} align="center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : conferenciasPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={podeEditar ? 9 : 8} align="center">
                    Nenhuma conferência encontrada
                  </TableCell>
                </TableRow>
              ) : (
                conferenciasPaginadas.map((conferencia) => (
                  <TableRow key={conferencia.id} hover>
                    <TableCell>
                      {format(new Date(conferencia.dataCriacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{conferencia.pedido.numeroPedido}</TableCell>
                    <TableCell>{conferencia.pedido.controle?.motorista || '-'}</TableCell>
                    <TableCell>{conferencia.pedido.controle?.responsavel || '-'}</TableCell>
                    <TableCell>{conferencia.pedido.controle?.transportadora || '-'}</TableCell>
                    <TableCell>
                      {editando === conferencia.id ? (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={editPedido100}
                              onChange={(e) => setEditPedido100(e.target.checked)}
                            />
                          }
                          label={editPedido100 ? 'Sim' : 'Não'}
                        />
                      ) : (
                        <Chip 
                          label={conferencia.pedido100 ? 'Sim' : 'Não'} 
                          color={conferencia.pedido100 ? 'success' : 'default'} 
                          size="small" 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {editando === conferencia.id ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Inconsistência</InputLabel>
                          <Select
                            value={editInconsistencia ? 'sim' : 'nao'}
                            label="Inconsistência"
                            onChange={(e) => setEditInconsistencia(e.target.value === 'sim')}
                          >
                            <MenuItem value="sim">Sim</MenuItem>
                            <MenuItem value="nao">Não</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <Chip 
                          label={conferencia.inconsistencia ? 'Sim' : 'Não'} 
                          color={conferencia.inconsistencia ? 'error' : 'success'} 
                          size="small" 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {conferencia.conferente.nome}
                    </TableCell>
                    {podeEditar && (
                      <TableCell>
                        {editando === conferencia.id ? (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleSalvarEdicao(conferencia.id)}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="inherit"
                              onClick={handleCancelarEdicao}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <IconButton 
                            size="small" 
                            onClick={() => handleIniciarEdicao(conferencia)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={conferencias.length}
          rowsPerPage={linhasPorPagina}
          page={pagina}
          onPageChange={handleMudarPagina}
          onRowsPerPageChange={handleMudarLinhasPorPagina}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Modal para editar motivos e observações */}
      {editando && (
        <Dialog 
          open={!!editando} 
          onClose={handleCancelarEdicao}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Editar Detalhes da Conferência</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Motivos da Inconsistência</InputLabel>
                <Select
                  multiple
                  value={editMotivos}
                  onChange={handleMotivoChange}
                  input={<OutlinedInput label="Motivos da Inconsistência" />}
                  renderValue={(selected) => selected.join(', ')}
                  disabled={!editInconsistencia}
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
                multiline
                rows={3}
                label="Observações"
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                margin="normal"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelarEdicao} color="inherit">
              Cancelar
            </Button>
            <Button 
              onClick={() => editando && handleSalvarEdicao(editando)} 
              variant="contained" 
              color="primary"
              disabled={editInconsistencia && editMotivos.length === 0}
            >
              Salvar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
