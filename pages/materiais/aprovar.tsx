import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Assignment as AssignmentIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Material {
  id: string;
  nome: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
}

interface ItemSolicitacao {
  id: string;
  materialId: string;
  material: Material;
  quantidade: number;
  quantidadeAprovada?: number;
  observacao?: string;
}

interface Solicitacao {
  id: string;
  dataCriacao: string;
  status: string;
  observacao?: string;
  dataAprovacao?: string;
  solicitante: { id: string; nome: string; email: string };
  aprovador?: { nome: string };
  motivoRejeicao?: string;
  itens: ItemSolicitacao[];
}

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  PENDENTE: 'warning',
  APROVADA: 'success',
  REJEITADA: 'error',
  ENTREGUE: 'default'
};

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'APROVADA',  // Em maiúsculo para destacar
  REJEITADA: 'Rejeitada',
  ENTREGUE: 'Entregue'
};

export default function AprovarSolicitacoes() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabAtual, setTabAtual] = useState(0);
  
  // Dialog de aprovação
  const [dialogAprovarAberto, setDialogAprovarAberto] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<Solicitacao | null>(null);
  const [quantidadesAprovadas, setQuantidadesAprovadas] = useState<Record<string, number>>({});

  // Dialog de rejeição
  const [dialogRejeitarAberto, setDialogRejeitarAberto] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // Dialog de exclusão
  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false);

  useEffect(() => {
    carregarSolicitacoes();
  }, [tabAtual]);

  const carregarSolicitacoes = async () => {
    try {
      setLoading(true);
      const status = tabAtual === 0 ? 'PENDENTE' : undefined;
      const response = await api.get('/api/solicitacoes-material', {
        params: { status }
      });
      setSolicitacoes(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao carregar solicitações', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirDialogAprovar = (solicitacao: Solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    
    // Inicializar quantidades aprovadas com as quantidades solicitadas
    const quantidades: Record<string, number> = {};
    solicitacao.itens.forEach(item => {
      quantidades[item.id] = item.quantidade;
    });
    setQuantidadesAprovadas(quantidades);
    
    setDialogAprovarAberto(true);
  };

  const handleAbrirDialogRejeitar = (solicitacao: Solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setMotivoRejeicao('');
    setDialogRejeitarAberto(true);
  };

  const handleAbrirDialogExcluir = (solicitacao: Solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setDialogExcluirAberto(true);
  };

  const handleAprovar = async () => {
    if (!solicitacaoSelecionada) return;

    try {
      setLoading(true);
      
      const itensAprovados = solicitacaoSelecionada.itens.map(item => ({
        itemId: item.id,
        quantidadeAprovada: quantidadesAprovadas[item.id]
      }));

      await api.post(`/api/solicitacoes-material/${solicitacaoSelecionada.id}/aprovar`, {
        itensAprovados
      });

      enqueueSnackbar('Solicitação aprovada com sucesso!', { variant: 'success' });
      setDialogAprovarAberto(false);
      setSolicitacaoSelecionada(null);
      carregarSolicitacoes();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao aprovar solicitação', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitar = async () => {
    if (!solicitacaoSelecionada) return;

    if (!motivoRejeicao.trim()) {
      enqueueSnackbar('Informe o motivo da rejeição', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      
      await api.post(`/api/solicitacoes-material/${solicitacaoSelecionada.id}/rejeitar`, {
        motivoRejeicao
      });

      enqueueSnackbar('Solicitação rejeitada', { variant: 'info' });
      setDialogRejeitarAberto(false);
      setSolicitacaoSelecionada(null);
      setMotivoRejeicao('');
      carregarSolicitacoes();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao rejeitar solicitação', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async () => {
    if (!solicitacaoSelecionada) return;

    try {
      setLoading(true);

      await api.delete(`/api/solicitacoes-material/${solicitacaoSelecionada.id}`);

      enqueueSnackbar('Solicitação excluída com sucesso!', { variant: 'success' });
      setDialogExcluirAberto(false);
      setSolicitacaoSelecionada(null);
      carregarSolicitacoes();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao excluir solicitação', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const solicitacoesFiltradas = tabAtual === 0
    ? solicitacoes.filter(s => s.status === 'PENDENTE')
    : solicitacoes;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Aprovar Solicitações
          </Typography>
        </Box>

        <Card>
          <Tabs value={tabAtual} onChange={(_, newValue) => setTabAtual(newValue)}>
            <Tab label="Pendentes" />
            <Tab label="Todas" />
          </Tabs>

          <CardContent>
            {solicitacoesFiltradas.length === 0 ? (
              <Alert severity="info">
                {tabAtual === 0 ? 'Nenhuma solicitação pendente' : 'Nenhuma solicitação encontrada'}
              </Alert>
            ) : (
              solicitacoesFiltradas.map((solicitacao) => (
                <Card key={solicitacao.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1">
                          <strong>Solicitação #{solicitacao.id.slice(0, 8)}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Solicitante: {solicitacao.solicitante.nome}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Data: {format(new Date(solicitacao.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </Typography>
                      </Box>
                      <Chip
                        label={statusLabels[solicitacao.status]}
                        color={statusColors[solicitacao.status]}
                        icon={solicitacao.status === 'APROVADA' ? <CheckIcon /> : undefined}
                        sx={{
                          fontWeight: solicitacao.status === 'APROVADA' ? 'bold' : 'normal',
                          fontSize: solicitacao.status === 'APROVADA' ? '0.875rem' : '0.8125rem'
                        }}
                      />
                    </Box>

                    {solicitacao.observacao && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>Observação:</strong> {solicitacao.observacao}
                      </Alert>
                    )}

                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Material</strong></TableCell>
                            <TableCell align="center"><strong>Quantidade</strong></TableCell>
                            <TableCell align="center"><strong>Estoque Atual</strong></TableCell>
                            <TableCell align="center"><strong>Status</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {solicitacao.itens.map((item) => {
                            const estoqueInsuficiente = item.material.quantidadeEstoque < item.quantidade;
                            return (
                              <TableRow key={item.id}>
                                <TableCell>{item.material.nome}</TableCell>
                                <TableCell align="center">
                                  {item.quantidade} {item.material.unidadeMedida}
                                </TableCell>
                                <TableCell 
                                  align="center"
                                  sx={{ 
                                    color: estoqueInsuficiente ? 'error.main' : 'inherit',
                                    fontWeight: estoqueInsuficiente ? 'bold' : 'normal'
                                  }}
                                >
                                  {item.material.quantidadeEstoque} {item.material.unidadeMedida}
                                </TableCell>
                                <TableCell align="center">
                                  {estoqueInsuficiente ? (
                                    <Chip label="Estoque Insuficiente" color="error" size="small" />
                                  ) : (
                                    <Chip label="Disponível" color="success" size="small" />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                      {user?.tipo === 'ADMIN' && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleAbrirDialogExcluir(solicitacao)}
                          disabled={loading}
                        >
                          Excluir
                        </Button>
                      )}

                      {solicitacao.status === 'PENDENTE' && (
                        <>
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleAbrirDialogRejeitar(solicitacao)}
                            disabled={loading}
                          >
                            Rejeitar
                          </Button>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<CheckIcon />}
                            onClick={() => handleAbrirDialogAprovar(solicitacao)}
                            disabled={loading}
                          >
                            Aprovar
                          </Button>
                        </>
                      )}
                    </Box>

                    {solicitacao.status === 'APROVADA' && solicitacao.aprovador && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
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

        {/* Dialog de Aprovação */}
        <Dialog open={dialogAprovarAberto} onClose={() => setDialogAprovarAberto(false)} maxWidth="md" fullWidth>
          <DialogTitle>Aprovar Solicitação</DialogTitle>
          <DialogContent>
            {solicitacaoSelecionada && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Você pode ajustar as quantidades aprovadas se necessário. O estoque será deduzido automaticamente.
                </Alert>
                
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Material</strong></TableCell>
                        <TableCell align="center"><strong>Solicitado</strong></TableCell>
                        <TableCell align="center"><strong>Estoque</strong></TableCell>
                        <TableCell align="center"><strong>Aprovar</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {solicitacaoSelecionada.itens.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.material.nome}</TableCell>
                          <TableCell align="center">
                            {item.quantidade} {item.material.unidadeMedida}
                          </TableCell>
                          <TableCell align="center">
                            {item.material.quantidadeEstoque} {item.material.unidadeMedida}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              value={quantidadesAprovadas[item.id] || 0}
                              onChange={(e) => setQuantidadesAprovadas({
                                ...quantidadesAprovadas,
                                [item.id]: parseInt(e.target.value) || 0
                              })}
                              inputProps={{ 
                                min: 0,
                                max: Math.min(item.quantidade, item.material.quantidadeEstoque)
                              }}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogAprovarAberto(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleAprovar} variant="contained" color="success" disabled={loading}>
              Confirmar Aprovação
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Rejeição */}
        <Dialog open={dialogRejeitarAberto} onClose={() => setDialogRejeitarAberto(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Rejeitar Solicitação</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Motivo da Rejeição *"
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogRejeitarAberto(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleRejeitar} variant="contained" color="error" disabled={loading}>
              Confirmar Rejeição
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Exclusão */}
        <Dialog open={dialogExcluirAberto} onClose={() => setDialogExcluirAberto(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Atenção:</strong> Esta ação não pode ser desfeita!
            </Alert>
            <Typography>
              Tem certeza que deseja excluir permanentemente a solicitação #{solicitacaoSelecionada?.id.slice(0, 8)}?
            </Typography>
            {solicitacaoSelecionada && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Solicitante: {solicitacaoSelecionada.solicitante.nome}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Data: {format(new Date(solicitacaoSelecionada.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Itens: {solicitacaoSelecionada.itens.length} material(is)
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogExcluirAberto(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleExcluir} variant="contained" color="error" disabled={loading}>
              {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
