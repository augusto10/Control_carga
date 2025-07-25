import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import { EmojiEvents, TrendingUp, Assessment } from '@mui/icons-material';
import api from '../../services/api';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
}

interface RankingItem {
  id: string;
  usuarioId: string;
  pontuacaoTotal: number;
  pedidosCorretos: number;
  pedidosIncorretos: number;
  posicaoRanking: number;
  usuario: Usuario;
}

function RankingPage() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarRanking();
  }, []);

  const carregarRanking = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/gamificacao/ranking');
      setRanking(response.data.ranking || []);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      setError('Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  };

  const getCorPosicao = (posicao: number) => {
    if (posicao === 1) return '#FFD700'; // Ouro
    if (posicao === 2) return '#C0C0C0'; // Prata
    if (posicao === 3) return '#CD7F32'; // Bronze
    return '#E0E0E0'; // Padrão
  };

  const calcularTaxaAcerto = (corretos: number, incorretos: number) => {
    const total = corretos + incorretos;
    if (total === 0) return 0;
    return Math.round((corretos / total) * 100);
  };

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
            <EmojiEvents sx={{ fontSize: 40, color: '#FFD700' }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Ranking de Gamificação
            </Typography>
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            Classificação geral dos separadores e conferentes por pontuação
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3}>
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <Assessment />
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Ranking Geral
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Posição</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell align="center">Pontuação Total</TableCell>
                    <TableCell align="center">Pedidos Corretos</TableCell>
                    <TableCell align="center">Pedidos Incorretos</TableCell>
                    <TableCell align="center">Taxa de Acerto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ranking.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar
                            sx={{
                              bgcolor: getCorPosicao(item.posicaoRanking || 0),
                              color: 'white',
                              width: 32,
                              height: 32,
                              fontSize: '0.875rem'
                            }}
                          >
                            {item.posicaoRanking}
                          </Avatar>
                          {item.posicaoRanking <= 3 && (
                            <EmojiEvents sx={{ color: getCorPosicao(item.posicaoRanking) }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {item.usuario.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.usuario.tipo}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${item.pontuacaoTotal} pts`}
                          color={item.pontuacaoTotal > 0 ? 'success' : item.pontuacaoTotal < 0 ? 'error' : 'default'}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                          <TrendingUp sx={{ color: 'green', fontSize: 16 }} />
                          <Typography variant="body2" color="green" fontWeight="bold">
                            {item.pedidosCorretos}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="error" fontWeight="bold">
                          {item.pedidosIncorretos}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${calcularTaxaAcerto(item.pedidosCorretos, item.pedidosIncorretos)}%`}
                          color={
                            calcularTaxaAcerto(item.pedidosCorretos, item.pedidosIncorretos) >= 90
                              ? 'success'
                              : calcularTaxaAcerto(item.pedidosCorretos, item.pedidosIncorretos) >= 70
                              ? 'warning'
                              : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {ranking.length === 0 && !loading && (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  Nenhum dado de ranking disponível ainda.
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}

export default RankingPage;
