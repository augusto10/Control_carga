import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Grid,
  Chip,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

// Função utilitária para parsing seguro de produtos
const parseProductList = (produtosString: string): string[] => {
  if (!produtosString) return [];
  
  try {
    // Tenta fazer o parse do JSON
    const produtos = JSON.parse(produtosString);
    if (Array.isArray(produtos)) {
      return produtos;
    }
  } catch (error) {
    // Se não for JSON válido, trata como string
    console.warn('Produtos não está em formato JSON válido:', produtosString);
  }
  
  // Fallback: trata como string simples ou lista separada por vírgula
  if (produtosString.includes(',')) {
    return produtosString.split(',').map(produto => produto.trim());
  } else {
    return [produtosString.trim()];
  }
};

interface AlertaValidadeItem {
  id: string;
  dataCriacao: string;
  dataRecebimento: string;
  nomeConferente: string;
  nomeFabricante: string;
  descricaoProduto: string;
  numeroLote: string;
  dataVencimento: string;
  nomeAutorizadorLider: string;
  produtosComAlertaValidade: string;
  criadoPorUser: {
    nome: string;
    email: string;
  };
}

const RelatorioValidadePage = () => {
  const [alertas, setAlertas] = useState<AlertaValidadeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlerta, setSelectedAlerta] = useState<AlertaValidadeItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filters, setFilters] = useState({
    autorizador: '',
    fabricante: '',
    dataInicio: '',
    dataFim: ''
  });
  const [stats, setStats] = useState({
    totalAlertas: 0,
    autorizadoresMaisAtivos: [] as { nome: string; total: number }[],
    fabricantesMaisProblematicos: [] as { nome: string; total: number }[]
  });
  const router = useRouter();
  const { user } = useAuth();

  const loadAlertas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Filtrar apenas checklists com alerta de validade
      params.append('alertaValidade', 'true');
      
      if (filters.autorizador) params.append('autorizador', filters.autorizador);
      if (filters.fabricante) params.append('fabricante', filters.fabricante);
      if (filters.dataInicio) params.append('dataInicio', filters.dataInicio);
      if (filters.dataFim) params.append('dataFim', filters.dataFim);

      const response = await fetch(`/api/checklist-recebimento?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar alertas');
      }

      const data = await response.json();
      setAlertas(data.checklists || []);
      
      // Calcular estatísticas
      calculateStats(data.checklists || []);
      
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AlertaValidadeItem[]) => {
    const totalAlertas = data.length;
    
    // Autorizadores mais ativos
    const autorizadores: { [key: string]: number } = {};
    data.forEach(item => {
      if (item.nomeAutorizadorLider) {
        autorizadores[item.nomeAutorizadorLider] = (autorizadores[item.nomeAutorizadorLider] || 0) + 1;
      }
    });
    
    const autorizadoresMaisAtivos = Object.entries(autorizadores)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Fabricantes mais problemáticos
    const fabricantes: { [key: string]: number } = {};
    data.forEach(item => {
      if (item.nomeFabricante) {
        fabricantes[item.nomeFabricante] = (fabricantes[item.nomeFabricante] || 0) + 1;
      }
    });
    
    const fabricantesMaisProblematicos = Object.entries(fabricantes)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    setStats({
      totalAlertas,
      autorizadoresMaisAtivos,
      fabricantesMaisProblematicos
    });
  };

  useEffect(() => {
    loadAlertas();
  }, []);

  // Aplicar filtros automaticamente com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAlertas();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const handleSearch = () => {
    loadAlertas();
  };

  const handleClearFilters = () => {
    setFilters({
      autorizador: '',
      fabricante: '',
      dataInicio: '',
      dataFim: ''
    });
  };

  const handleViewDetails = (alerta: AlertaValidadeItem) => {
    setSelectedAlerta(alerta);
    setDetailsOpen(true);
  };

  const exportToCSV = () => {
    const headers = [
      'Data Recebimento',
      'Conferente',
      'Fabricante',
      'Produto',
      'Lote',
      'Data Vencimento',
      'Autorizador',
      'Produtos com Problema'
    ];

    const rows = alertas.map(alerta => [
      new Date(alerta.dataRecebimento).toLocaleDateString('pt-BR'),
      alerta.nomeConferente,
      alerta.nomeFabricante,
      alerta.descricaoProduto,
      alerta.numeroLote,
      new Date(alerta.dataVencimento).toLocaleDateString('pt-BR'),
      alerta.nomeAutorizadorLider,
      alerta.produtosComAlertaValidade ? parseProductList(alerta.produtosComAlertaValidade).join('; ') : ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alertas-validade-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <ProtectedRoute>
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              Relatório de Alertas de Validade
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Produtos com validade inferior a 8 meses autorizados
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              disabled={alertas.length === 0}
            >
              Exportar CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={() => router.push('/checklist-recebimento/relatorios')}
            >
              Todos os Relatórios
            </Button>
          </Box>
        </Box>

        {/* Estatísticas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <WarningIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                <Typography variant="h3" color="warning.main">
                  {stats.totalAlertas}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Total de Alertas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  Top Autorizadores
                </Typography>
                {stats.autorizadoresMaisAtivos.slice(0, 3).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.nome}</Typography>
                    <Chip label={item.total} size="small" color="warning" />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon />
                  Fabricantes Problemáticos
                </Typography>
                {stats.fabricantesMaisProblematicos.slice(0, 3).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nome}
                    </Typography>
                    <Chip label={item.total} size="small" color="error" />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filtros */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtros de Pesquisa
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Autorizador"
                value={filters.autorizador}
                onChange={(e) => setFilters(prev => ({ ...prev, autorizador: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fabricante"
                value={filters.fabricante}
                onChange={(e) => setFilters(prev => ({ ...prev, fabricante: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                sx={{ height: 56 }}
              >
                Buscar
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                sx={{ height: 56 }}
              >
                Limpar Filtros
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabela de Alertas */}
        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Conferente</TableCell>
                  <TableCell>Fabricante</TableCell>
                  <TableCell>Produto</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Autorizador</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : alertas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Alert severity="info">
                        Nenhum alerta de validade encontrado
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  alertas.map((alerta) => (
                    <TableRow key={alerta.id}>
                      <TableCell>
                        {new Date(alerta.dataRecebimento).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{alerta.nomeConferente}</TableCell>
                      <TableCell>{alerta.nomeFabricante}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {alerta.descricaoProduto}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(alerta.dataVencimento).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<PersonIcon />}
                          label={alerta.nomeAutorizadorLider}
                          color="warning"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<WarningIcon />}
                          label="Autorizado"
                          color="warning"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleViewDetails(alerta)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Modal de Detalhes */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon color="warning" />
              Detalhes do Alerta de Validade
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedAlerta && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Produtos com validade inferior a 8 meses foram autorizados para prosseguir.</strong>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Autorizado por:</strong> {selectedAlerta.nomeAutorizadorLider}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Data:</strong> {new Date(selectedAlerta.dataRecebimento).toLocaleDateString('pt-BR')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Conferente:</strong> {selectedAlerta.nomeConferente}
                  </Typography>
                </Alert>

                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Informações do Produto
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Fabricante</Typography>
                        <Typography variant="body1">{selectedAlerta.nomeFabricante}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Produto</Typography>
                        <Typography variant="body1">{selectedAlerta.descricaoProduto}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Lote</Typography>
                        <Typography variant="body1">{selectedAlerta.numeroLote}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Vencimento</Typography>
                        <Typography variant="body1">
                          {new Date(selectedAlerta.dataVencimento).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {selectedAlerta.produtosComAlertaValidade && (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Produtos com Problema de Validade
                      </Typography>
                      {parseProductList(selectedAlerta.produtosComAlertaValidade).map((produto: string, index: number) => (
                        <Typography key={index} variant="body2" sx={{ ml: 2, mb: 1 }}>
                          • {produto}
                        </Typography>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  );
};

export default RelatorioValidadePage;
