import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Alert
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TotalPorMaterial {
  materialId: string;
  materialNome: string;
  unidadeMedida: string;
  quantidadeTotal: number;
  quantidadeSolicitacoes: number;
}

interface TotalPorSolicitante {
  solicitanteId: string;
  solicitanteNome: string;
  quantidadeSolicitacoes: number;
  quantidadeMateriaisDistintos: number;
}

interface Resumo {
  totalSolicitacoes: number;
  totalMateriais: number;
  totalSolicitantes: number;
}

interface RelatorioData {
  totaisPorMaterial: TotalPorMaterial[];
  totaisPorSolicitante: TotalPorSolicitante[];
  resumo: Resumo;
}

export default function RelatoriosMateriais() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  );
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);

  const handleBuscar = async () => {
    if (!dataInicio || !dataFim) {
      enqueueSnackbar('Informe o período', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/relatorios/materiais', {
        params: { dataInicio, dataFim }
      });
      setRelatorio(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao gerar relatório', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => {
    if (!relatorio) return;

    // Gerar CSV
    let csv = 'RELATÓRIO DE MATERIAIS\n\n';
    csv += `Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}\n\n`;
    
    csv += 'RESUMO\n';
    csv += `Total de Solicitações:,${relatorio.resumo.totalSolicitacoes}\n`;
    csv += `Total de Materiais:,${relatorio.resumo.totalMateriais}\n`;
    csv += `Total de Solicitantes:,${relatorio.resumo.totalSolicitantes}\n\n`;

    csv += 'CONSUMO POR MATERIAL\n';
    csv += 'Material,Unidade,Quantidade Total,Nº Solicitações\n';
    relatorio.totaisPorMaterial.forEach(item => {
      csv += `${item.materialNome},${item.unidadeMedida},${item.quantidadeTotal},${item.quantidadeSolicitacoes}\n`;
    });

    csv += '\nCONSUMO POR FUNCIONÁRIO\n';
    csv += 'Funcionário,Nº Solicitações,Materiais Distintos\n';
    relatorio.totaisPorSolicitante.forEach(item => {
      csv += `${item.solicitanteNome},${item.quantidadeSolicitacoes},${item.quantidadeMateriaisDistintos}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_materiais_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();

    enqueueSnackbar('Relatório exportado com sucesso!', { variant: 'success' });
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Relatórios de Materiais
          </Typography>
        </Box>

        {/* Filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data Início"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data Fim"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleBuscar}
                  disabled={loading}
                  size="large"
                >
                  Buscar
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Resultados */}
        {relatorio && (
          <>
            {/* Resumo */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total de Solicitações
                    </Typography>
                    <Typography variant="h4">
                      {relatorio.resumo.totalSolicitacoes}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Materiais Diferentes
                    </Typography>
                    <Typography variant="h4">
                      {relatorio.resumo.totalMateriais}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Funcionários Solicitantes
                    </Typography>
                    <Typography variant="h4">
                      {relatorio.resumo.totalSolicitantes}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Botão Exportar */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportar}
              >
                Exportar CSV
              </Button>
            </Box>

            {/* Consumo por Material */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Consumo por Material
                </Typography>
                {relatorio.totaisPorMaterial.length === 0 ? (
                  <Alert severity="info">Nenhum material consumido no período</Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Material</strong></TableCell>
                          <TableCell align="center"><strong>Unidade</strong></TableCell>
                          <TableCell align="center"><strong>Quantidade Total</strong></TableCell>
                          <TableCell align="center"><strong>Nº Solicitações</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relatorio.totaisPorMaterial
                          .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
                          .map((item) => (
                            <TableRow key={item.materialId}>
                              <TableCell>{item.materialNome}</TableCell>
                              <TableCell align="center">{item.unidadeMedida}</TableCell>
                              <TableCell align="center">
                                <strong>{item.quantidadeTotal}</strong>
                              </TableCell>
                              <TableCell align="center">{item.quantidadeSolicitacoes}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            {/* Consumo por Funcionário */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Consumo por Funcionário
                </Typography>
                {relatorio.totaisPorSolicitante.length === 0 ? (
                  <Alert severity="info">Nenhuma solicitação no período</Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Funcionário</strong></TableCell>
                          <TableCell align="center"><strong>Nº Solicitações</strong></TableCell>
                          <TableCell align="center"><strong>Materiais Distintos</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relatorio.totaisPorSolicitante
                          .sort((a, b) => b.quantidadeSolicitacoes - a.quantidadeSolicitacoes)
                          .map((item) => (
                            <TableRow key={item.solicitanteId}>
                              <TableCell>{item.solicitanteNome}</TableCell>
                              <TableCell align="center">
                                <strong>{item.quantidadeSolicitacoes}</strong>
                              </TableCell>
                              <TableCell align="center">{item.quantidadeMateriaisDistintos}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </Layout>
  );
}
