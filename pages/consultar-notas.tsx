import { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import { Search, FilterList, Refresh } from '@mui/icons-material';
import { useStore } from '../store/store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatISO9075 } from 'date-fns/formatISO9075';


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
  
  const { notas, fetchNotas } = useStore();

  useEffect(() => {
    carregarNotas();
  }, [filtros]);

  const carregarNotas = async () => {
    setCarregando(true);
    try {
      await fetchNotas(
        filtros.dataInicio,
        filtros.dataFim
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
      // Filtro por número da nota
      if (filtros.numeroNota && !nota.numeroNota.includes(filtros.numeroNota)) {
        return false;
      }
      // Filtro por código
      if (filtros.codigo && !nota.codigo.includes(filtros.codigo)) {
        return false;
      }
      // Filtro por status
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Consulta de Notas Fiscais
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Consulte e filtre as notas fiscais cadastradas no sistema
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <TextField
            label="Número da Nota"
            size="small"
            value={filtros.numeroNota || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltros({ ...filtros, numeroNota: e.target.value })}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="Código"
            size="small"
            value={filtros.codigo || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltros({ ...filtros, codigo: e.target.value })}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="Data Início"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filtros.dataInicio || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltros({ ...filtros, dataInicio: e.target.value })}
          />
          <TextField
            label="Data Fim"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filtros.dataFim || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltros({ ...filtros, dataFim: e.target.value })}
          />
          <TextField
            select
            label="Status"
            size="small"
            value={filtros.status || 'TODAS'}
            onChange={(e: any) => {
              setFiltros({ ...filtros, status: e.target.value });
            }}
            sx={{ minWidth: 150 }}
            SelectProps={{ native: true }}
          >
            <option value="TODAS">Todas</option>
            <option value="DISPONIVEIS">Disponíveis</option>
            <option value="VINCULADAS">Vinculadas</option>
          </TextField>
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <Tooltip title="Limpar filtros">
              <IconButton 
                onClick={() => setFiltros({ status: 'TODAS' })}
                color="primary"
              >
                <FilterList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Atualizar">
              <IconButton 
                onClick={carregarNotas}
                color="primary"
                disabled={carregando}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ width: '100%', mb: 2 }} elevation={3}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Número da Nota</TableCell>
                <TableCell>Código</TableCell>
                <TableCell align="right">Volumes</TableCell>
                <TableCell>Data de Criação</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Controle</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : notasPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    Nenhuma nota encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                notasPaginadas.map((nota) => (
                  <TableRow key={nota.id} hover>
                    <TableCell>{nota.numeroNota}</TableCell>
                    <TableCell>{nota.codigo}</TableCell>
                    <TableCell align="right">
                      {nota.volumes || '1'}
                    </TableCell>
                    <TableCell>
                    {formatISO9075(new Date(nota.dataCriacao))}
                    </TableCell>
                    <TableCell>
                      {nota.controleId ? (
                        <Chip 
                          label="Vinculada" 
                          color="success" 
                          size="small" 
                        />
                      ) : (
                        <Chip 
                          label="Disponível" 
                          color="warning" 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {nota.controle ? (
                        <Tooltip 
                          title={
                            <>
                              <div>Nº: {nota.controle.numeroManifesto || 'N/A'}</div>
                              <div>Motorista: {nota.controle.motorista}</div>
                              <div>Responsável: {nota.controle.responsavel}</div>
                              <div>Transportadora: {nota.controle.transportadora}</div>
                              <div>Data: {new Date(nota.controle.dataCriacao).toLocaleString()}</div>
                            </>
                          }
                          arrow
                        >
                          <Chip 
                            label={`${nota.controle.numeroManifesto || nota.controle.id.substring(0, 8)}`} 
                            size="small"
                            variant="outlined"
                            sx={{ cursor: 'pointer' }}
                          />
                        </Tooltip>
                      ) : '-'}
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
          count={notasFiltradas.length}
          rowsPerPage={linhasPorPagina}
          page={pagina}
          onPageChange={handleMudarPagina}
          onRowsPerPageChange={handleMudarLinhasPorPagina}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </Paper>
    </Container>
  );
};

export default ConsultarNotas;
