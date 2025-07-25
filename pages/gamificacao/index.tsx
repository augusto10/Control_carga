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
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';

interface RankingUsuario {
  id: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  };
  pontuacaoTotal: number;
  pedidosCorretos: number;
  pedidosIncorretos: number;
  posicaoRanking: number;
}

interface HistoricoPontuacao {
  id: string;
  usuario: {
    id: string;
    nome: string;
  };
  acao: string;
  pontosGanhos: number;
  descricao: string;
  dataAcao: string;
}

export default function GamificacaoPage() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingUsuario[]>([]);
  const [historico, setHistorico] = useState<HistoricoPontuacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrarDialog, setRegistrarDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    usuarioId: '',
    pedidoId: '',
    acao: 'PEDIDO_CORRETO',
    pontos: 10,
    descricao: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [rankingResponse, historicoResponse] = await Promise.all([
        api.get('/api/gamificacao/ranking'),
        api.get('/api/gamificacao/historico')
      ]);

      setRanking(rankingResponse.data.ranking);
      setHistorico(historicoResponse.data.historico);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarPontuacao = async () => {
    try {
      const response = await api.post('/api/gamificacao/registrar-pontuacao', formData);
      if (response.data.success) {
        setSnackbar({ open: true, message: 'Pontuação registrada com sucesso!', severity: 'success' });
        setRegistrarDialog(false);
        carregarDados();
        setFormData({
          usuarioId: '',
          pedidoId: '',
          acao: 'PEDIDO_CORRETO',
          pontos: 10,
          descricao: ''
        });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao registrar pontuação', severity: 'error' });
    }
  };

  const getCorPontuacao = (pontos: number) => {
    return pontos > 0 ? 'success' : pontos < 0 ? 'error' : 'default';
  };

  const getIconeAcao = (acao: string) => {
    switch (acao) {
      case 'PEDIDO_CORRETO':
        return <TrendingUpIcon color="success" />;
      case 'PEDIDO_INCORRETO':
        return <TrendingDownIcon color="error" />;
      default:
        return <HistoryIcon />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Typography>Carregando...</Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Gamificação - Ranking de Separadores e Conferentes
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setRegistrarDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            Registrar Pontuação
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Ranking Principal */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmojiEventsIcon sx={{ mr: 2, color: 'gold', fontSize: 32 }} />
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
                      <TableCell align="center">Pontuação</TableCell>
                      <TableCell align="center">Pedidos Corretos</TableCell>
                      <TableCell align="center">Pedidos Incorretos</TableCell>
                      <TableCell align="center">Taxa de Acerto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ranking.map((usuario, index) => (
                      <TableRow key={usuario.id} hover>
                        <TableCell>
                          <Chip
                            label={`#${usuario.posicaoRanking || index + 1}`}
                            color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {usuario.usuario.nome.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight="bold">
                                {usuario.usuario.nome}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {usuario.usuario.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={usuario.pontuacaoTotal}
                            color="primary"
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={usuario.pedidosCorretos}
                            color="success"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={usuario.pedidosIncorretos}
                            color="error"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {usuario.pedidosCorretos + usuario.pedidosIncorretos > 0
                              ? Math.round((usuario.pedidosCorretos / (usuario.pedidosCorretos + usuario.pedidosIncorretos)) * 100)
                              : 0}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Histórico de Atividades */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HistoryIcon sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Últimas Atividades
                </Typography>
              </Box>

              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {historico.map((item) => (
                  <Card key={item.id} sx={{ mb: 2, boxShadow: 1 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getIconeAcao(item.acao)}
                        <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
                          {item.usuario.nome}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {item.descricao}
                      </Typography>
                      <Chip
                        label={`${item.pontosGanhos > 0 ? '+' : ''}${item.pontosGanhos} pts`}
                        color={getCorPontuacao(item.pontosGanhos) as any}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Dialog de Registro */}
        <Dialog open={registrarDialog} onClose={() => setRegistrarDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Registrar Pontuação</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Tipo de Ação</InputLabel>
                <Select
                  value={formData.acao}
                  onChange={(e) => setFormData({ ...formData, acao: e.target.value })}
                >
                  <MenuItem value="PEDIDO_CORRETO">Pedido Correto (+)</MenuItem>
                  <MenuItem value="PEDIDO_INCORRETO">Pedido Incorreto (-)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="ID do Pedido"
                value={formData.pedidoId}
                onChange={(e) => setFormData({ ...formData, pedidoId: e.target.value })}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="ID do Usuário"
                value={formData.usuarioId}
                onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Pontos"
                type="number"
                value={formData.pontos}
                onChange={(e) => setFormData({ ...formData, pontos: parseInt(e.target.value) })}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRegistrarDialog(false)}>Cancelar</Button>
            <Button onClick={handleRegistrarPontuacao} variant="contained">
              Registrar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  );
}

export default GamificacaoPage;
