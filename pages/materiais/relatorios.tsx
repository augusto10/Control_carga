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
// XLSX será carregado dinamicamente para evitar impacto no bundle/SSR
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface TotalPorMaterial {
  materialId: string;
  materialNome: string;
  unidadeMedida: string;
  quantidadeTotal: number;
  quantidadeSolicitacoes: number;
  valorTotal?: number;
  estoqueAtual?: number;
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
  valorTotalGasto?: number;
}

interface RelatorioData {
  totaisPorMaterial: TotalPorMaterial[];
  totaisPorSolicitante: TotalPorSolicitante[];
  resumo: Resumo;
  detalhamentoPorMaterial?: Array<{
    materialNome: string;
    estoqueAtual: number;
    estoqueMinimo: number;
    consumoMedio: number;
    sugestaoReposicao: number;
    valorUnitario: number;
    valorTotalEstoque: number;
  }>;
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

  // Removido: exportação CSV (não necessária)

  const handleExportarExcel = async () => {
    if (!relatorio) return;
    try {
      if (typeof window === 'undefined') return; // garante client-side
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

    // Aba Resumo
    const resumoData = [
      ['Total de Solicitações', relatorio.resumo.totalSolicitacoes],
      ['Total de Materiais', relatorio.resumo.totalMateriais],
      ['Total de Solicitantes', relatorio.resumo.totalSolicitantes],
      ...(relatorio.resumo.valorTotalGasto !== undefined ? [['Valor Total Gasto', relatorio.resumo.valorTotalGasto]] : [])
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 28 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Aba Consumo por Material
    const materiaisData = [
      ['Material', 'Unidade', 'Quantidade Total', 'Nº Solicitações', 'Valor Total', 'Estoque Atual']
    ];
    relatorio.totaisPorMaterial.forEach((m) => {
      materiaisData.push([
        m.materialNome,
        m.unidadeMedida,
        m.quantidadeTotal,
        m.quantidadeSolicitacoes,
        m.valorTotal ?? 0,
        m.estoqueAtual ?? ''
      ]);
    });
    const wsMateriais = XLSX.utils.aoa_to_sheet(materiaisData);
    wsMateriais['!cols'] = [
      { wch: 40 }, // Material
      { wch: 8 },  // Unidade
      { wch: 16 }, // Quantidade Total
      { wch: 16 }, // Nº Solicitações
      { wch: 16 }, // Valor Total
      { wch: 16 }  // Estoque Atual
    ];
    wsMateriais['!autofilter'] = { ref: `A1:F${materiaisData.length}` };
    wsMateriais['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
    XLSX.utils.book_append_sheet(wb, wsMateriais, 'Consumo por Material');

    // Aba Consumo por Funcionário
    const solicitantesData = [['Funcionário', 'Nº Solicitações', 'Materiais Distintos']];
    relatorio.totaisPorSolicitante.forEach((s) => {
      solicitantesData.push([s.solicitanteNome, s.quantidadeSolicitacoes, s.quantidadeMateriaisDistintos]);
    });
    const wsSolicitantes = XLSX.utils.aoa_to_sheet(solicitantesData);
    wsSolicitantes['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 22 }];
    wsSolicitantes['!autofilter'] = { ref: `A1:C${solicitantesData.length}` };
    wsSolicitantes['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
    XLSX.utils.book_append_sheet(wb, wsSolicitantes, 'Consumo por Funcionário');

    // Aba Detalhamento
    if (relatorio.detalhamentoPorMaterial) {
      const detalhamentoData = [['Material', 'Estoque Atual', 'Estoque Mínimo', 'Consumo Médio', 'Sugestão Reposição', 'Valor Unitário', 'Valor Total Estoque']];
      relatorio.detalhamentoPorMaterial.forEach((d) => {
        detalhamentoData.push([
          d.materialNome,
          d.estoqueAtual,
          d.estoqueMinimo,
          d.consumoMedio,
          d.sugestaoReposicao,
          d.valorUnitario,
          d.valorTotalEstoque
        ]);
      });
      const wsDetalhamento = XLSX.utils.aoa_to_sheet(detalhamentoData);
      wsDetalhamento['!cols'] = [
        { wch: 40 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 20 }
      ];
      wsDetalhamento['!autofilter'] = { ref: `A1:G${detalhamentoData.length}` };
      wsDetalhamento['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
      XLSX.utils.book_append_sheet(wb, wsDetalhamento, 'Detalhamento');
    }

    XLSX.writeFile(wb, `relatorio_materiais_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    enqueueSnackbar('Excel gerado com sucesso!', { variant: 'success' });
    } catch (err: any) {
      console.error('Erro ao gerar Excel:', err);
      enqueueSnackbar('Falha ao gerar Excel. Verifique se o pacote xlsx está instalado.', { variant: 'error' });
    }
  };

  const handleGerarPdf = async () => {
    if (!relatorio) return;
    const doc = await PDFDocument.create();
    let page = doc.addPage([595.28, 841.89]);
    let { width, height } = page.getSize();
    const margin = 36;
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    let y = height - margin;

    const draw = (text: string, x: number, yPos: number, size = 11, bold = false) => {
      page.drawText(text, { x, y: yPos, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) });
    };

    // Cabeçalho similar ao de controles
    draw('CONTROLE DE MATERIAIS', margin, y, 16, true); y -= 18;
    draw(`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy')} a ${format(new Date(dataFim), 'dd/MM/yyyy')}`, margin, y); y -= 14;
    y -= 4;

    // Resumo em duas colunas
    draw('Resumo', margin, y, 13, true); y -= 14;
    draw(`Total de Solicitações: ${relatorio.resumo.totalSolicitacoes}`, margin, y); 
    draw(`Total de Materiais: ${relatorio.resumo.totalMateriais}`, margin + 260, y); y -= 14;
    draw(`Total de Solicitantes: ${relatorio.resumo.totalSolicitantes}`, margin, y);
    if (relatorio.resumo.valorTotalGasto !== undefined) {
      draw(`Valor Total Gasto: R$ ${relatorio.resumo.valorTotalGasto.toFixed(2)}`, margin + 260, y);
    }
    y -= 18;

    // Tabela estilizada
    draw('Consumo por Material', margin, y, 13, true); y -= 14;
    const headers = ['Material', 'Unid.', 'Qtde', 'Solicitações', 'Valor Total'];
    const colX = [margin, margin + 260, margin + 320, margin + 400, margin + 480];
    headers.forEach((h, i) => draw(h, colX[i], y, 11, true)); y -= 12;

    const addPageIfNeeded = () => {
      if (y < margin + 50) {
        const newPage = doc.addPage([595.28, 841.89]);
        page = newPage;
        ({ width, height } = page.getSize());
        y = height - margin;
        headers.forEach((h, i) => draw(h, colX[i], y, 11, true)); y -= 12;
      }
    };

    relatorio.totaisPorMaterial
      .sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0))
      .forEach((m) => {
        addPageIfNeeded();
        draw(m.materialNome.slice(0, 38), colX[0], y);
        draw(m.unidadeMedida, colX[1], y);
        draw(String(m.quantidadeTotal), colX[2], y);
        draw(String(m.quantidadeSolicitacoes), colX[3], y);
        draw(`R$ ${(m.valorTotal || 0).toFixed(2)}`, colX[4], y);
        y -= 12;
      });

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_materiais_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    link.click();
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

            {/* Cards adicionais de valor */}
            {relatorio.resumo.valorTotalGasto !== undefined && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Valor Total Gasto
                      </Typography>
                      <Typography variant="h4">
                        R$ {relatorio.resumo.valorTotalGasto.toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Botões Exportar */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              {/* CSV removido conforme solicitado */}
              <Button sx={{ ml: 1 }} variant="contained" startIcon={<DownloadIcon />} onClick={handleExportarExcel}>
                Exportar Excel
              </Button>
              <Button sx={{ ml: 1 }} variant="outlined" startIcon={<DownloadIcon />} onClick={handleGerarPdf}>
                Gerar PDF
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
                          <TableCell align="center"><strong>Valor Total</strong></TableCell>
                          <TableCell align="center"><strong>Estoque Atual</strong></TableCell>
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
                              <TableCell align="center">R$ {(item.valorTotal||0).toFixed(2)}</TableCell>
                              <TableCell align="center">{item.estoqueAtual ?? '-'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            {/* Detalhamento por Material */}
            {relatorio.detalhamentoPorMaterial && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detalhamento por Material
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Material</strong></TableCell>
                          <TableCell align="center"><strong>Estoque Atual</strong></TableCell>
                          <TableCell align="center"><strong>Estoque Mínimo</strong></TableCell>
                          <TableCell align="center"><strong>Consumo Médio</strong></TableCell>
                          <TableCell align="center"><strong>Sugestão Reposição</strong></TableCell>
                          <TableCell align="center"><strong>Valor Unitário</strong></TableCell>
                          <TableCell align="center"><strong>Valor Total Estoque</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relatorio.detalhamentoPorMaterial.map((d) => (
                          <TableRow key={d.materialNome}>
                            <TableCell>{d.materialNome}</TableCell>
                            <TableCell align="center">{d.estoqueAtual}</TableCell>
                            <TableCell align="center">{d.estoqueMinimo}</TableCell>
                            <TableCell align="center">{d.consumoMedio}</TableCell>
                            <TableCell align="center">{d.sugestaoReposicao}</TableCell>
                            <TableCell align="center">R$ {d.valorUnitario.toFixed(2)}</TableCell>
                            <TableCell align="center">R$ {d.valorTotalEstoque.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

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
