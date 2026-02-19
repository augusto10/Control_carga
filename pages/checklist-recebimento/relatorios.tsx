import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Alert,
  Card,
  CardContent,
  Divider,
  alpha,
  useTheme
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Add as AddIcon,
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import ProtectedRoute from '../../components/ProtectedRoute';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface ChecklistItem {
  id: string;
  dataCriacao: string;
  dataRecebimento: string;
  horarioRecebimento: string;
  nomeConferente: string;
  nomeFabricante: string;
  descricaoProduto: string;
  numeroLote: string;
  dataFabricacao: string;
  dataVencimento: string;
  fotoRecebimento?: string;
  fotoDevolucao?: string;
  admProduto?: string;
  codigoBarrasCaixaMaster?: string;
  codigoBarrasCaixaInterna?: string;
  codigoBarrasItem?: string;
  recebimentoPocket: boolean;
  motivoNaoPocket?: string;
  possuiCodigoBarras: boolean;
  solicitouCadastroCodigoBarras: boolean;
  paraQuemSolicitou?: string;
  dadosLoteCadastradosSantri: boolean;
  condicaoEmbalagens: 'OTIMA' | 'BOA' | 'RUIM';
  houveRessalva: boolean;
  descricaoRessalva?: string;
  paraQuemInformouRessalva?: string;
  houveDevolucao: boolean;
  itensDevolvidos?: string;
  quantidadeDevolvida: number;
  fotoTiradaDevolucao: boolean;
  notaDevolucaoEmitida: boolean;
  numeroNotaDevolucao?: string;
  criadoPorUser: {
    id: string;
    nome: string;
    email: string;
  };
  // Novos campos de alerta de validade
  alertaValidadeAutorizado?: boolean;
  nomeAutorizadorLider?: string;
  produtosComAlertaValidade?: string; // JSON string
}

const RelatoriosChecklistPage = () => {
  const theme = useTheme();
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    conferente: '',
    fabricante: '',
    dataInicio: '',
    dataFim: ''
  });
  const router = useRouter();
  const { user } = useAuth();

  const loadChecklists = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.conferente && { conferente: filters.conferente }),
        ...(filters.fabricante && { fabricante: filters.fabricante }),
        ...(filters.dataInicio && { dataInicio: filters.dataInicio }),
        ...(filters.dataFim && { dataFim: filters.dataFim })
      });

      const response = await fetch(`/api/checklist-recebimento?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar checklists');
      }

      const data = await response.json();
      setChecklists(data.checklists);
      setTotalPages(data.pagination.pages);

    } catch (error) {
      console.error('Erro ao carregar checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    loadChecklists();
  };

  const handleClearFilters = () => {
    setFilters({
      conferente: '',
      fabricante: '',
      dataInicio: '',
      dataFim: ''
    });
  };

  // Aplicar filtros automaticamente com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      loadChecklists();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const handleViewDetails = (checklist: ChecklistItem) => {
    setSelectedChecklist(checklist);
    setDetailsOpen(true);
  };

  const getCondicaoColor = (condicao: string) => {
    switch (condicao) {
      case 'OTIMA': return 'success';
      case 'BOA': return 'warning';
      case 'RUIM': return 'error';
      default: return 'default';
    }
  };

  const getCondicaoIcon = (condicao: string) => {
    switch (condicao) {
      case 'OTIMA': return <CheckCircleIcon />;
      case 'BOA': return <WarningIcon />;
      case 'RUIM': return <ErrorIcon />;
      default: return <CheckCircleIcon />;
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Data Criação',
      'Data Recebimento',
      'Conferente',
      'Fabricante',
      'Produto',
      'Lote',
      'Vencimento',
      'Condição',
      'Pocket',
      'Ressalva',
      'Devolução'
    ];

    const csvData = checklists.map(item => [
      new Date(item.dataCriacao).toLocaleDateString('pt-BR'),
      new Date(item.dataRecebimento).toLocaleDateString('pt-BR'),
      item.nomeConferente,
      item.nomeFabricante,
      item.descricaoProduto,
      item.numeroLote,
      new Date(item.dataVencimento).toLocaleDateString('pt-BR'),
      item.condicaoEmbalagens,
      item.recebimentoPocket ? 'Sim' : 'Não',
      item.houveRessalva ? 'Sim' : 'Não',
      item.houveDevolucao ? 'Sim' : 'Não'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `checklists-recebimento-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <ProtectedRoute>
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              Relatórios de Checklist
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Recebimento de Produtos com Vencimento
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              disabled={checklists.length === 0}
            >
              Exportar CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/checklist-recebimento/regras-ouro')}
            >
              Novo Checklist
            </Button>
          </Box>
        </Box>

        {/* Filtros */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtros de Pesquisa
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Conferente"
                value={filters.conferente}
                onChange={(e) => setFilters(prev => ({ ...prev, conferente: e.target.value }))}
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

        {/* Tabela de Checklists */}
        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Conferente</TableCell>
                  <TableCell>Fabricante</TableCell>
                  <TableCell>Produto</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Condição</TableCell>
                  <TableCell>Alerta Validade</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : checklists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Alert 
                        severity="info"
                        variant="standard"
                        sx={{ 
                          borderRadius: '16px',
                          backdropFilter: 'blur(12px)',
                          backgroundColor: alpha(theme.palette.info.main, 0.15),
                          color: theme.palette.info.dark,
                          border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                          '& .MuiAlert-icon': {
                            color: theme.palette.info.main,
                          },
                          boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                          fontWeight: 600,
                          justifyContent: 'center'
                        }}
                      >
                        Nenhum checklist encontrado
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  checklists.map((checklist) => (
                    <TableRow key={checklist.id}>
                      <TableCell>
                        {new Date(checklist.dataRecebimento).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{checklist.nomeConferente}</TableCell>
                      <TableCell>{checklist.nomeFabricante}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {checklist.descricaoProduto}
                        </Typography>
                      </TableCell>
                      <TableCell>{checklist.numeroLote}</TableCell>
                      <TableCell>
                        {new Date(checklist.dataVencimento).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getCondicaoIcon(checklist.condicaoEmbalagens)}
                          label={checklist.condicaoEmbalagens}
                          color={getCondicaoColor(checklist.condicaoEmbalagens) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {checklist.alertaValidadeAutorizado ? (
                          <Chip
                            icon={<WarningIcon />}
                            label="Autorizado"
                            color="warning"
                            size="small"
                            title={`Autorizado por: ${checklist.nomeAutorizadorLider}`}
                          />
                        ) : (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="OK"
                            color="success"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {!checklist.recebimentoPocket && (
                            <Chip label="Sem Pocket" color="warning" size="small" />
                          )}
                          {checklist.houveRessalva && (
                            <Chip label="Ressalva" color="error" size="small" />
                          )}
                          {checklist.houveDevolucao && (
                            <Chip label="Devolução" color="info" size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleViewDetails(checklist)}
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

          {/* Paginação */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </Paper>

        {/* Modal de Detalhes */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Detalhes do Checklist
          </DialogTitle>
          <DialogContent>
            {selectedChecklist && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={3}>
                  {/* Dados Básicos */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Dados Básicos do Recebimento
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Data do Recebimento</Typography>
                            <Typography variant="body1">
                              {new Date(selectedChecklist.dataRecebimento).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Horário</Typography>
                            <Typography variant="body1">{selectedChecklist.horarioRecebimento}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Conferente</Typography>
                            <Typography variant="body1">{selectedChecklist.nomeConferente}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Fabricante</Typography>
                            <Typography variant="body1">{selectedChecklist.nomeFabricante}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Produto</Typography>
                            <Typography variant="body1">{selectedChecklist.descricaoProduto}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Lote</Typography>
                            <Typography variant="body1">{selectedChecklist.numeroLote}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Fabricação</Typography>
                            <Typography variant="body1">
                              {new Date(selectedChecklist.dataFabricacao).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Vencimento</Typography>
                            <Typography variant="body1">
                              {new Date(selectedChecklist.dataVencimento).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Códigos de Barras */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Códigos de Barras
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">ADM do Produto</Typography>
                            <Typography variant="body1">{selectedChecklist.admProduto || 'N/A'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Caixa Master</Typography>
                            <Typography variant="body1">{selectedChecklist.codigoBarrasCaixaMaster || 'N/A'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Caixa Interna</Typography>
                            <Typography variant="body1">{selectedChecklist.codigoBarrasCaixaInterna || 'N/A'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Item</Typography>
                            <Typography variant="body1">{selectedChecklist.codigoBarrasItem || 'N/A'}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Verificações */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Verificações
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Recebimento no Pocket</Typography>
                            <Chip 
                              label={selectedChecklist.recebimentoPocket ? 'Sim' : 'Não'} 
                              color={selectedChecklist.recebimentoPocket ? 'success' : 'error'}
                              size="small"
                            />
                            {!selectedChecklist.recebimentoPocket && selectedChecklist.motivoNaoPocket && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Motivo:</strong> {selectedChecklist.motivoNaoPocket}
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Possui Código de Barras</Typography>
                            <Chip 
                              label={selectedChecklist.possuiCodigoBarras ? 'Sim' : 'Não'} 
                              color={selectedChecklist.possuiCodigoBarras ? 'success' : 'warning'}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Dados no SANTRI</Typography>
                            <Chip 
                              label={selectedChecklist.dadosLoteCadastradosSantri ? 'Sim' : 'Não'} 
                              color={selectedChecklist.dadosLoteCadastradosSantri ? 'success' : 'error'}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Condição das Embalagens</Typography>
                            <Chip
                              icon={getCondicaoIcon(selectedChecklist.condicaoEmbalagens)}
                              label={selectedChecklist.condicaoEmbalagens}
                              color={getCondicaoColor(selectedChecklist.condicaoEmbalagens) as any}
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Alertas de Validade */}
                  {selectedChecklist.alertaValidadeAutorizado && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarningIcon color="warning" />
                            Alerta de Validade
                          </Typography>
                          <Alert 
                            severity="warning" 
                            variant="standard"
                            sx={{ 
                              mb: 2,
                              borderRadius: '16px',
                              backdropFilter: 'blur(12px)',
                              backgroundColor: alpha(theme.palette.warning.main, 0.15),
                              color: theme.palette.warning.dark,
                              border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                              '& .MuiAlert-icon': {
                                color: theme.palette.warning.main,
                              },
                              boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                              fontWeight: 600,
                            }}
                          >
                            <Typography variant="body1" gutterBottom>
                              <strong>Produtos com validade inferior a 8 meses foram autorizados para prosseguir.</strong>
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>Autorizado por:</strong> {selectedChecklist.nomeAutorizadorLider}
                            </Typography>
                            {selectedChecklist.produtosComAlertaValidade && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Produtos com problema:</strong>
                                </Typography>
                                {parseProductList(selectedChecklist.produtosComAlertaValidade).map((produto: string, index: number) => (
                                  <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                                    • {produto}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Alert>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* Ressalvas e Devoluções */}
                  {(selectedChecklist.houveRessalva || selectedChecklist.houveDevolucao) && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Ressalvas e Devoluções
                          </Typography>
                          
                          {selectedChecklist.houveRessalva && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">Ressalva</Typography>
                              <Typography variant="body1" sx={{ mb: 1 }}>
                                {selectedChecklist.descricaoRessalva}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Informado para:</strong> {selectedChecklist.paraQuemInformouRessalva}
                              </Typography>
                            </Box>
                          )}

                          {selectedChecklist.houveDevolucao && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Devolução</Typography>
                              <Typography variant="body1" sx={{ mb: 1 }}>
                                <strong>Itens:</strong> {selectedChecklist.itensDevolvidos}
                              </Typography>
                              <Typography variant="body1" sx={{ mb: 1 }}>
                                <strong>Quantidade:</strong> {selectedChecklist.quantidadeDevolvida}
                              </Typography>
                              {selectedChecklist.notaDevolucaoEmitida && (
                                <Typography variant="body1">
                                  <strong>Nota de Devolução:</strong> {selectedChecklist.numeroNotaDevolucao}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* Fotos */}
                  {(selectedChecklist.fotoRecebimento || selectedChecklist.fotoDevolucao) && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Fotos
                          </Typography>
                          <Grid container spacing={2}>
                            {selectedChecklist.fotoRecebimento && (
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Foto do Recebimento
                                </Typography>
                                <img
                                  src={selectedChecklist.fotoRecebimento}
                                  alt="Recebimento"
                                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                                />
                              </Grid>
                            )}
                            {selectedChecklist.fotoDevolucao && (
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Foto da Devolução
                                </Typography>
                                <img
                                  src={selectedChecklist.fotoDevolucao}
                                  alt="Devolução"
                                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                                />
                              </Grid>
                            )}
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
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

export default RelatoriosChecklistPage;
