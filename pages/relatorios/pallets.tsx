import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Chip
} from '@mui/material';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';

interface RelatorioPallets {
  motorista: string;
  transportadora: string;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  totalPalletsLiquido: number;
  totalControles: number;
}

interface ResumoTransportadora {
  transportadora: string;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  totalPalletsLiquido: number;
  totalControles: number;
  totalMotoristas: number;
}

const RelatorioPalletsPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<RelatorioPallets[]>([]);
  const [resumoTransportadoras, setResumoTransportadoras] = useState<ResumoTransportadora[]>([]);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState<Date | null>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | null>(endOfMonth(new Date()));
  const [transportadoraFiltro, setTransportadoraFiltro] = useState<string>('TODAS');
  const [motoristaFiltro, setMotoristaFiltro] = useState<string>('');

  const transportadoras = [
    { id: 'TODAS', nome: 'Todas as Transportadoras' },
    { id: 'ACERT', nome: 'ACCERT Transportes' },
    { id: 'EXPRESSO_GOIAS', nome: 'Expresso Goiás' },
    { id: 'TERCEIRIZADA', nome: 'Terceirizada' },
    { id: 'DETAFRA_TRANSPORTES', nome: 'Detafra Transportes' }
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    buscarDados();
  }, [user, router]);

  const buscarDados = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('dataInicio', format(dataInicio, 'yyyy-MM-dd'));
      if (dataFim) params.append('dataFim', format(dataFim, 'yyyy-MM-dd'));
      if (transportadoraFiltro && transportadoraFiltro !== 'TODAS') {
        params.append('transportadora', transportadoraFiltro);
      }
      if (motoristaFiltro.trim()) {
        params.append('motorista', motoristaFiltro.trim());
      }

      const response = await fetch(`/api/relatorios/pallets?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do relatório');
      }

      const resultado = await response.json();
      setDados(resultado.dados || []);
      setResumoTransportadoras(resultado.resumoTransportadoras || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    buscarDados();
  };

  const getNomeTransportadora = (id: string) => {
    const transportadora = transportadoras.find(t => t.id === id);
    return transportadora ? transportadora.nome : id;
  };

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Relatório de Pallets por Motorista e Transportadora
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={dataInicio ? format(dataInicio, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={dataFim ? format(dataFim, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Transportadora</InputLabel>
                <Select
                  value={transportadoraFiltro}
                  label="Transportadora"
                  onChange={(e) => setTransportadoraFiltro(e.target.value)}
                >
                  {transportadoras.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Motorista (nome)"
                value={motoristaFiltro}
                onChange={(e) => setMotoristaFiltro(e.target.value)}
                placeholder="Digite o nome do motorista"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleFiltrar}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Carregando...' : 'Filtrar'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Resumo por Transportadora */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resumo por Transportadora
          </Typography>
          <Grid container spacing={2}>
            {resumoTransportadoras.map((resumo) => (
              <Grid item xs={12} md={6} lg={4} key={resumo.transportadora}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      {getNomeTransportadora(resumo.transportadora)}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2">
                        <strong>Pallets Levados:</strong> {resumo.totalPalletsLevados}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Pallets Devolvidos:</strong> {resumo.totalPalletsDevolvidos}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        <strong>Pallets Líquido:</strong> {resumo.totalPalletsLiquido}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Total de Controles:</strong> {resumo.totalControles}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Motoristas:</strong> {resumo.totalMotoristas}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Tabela Detalhada */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Detalhamento por Motorista
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Motorista</strong></TableCell>
                  <TableCell><strong>Transportadora</strong></TableCell>
                  <TableCell align="right"><strong>Pallets Levados</strong></TableCell>
                  <TableCell align="right"><strong>Pallets Devolvidos</strong></TableCell>
                  <TableCell align="right"><strong>Pallets Líquido</strong></TableCell>
                  <TableCell align="right"><strong>Total Controles</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {loading ? 'Carregando dados...' : 'Nenhum dado encontrado para o período selecionado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  dados.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.motorista}</TableCell>
                      <TableCell>
                        <Chip
                          label={getNomeTransportadora(item.transportadora)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{item.totalPalletsLevados}</TableCell>
                      <TableCell align="right">{item.totalPalletsDevolvidos}</TableCell>
                      <TableCell align="right">
                        <strong style={{ color: item.totalPalletsLiquido >= 0 ? 'green' : 'red' }}>
                          {item.totalPalletsLiquido}
                        </strong>
                      </TableCell>
                      <TableCell align="right">{item.totalControles}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
  );
};

export default RelatorioPalletsPage;
