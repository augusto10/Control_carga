import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination
} from '@mui/material';
import { History, TrendingUp, TrendingDown, Person, CalendarToday } from '@mui/icons-material';
import api from '../../services/api';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
}

interface HistoricoItem {
  id: string;
  usuarioId: string;
  pedidoId: string | null;
  acao: string;
  pontosGanhos: number;
  descricao: string | null;
  dataAcao: string;
  usuario: Usuario;
}

function HistoricoPage() {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filtroUsuario) params.usuarioId = filtroUsuario;
      if (filtroAcao) params.acao = filtroAcao;
      
      const response = await api.get('/api/gamificacao/historico', { params });
      setHistorico(response.data.historico || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setError('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const getCorPontuacao = (pontos: number) => {
    if (pontos > 0) return 'success';
    if (pontos < 0) return 'error';
    return 'default';
  };

  const getIconePontuacao = (pontos: number) => {
    if (pontos > 0) return <TrendingUp />;
    if (pontos < 0) return <TrendingDown />;
    return null;
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const formatarAcao = (acao: string) => {
    const acoes: { [key: string]: string } = {
      'PEDIDO_CORRETO': 'Pedido Correto',
      'PEDIDO_INCORRETO': 'Pedido Incorreto',
      'BONUS_ADMIN': 'Bônus Admin',
      'PENALIDADE_ADMIN': 'Penalidade Admin'
    };
    return acoes[acao] || acao;
  };

  // Filtrar e paginar dados
  const historicoFiltrado = historico.filter(item => {
    const matchUsuario = !filtroUsuario || item.usuario.nome.toLowerCase().includes(filtroUsuario.toLowerCase());
    const matchAcao = !filtroAcao || item.acao === filtroAcao;
    return matchUsuario && matchAcao;
  });

  const totalPages = Math.ceil(historicoFiltrado.length / itemsPerPage);
  const historicoAtual = historicoFiltrado.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <History sx={{ fontSize: 40, color: '#1976d2' }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Histórico de Pontuações
            </Typography>
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            Histórico detalhado de todas as ações de pontuação do sistema
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Filtros */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Filtrar por usuário"
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                placeholder="Digite o nome do usuário..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Ação</InputLabel>
                <Select
                  value={filtroAcao}
                  onChange={(e) => setFiltroAcao(e.target.value)}
                  label="Tipo de Ação"
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="PEDIDO_CORRETO">Pedido Correto</MenuItem>
                  <MenuItem value="PEDIDO_INCORRETO">Pedido Incorreto</MenuItem>
                  <MenuItem value="BONUS_ADMIN">Bônus Admin</MenuItem>
                  <MenuItem value="PENALIDADE_ADMIN">Penalidade Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {historicoFiltrado.length} registro(s) encontrado(s)
            </Typography>
          </Box>
        </Paper>

        {/* Lista do Histórico */}
        <Paper elevation={3}>
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <CalendarToday />
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Atividades Recentes
              </Typography>
            </Box>

            {historicoAtual.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  Nenhum registro encontrado com os filtros aplicados.
                </Typography>
              </Box>
            ) : (
              <Box>
                {historicoAtual.map((item) => (
                  <Card key={item.id} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box display="flex" alignItems="center" gap={2} flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Person sx={{ color: 'text.secondary' }} />
                            <Typography variant="subtitle1" fontWeight="bold">
                              {item.usuario.nome}
                            </Typography>
                            <Chip
                              label={item.usuario.tipo}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getIconePontuacao(item.pontosGanhos)}
                          <Chip
                            label={`${item.pontosGanhos > 0 ? '+' : ''}${item.pontosGanhos} pts`}
                            color={getCorPontuacao(item.pontosGanhos) as any}
                            size="small"
                          />
                        </Box>
                      </Box>
                      
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Ação:</strong> {formatarAcao(item.acao)}
                        </Typography>
                        {item.descricao && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Descrição:</strong> {item.descricao}
                          </Typography>
                        )}
                        {item.pedidoId && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Pedido:</strong> {item.pedidoId}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatarData(item.dataAcao)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}

                {/* Paginação */}
                {totalPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={3}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, newPage) => setPage(newPage)}
                      color="primary"
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}

export default HistoricoPage;
