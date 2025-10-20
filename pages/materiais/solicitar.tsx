import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  MenuItem,
  Alert,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  ShoppingCart as ShoppingCartIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Material {
  id: string;
  nome: string;
  descricao?: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  ativo: boolean;
}

interface ItemSolicitacao {
  materialId: string;
  materialNome: string;
  unidadeMedida: string;
  quantidade: number;
  observacao: string;
}

interface Solicitacao {
  id: string;
  dataCriacao: string;
  status: string;
  observacao?: string;
  dataAprovacao?: string;
  aprovador?: { nome: string };
  motivoRejeicao?: string;
  itens: Array<{
    material: Material;
    quantidade: number;
    quantidadeAprovada?: number;
  }>;
}

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  PENDENTE: 'warning',
  APROVADA: 'success',
  REJEITADA: 'error',
  ENTREGUE: 'default'
};

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ENTREGUE: 'Entregue'
};

export default function SolicitarMaterial() {
  const { enqueueSnackbar } = useSnackbar();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<ItemSolicitacao[]>([]);
  const [observacao, setObservacao] = useState('');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Novo item
  const [materialSelecionado, setMaterialSelecionado] = useState<Material | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacaoItem, setObservacaoItem] = useState('');

  useEffect(() => {
    carregarMateriais();
    carregarMinhasSolicitacoes();
  }, []);

  const carregarMateriais = async () => {
    try {
      const response = await api.get('/api/materiais', {
        params: { ativo: true }
      });
      setMateriais(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao carregar materiais', { variant: 'error' });
    }
  };

  const carregarMinhasSolicitacoes = async () => {
    try {
      const response = await api.get('/api/solicitacoes-material', {
        params: { minhas: true }
      });
      setSolicitacoes(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao carregar solicitações', { variant: 'error' });
    }
  };

  const handleAdicionarItem = () => {
    if (!materialSelecionado) {
      enqueueSnackbar('Selecione um material', { variant: 'warning' });
      return;
    }

    if (quantidade <= 0) {
      enqueueSnackbar('Quantidade deve ser maior que zero', { variant: 'warning' });
      return;
    }

    // Verificar se já existe
    if (itens.some(item => item.materialId === materialSelecionado.id)) {
      enqueueSnackbar('Material já adicionado', { variant: 'warning' });
      return;
    }

    setItens([
      ...itens,
      {
        materialId: materialSelecionado.id,
        materialNome: materialSelecionado.nome,
        unidadeMedida: materialSelecionado.unidadeMedida,
        quantidade,
        observacao: observacaoItem
      }
    ]);

    // Limpar campos
    setMaterialSelecionado(null);
    setQuantidade(1);
    setObservacaoItem('');
  };

  const handleRemoverItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleEnviarSolicitacao = async () => {
    if (itens.length === 0) {
      enqueueSnackbar('Adicione pelo menos um item', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/solicitacoes-material', {
        observacao,
        itens: itens.map(item => ({
          materialId: item.materialId,
          quantidade: item.quantidade,
          observacao: item.observacao || null
        }))
      });

      enqueueSnackbar('Solicitação enviada com sucesso!', { variant: 'success' });
      
      // Limpar formulário
      setItens([]);
      setObservacao('');
      
      // Recarregar solicitações
      carregarMinhasSolicitacoes();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao enviar solicitação', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ShoppingCartIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Solicitar Materiais
            </Typography>
          </Box>
          <Button
            variant={mostrarHistorico ? 'contained' : 'outlined'}
            startIcon={<HistoryIcon />}
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
          >
            {mostrarHistorico ? 'Nova Solicitação' : 'Minhas Solicitações'}
          </Button>
        </Box>

        {!mostrarHistorico ? (
          <>
            {/* Formulário de Nova Solicitação */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Adicionar Itens
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={materiais}
                      getOptionLabel={(option) => `${option.nome} (${option.quantidadeEstoque} ${option.unidadeMedida})`}
                      value={materialSelecionado}
                      onChange={(_, newValue) => setMaterialSelecionado(newValue)}
                      renderInput={(params) => (
                        <TextField {...params} label="Material" fullWidth />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantidade"
                      value={quantidade}
                      onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Observação (opcional)"
                      value={observacaoItem}
                      onChange={(e) => setObservacaoItem(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAdicionarItem}
                      disabled={loading}
                    >
                      Adicionar
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Lista de Itens */}
            {itens.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Itens da Solicitação
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Material</strong></TableCell>
                          <TableCell align="center"><strong>Quantidade</strong></TableCell>
                          <TableCell><strong>Observação</strong></TableCell>
                          <TableCell align="center"><strong>Ações</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {itens.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.materialNome}</TableCell>
                            <TableCell align="center">
                              {item.quantidade} {item.unidadeMedida}
                            </TableCell>
                            <TableCell>{item.observacao || '-'}</TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoverItem(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Observação Geral (opcional)"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                    />
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<SendIcon />}
                      onClick={handleEnviarSolicitacao}
                      disabled={loading}
                    >
                      Enviar Solicitação
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* Histórico de Solicitações */
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Minhas Solicitações
              </Typography>
              {solicitacoes.length === 0 ? (
                <Alert severity="info">
                  Você ainda não fez nenhuma solicitação.
                </Alert>
              ) : (
                solicitacoes.map((solicitacao) => (
                  <Card key={solicitacao.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">
                          <strong>Solicitação #{solicitacao.id.slice(0, 8)}</strong>
                        </Typography>
                        <Chip
                          label={statusLabels[solicitacao.status]}
                          color={statusColors[solicitacao.status]}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Data: {format(new Date(solicitacao.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </Typography>

                      {solicitacao.observacao && (
                        <Typography variant="body2" gutterBottom>
                          <strong>Observação:</strong> {solicitacao.observacao}
                        </Typography>
                      )}

                      <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Material</strong></TableCell>
                              <TableCell align="center"><strong>Solicitado</strong></TableCell>
                              {solicitacao.status === 'APROVADA' && (
                                <TableCell align="center"><strong>Aprovado</strong></TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {solicitacao.itens.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.material.nome}</TableCell>
                                <TableCell align="center">
                                  {item.quantidade} {item.material.unidadeMedida}
                                </TableCell>
                                {solicitacao.status === 'APROVADA' && (
                                  <TableCell align="center">
                                    {item.quantidadeAprovada || item.quantidade} {item.material.unidadeMedida}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {solicitacao.status === 'APROVADA' && solicitacao.aprovador && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          Aprovado por: {solicitacao.aprovador.nome} em{' '}
                          {format(new Date(solicitacao.dataAprovacao!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </Typography>
                      )}

                      {solicitacao.status === 'REJEITADA' && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          <strong>Motivo da rejeição:</strong> {solicitacao.motivoRejeicao}
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Layout>
  );
}
