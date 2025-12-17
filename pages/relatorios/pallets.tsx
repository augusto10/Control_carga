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
  const [funcionalidadeDisponivel, setFuncionalidadeDisponivel] = useState<boolean | null>(null);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState<Date | null>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | null>(endOfMonth(new Date()));
  const [transportadoraFiltro, setTransportadoraFiltro] = useState<string>('TODAS');
  const [motoristaFiltro, setMotoristaFiltro] = useState<string>('');

  const transportadoras = [
    { id: 'TODAS', nome: 'Todas as Transportadoras' },
    { id: 'ACERT', nome: 'ACCERT Transportes' },
    { id: 'ACCERT', nome: 'ACCERT' },
    { id: 'EXPRESSO_GOIAS', nome: 'Expresso Goiás' },
    { id: 'TERCEIRIZADA', nome: 'Terceirizada' },
    { id: 'DETAFRA_TRANSPORTES', nome: 'Detafra Transportes' },
    { id: 'RETIRA_VENDEDOR', nome: 'Retira Vendedor' },
    { id: 'RETIRA_CLIENTE', nome: 'Retira Cliente' },
    { id: 'VLOG', nome: 'VLOG Transportes' }
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

  const verificarDisponibilidade = async () => {
    try {
      const resp = await fetch('/api/pallets/ajustes?teste=true', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (resp.status === 503) {
        setFuncionalidadeDisponivel(false);
        return false;
      }
      
      setFuncionalidadeDisponivel(true);
      return true;
    } catch (error) {
      setFuncionalidadeDisponivel(false);
      return false;
    }
  };

  const handleOpenAjuste = async () => {
    const disponivel = await verificarDisponibilidade();
    
    if (!disponivel) {
      alert(
        '⚠️ Funcionalidade Temporariamente Indisponível\n\n' +
        'A funcionalidade de ajustes de pallets não está disponível porque a tabela do banco de dados ainda não foi criada.\n\n' +
        '📋 Para habilitar esta funcionalidade:\n' +
        '1. Acesse o console do seu banco Neon\n' +
        '2. Execute o SQL fornecido no arquivo INSTRUCOES_PALLET_AJUSTE.md\n' +
        '3. Ou execute: node fix-pallet-ajuste.js para ver instruções detalhadas\n\n' +
        '💡 Esta é uma funcionalidade adicional que permite registrar devoluções avulsas de pallets e gerar recibos em PDF.'
      );
      return;
    }
    
    setAjuste({ quantidade: 1, dataRecebimento: format(new Date(), 'yyyy-MM-dd') });
    setOpenAjuste(true);
  };

  const handleCloseAjuste = () => {
    setOpenAjuste(false);
  };

  const gerarPdfRecibo = async (aj: AjustePayload & { criadoEm?: string }) => {
    try {
      // Usar o mesmo template do listar controles
      const existingBytes = await fetch('/templates/modelo-romaneio.pdf').then(res => res.arrayBuffer());
      const doc = await PDFDocument.load(existingBytes);
      let page = doc.getPage(0);
      let { width, height } = page.getSize();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
      
      // Configurações de layout adaptadas ao template
      const leftMargin = 60;
      const rightMargin = 60;
      const fontSize = 10;
      const titleFontSize = 14;
      const lineHeight = 14;
      
      // Posição inicial ajustada para não sobrepor o cabeçalho do template
      let yPos = height - 200; // Começar mais abaixo para não sobrepor o cabeçalho
      
      // Título principal (menor e posicionado para não conflitar)
      const titulo = 'RECIBO DE RECEBIMENTO DE PALLETS';
      const tituloWidth = boldFont.widthOfTextAtSize(titulo, titleFontSize);
      const tituloX = (width - tituloWidth) / 2;
      page.drawText(titulo, {
        x: tituloX,
        y: yPos,
        size: titleFontSize,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2) // Cor mais suave
      });
      
      yPos -= 30;
      
      // Linha separadora
      page.drawLine({
        start: { x: leftMargin, y: yPos },
        end: { x: width - rightMargin, y: yPos },
        thickness: 1,
        color: rgb(0.3, 0.3, 0.3)
      });
      
      yPos -= 25;
      
      // Data e hora de emissão
      const agora = new Date();
      const dataEmissao = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(agora);
      
      page.drawText(`Emitido em: ${dataEmissao}`, {
        x: width - rightMargin - 120,
        y: yPos,
        size: fontSize - 1,
        font,
        color: rgb(0.4, 0.4, 0.4)
      });
      
      yPos -= 30;
      
      // Informações do recebimento
      const informacoes = [
        { label: 'Data do Recebimento:', valor: aj.dataRecebimento ? format(new Date(aj.dataRecebimento), 'dd/MM/yyyy') : format(agora, 'dd/MM/yyyy') },
        { label: 'Transportadora:', valor: aj.transportadora || 'Não informada' },
        { label: 'Motorista:', valor: aj.motorista || 'Não informado' },
        { label: 'Quantidade Devolvida:', valor: `${aj.quantidade} pallets` },
        { label: 'Observação:', valor: aj.observacao || 'Nenhuma observação' }
      ];
      
      informacoes.forEach((info) => {
        page.drawText(info.label, {
          x: leftMargin,
          y: yPos,
          size: fontSize,
          font: boldFont,
          color: rgb(0, 0, 0)
        });
        
        page.drawText(info.valor, {
          x: leftMargin + 120,
          y: yPos,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
        
        yPos -= lineHeight + 2;
      });
      
      yPos -= 20;
      
      // Seção de assinatura
      page.drawText('CONFIRMAÇÃO DE RECEBIMENTO', {
        x: leftMargin,
        y: yPos,
        size: fontSize + 1,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      yPos -= 25;
      
      // Linha separadora
      page.drawLine({
        start: { x: leftMargin, y: yPos },
        end: { x: width - rightMargin, y: yPos },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      yPos -= 20;
      
      // Responsável pelo recebimento
      page.drawText('Responsável pelo Recebimento:', {
        x: leftMargin,
        y: yPos,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      yPos -= 15;
      
      page.drawText(`Nome: ${user?.nome || user?.email || 'Usuário do Sistema'}`, {
        x: leftMargin,
        y: yPos,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      });
      
      yPos -= 40;
      
      // Linha para assinatura
      page.drawLine({
        start: { x: leftMargin, y: yPos },
        end: { x: leftMargin + 200, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      
      yPos -= 15;
      
      page.drawText('Assinatura', {
        x: leftMargin + 75,
        y: yPos,
        size: fontSize - 1,
        font,
        color: rgb(0.4, 0.4, 0.4)
      });
      
      yPos -= 30;
      
      // Carimbo digital se usuário autenticado
      if (user) {
        page.drawText('DOCUMENTO GERADO DIGITALMENTE', {
          x: leftMargin,
          y: yPos,
          size: fontSize - 1,
          font: boldFont,
          color: rgb(0, 0.6, 0)
        });
        
        yPos -= 12;
        
        page.drawText(`Sistema: Controle de Carga | Usuário: ${user.email}`, {
          x: leftMargin,
          y: yPos,
          size: fontSize - 2,
          font,
          color: rgb(0, 0.4, 0)
        });
      }
      
      // Rodapé
      const rodapeY = 50;
      page.drawLine({
        start: { x: leftMargin, y: rodapeY + 20 },
        end: { x: width - rightMargin, y: rodapeY + 20 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7)
      });
      
      page.drawText('Este documento comprova o recebimento de pallets devolvidos conforme informações acima.', {
        x: leftMargin,
        y: rodapeY,
        size: fontSize - 2,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      // Gerar e baixar PDF
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo-pallets-${aj.transportadora || 'geral'}-${aj.dataRecebimento || format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
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
      
      const json = await resp.json();
      
      if (!resp.ok) {
        if (resp.status === 503) {
          // Funcionalidade temporariamente indisponível
          alert(
            `⚠️ ${json.error}\n\n${json.details}\n\n` +
            '📋 Consulte o arquivo INSTRUCOES_PALLET_AJUSTE.md para instruções detalhadas de como resolver este problema.'
          );
          setOpenAjuste(false);
          return;
        }
        throw new Error(json.error || 'Falha ao salvar ajuste');
      }
      
      // Sucesso - gerar PDF e atualizar dados
      await gerarPdfRecibo({ ...ajuste });
      setOpenAjuste(false);
      buscarDados();
      alert('✅ Ajuste de pallets salvo com sucesso e PDF gerado!');
    } catch (e: any) {
      console.error('Erro ao salvar ajuste:', e);
      alert(`❌ Erro ao salvar ajuste: ${e.message}`);
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
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleOpenAjuste}
              title={funcionalidadeDisponivel === false ? 'Funcionalidade temporariamente indisponível - clique para mais informações' : 'Registrar devolução avulsa de pallets'}
            >
              {funcionalidadeDisponivel === false ? '⚠️ ' : ''}Ajustes de Pallets
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
