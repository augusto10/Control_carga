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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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

interface AjustePayload {
  motorista?: string;
  transportadora?: string;
  quantidade: number;
  observacao?: string;
  dataRecebimento?: string;
}

const RelatorioPalletsPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<RelatorioPallets[]>([]);
  const [resumoTransportadoras, setResumoTransportadoras] = useState<ResumoTransportadora[]>([]);
  const [openAjuste, setOpenAjuste] = useState(false);
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);
  const [ajuste, setAjuste] = useState<AjustePayload>({ quantidade: 1, dataRecebimento: format(new Date(), 'yyyy-MM-dd') });
  
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
    { id: 'DETAFRA_TRANSPORTES', nome: 'Detafra Transportes' },
    { id: 'RETIRA_VENDEDOR', nome: 'Retira Vendedor' }
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

  const handleOpenAjuste = () => {
    setAjuste({ quantidade: 1, dataRecebimento: format(new Date(), 'yyyy-MM-dd') });
    setOpenAjuste(true);
  };

  const handleCloseAjuste = () => {
    setOpenAjuste(false);
  };

  const gerarPdfRecibo = async (aj: AjustePayload & { criadoEm?: string }) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points
    const { width } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const title = 'Recibo de Recebimento de Pallets';
    const nowStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    let y = 800;
    page.drawText(title, { x: 50, y, size: 18, font, color: rgb(0, 0, 0) });
    y -= 30;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.1, 0.1, 0.1) });
    y -= 30;

    const lines: string[] = [
      `Data do recebimento: ${aj.dataRecebimento ? format(new Date(aj.dataRecebimento), 'dd/MM/yyyy') : nowStr}`,
      `Motorista: ${aj.motorista || 'N/I'}`,
      `Transportadora: ${aj.transportadora || 'N/I'}`,
      `Quantidade devolvida: ${aj.quantidade}`,
      `Observação: ${aj.observacao || '-'}`,
      `Emitido em: ${nowStr}`,
    ];

    lines.forEach((t) => {
      page.drawText(t, { x: 50, y, size: 12, font });
      y -= 22;
    });

    y -= 40;
    page.drawText('Recebido por:', { x: 50, y, size: 12, font });
    y -= 40;
    page.drawLine({ start: { x: 50, y }, end: { x: 300, y }, thickness: 1 });
    y -= 16;
    page.drawText(`Usuário: ${user?.nome || user?.email || 'Usuário'}`, { x: 50, y, size: 10, font });

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-pallets-${aj.transportadora || 'geral'}-${aj.dataRecebimento || format(new Date(), 'yyyy-MM-dd')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSalvarAjuste = async () => {
    if (!ajuste.quantidade || ajuste.quantidade <= 0) return;
    setSalvandoAjuste(true);
    try {
      const resp = await fetch('/api/pallets/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...ajuste,
          dataRecebimento: ajuste.dataRecebimento,
        }),
      });
      if (!resp.ok) throw new Error('Falha ao salvar ajuste');
      const json = await resp.json();
      await gerarPdfRecibo({ ...ajuste });
      setOpenAjuste(false);
      buscarDados();
    } catch (e) {
      console.error('Erro ao salvar ajuste:', e);
    } finally {
      setSalvandoAjuste(false);
    }
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

      {/* Filtros e Ações */}
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
          <Grid item xs={12} display="flex" gap={2}>
            <Button
              variant="contained"
              onClick={handleFiltrar}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Carregando...' : 'Filtrar'}
            </Button>
            <Button variant="outlined" color="secondary" onClick={handleOpenAjuste}>
              Ajustes de Pallets
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
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: resumo.totalPalletsDevolvidos > resumo.totalPalletsLevados ? 'green' : 'red',
                        fontWeight: 'bold'
                      }}
                    >
                      <strong>Diferença Pallets:</strong> {resumo.totalPalletsDevolvidos > resumo.totalPalletsLevados ? '+' : '-'}{Math.abs(resumo.totalPalletsLiquido)}
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
                <TableCell align="right"><strong>Diferença Pallets</strong></TableCell>
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
                      <strong style={{ 
                        color: item.totalPalletsDevolvidos > item.totalPalletsLevados ? 'green' : 'red' 
                      }}>
                        {item.totalPalletsDevolvidos > item.totalPalletsLevados ? '+' : '-'}{Math.abs(item.totalPalletsLiquido)}
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

      {/* Modal de Ajuste de Pallets */}
      <Dialog open={openAjuste} onClose={handleCloseAjuste} fullWidth maxWidth="sm">
        <DialogTitle>Registrar Ajuste de Pallets (Devolução Avulsa)</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data do Recebimento"
                type="date"
                value={ajuste.dataRecebimento || ''}
                onChange={(e) => setAjuste((a) => ({ ...a, dataRecebimento: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantidade devolvida"
                type="number"
                value={ajuste.quantidade}
                onChange={(e) => setAjuste((a) => ({ ...a, quantidade: Number(e.target.value) }))}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Motorista (opcional)"
                value={ajuste.motorista || ''}
                onChange={(e) => setAjuste((a) => ({ ...a, motorista: e.target.value }))}
                placeholder="Nome do motorista"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Transportadora (opcional)</InputLabel>
                <Select
                  value={ajuste.transportadora || ''}
                  label="Transportadora (opcional)"
                  onChange={(e) => setAjuste((a) => ({ ...a, transportadora: e.target.value as string }))}
                >
                  <MenuItem value="">
                    <em>Não informar</em>
                  </MenuItem>
                  {transportadoras.filter(t => t.id !== 'TODAS').map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observação"
                value={ajuste.observacao || ''}
                onChange={(e) => setAjuste((a) => ({ ...a, observacao: e.target.value }))}
                placeholder="Ex.: Devolução no pátio, conferido pelo recebedor"
                multiline
                minRows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAjuste} disabled={salvandoAjuste}>Cancelar</Button>
          <Button onClick={handleSalvarAjuste} variant="contained" disabled={salvandoAjuste || (ajuste.quantidade ?? 0) <= 0}>
            {salvandoAjuste ? 'Salvando...' : 'Salvar e Gerar PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RelatorioPalletsPage;
