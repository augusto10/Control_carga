import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Search, WarningAmber, LocalShipping, History } from '@mui/icons-material';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

type Ocorrencia = {
  dataHora: string | null;
  dataHoraEfetiva: string | null;
  cidade: string | null;
  filial: string | null;
  dominio: string | null;
  tipo: string | null;
  ocorrencia: string | null;
  descricao: string | null;
  ocorrenciaSsw: string | null;
  usuario: string | null;
  detalhe: string | null;
  documentos: string | null;
  conferentes: string | null;
  imagem: string | null;
  imagemUrl: string | null;
};

type Item = {
  id: string;
  pedidoId: number;
  clienteId: number | null;
  cliente: string;
  vendedor: string;
  valor: number;
  tipoEntrega: string | null;
  dataHoraRecebimento: string | null;
  numeroNota: string | null;
  identificacaoNfe: string | null;
  transportadora: string | null;
  controleId: string | null;
  statusAtual: string;
  dataHoraStatus: string | null;
  sswStatus: string | null;
  sswMensagem: string | null;
  ocorrencias: Ocorrencia[];
};

type ApiResponse = {
  periodo: { dataInicio: string; dataFim: string };
  totais: { encontrados: number };
  data: Item[];
};

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
}

function compactText(...values: Array<string | null | undefined>): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' | ');
}

export default function PendenciasEntregaPage() {
  const hoje = new Date();
  const dataFimPadrao = format(hoje, 'yyyy-MM-dd');
  const dataInicioPadrao = format(new Date(hoje.getTime() - 2 * 86_400_000), 'yyyy-MM-dd');

  const [dataInicio, setDataInicio] = useState(dataInicioPadrao);
  const [dataFim, setDataFim] = useState(dataFimPadrao);
  const [pedido, setPedido] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [dados, setDados] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro('');
    try {
      const params = new URLSearchParams({ dataInicio, dataFim });
      if (pedido.trim()) params.set('pedido', pedido.trim());
      if (clienteId.trim()) params.set('clienteId', clienteId.trim());
      const response = await fetch(`/api/relatorios/pendencias-entrega?${params.toString()}`, {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.details || payload?.message || `Erro HTTP ${response.status}`);
      }
      setDados(payload);
    } catch (error: any) {
      setErro(error?.message || 'Erro ao consultar pendencias de entrega');
      setDados(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const totalOcorrencias = useMemo(
    () => (dados?.data || []).reduce((sum, item) => sum + item.ocorrencias.length, 0),
    [dados]
  );

  return (
    <ProtectedRoute>
      <AppLayout
        title="Pendencias de Entrega"
        subtitle="Pedidos dos ultimos 3 dias que ainda nao foram entregues"
        breadcrumbs={[{ label: 'Relatorios', href: '/relatorios' }, { label: 'Pendencias de Entrega' }]}
      >
        <Stack spacing={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'end' }}>
              <TextField
                label="Data inicial"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Data final"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Pedido"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
              />
              <TextField
                label="Codigo do cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              />
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Search />}
                onClick={carregar}
                disabled={loading || !dataInicio || !dataFim}
              >
                Consultar
              </Button>
            </Stack>
          </Paper>

          {erro && <Alert severity="error">{erro}</Alert>}

          {dados && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <WarningAmber color="warning" />
                    <Typography variant="subtitle2">Pedidos ainda nao entregues</Typography>
                  </Stack>
                  <Typography variant="h4" fontWeight={800}>{dados.totais.encontrados}</Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <History color="info" />
                    <Typography variant="subtitle2">Ocorrencias retornadas</Typography>
                  </Stack>
                  <Typography variant="h4" fontWeight={800}>{totalOcorrencias}</Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <LocalShipping color="primary" />
                    <Typography variant="subtitle2">Periodo consultado</Typography>
                  </Stack>
                  <Typography variant="body1" fontWeight={700}>
                    {dados.periodo.dataInicio} ate {dados.periodo.dataFim}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}

          {loading && !dados && (
            <Box textAlign="center" py={8}>
              <CircularProgress />
            </Box>
          )}

          {dados && dados.data.length === 0 && !loading && (
            <Alert severity="info">Nenhum pedido pendente de entrega foi encontrado no periodo informado.</Alert>
          )}

          {!!dados?.data?.length && (
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Pedido</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Cod. Cliente</TableCell>
                      <TableCell>Status atual</TableCell>
                      <TableCell>Recebimento</TableCell>
                      <TableCell>Transportadora</TableCell>
                      <TableCell>NF</TableCell>
                      <TableCell align="right">Valor</TableCell>
                      <TableCell align="center">Acoes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dados?.data || []).map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={800}>#{item.pedidoId}</Typography>
                            <Chip size="small" color="warning" label="Pendente" sx={{ width: 'fit-content' }} />
                          </Stack>
                        </TableCell>
                        <TableCell>{item.cliente}</TableCell>
                        <TableCell>{item.clienteId || '-'}</TableCell>
                        <TableCell>{item.statusAtual}</TableCell>
                        <TableCell>{formatDateTime(item.dataHoraRecebimento)}</TableCell>
                        <TableCell>{item.transportadora || '-'}</TableCell>
                        <TableCell>{item.numeroNota || '-'}</TableCell>
                        <TableCell align="right">{money(item.valor)}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setItemSelecionado(item)}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Stack>

        <Dialog
          open={!!itemSelecionado}
          onClose={() => setItemSelecionado(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {itemSelecionado ? `Detalhes do pedido #${itemSelecionado.pedidoId}` : 'Detalhes'}
          </DialogTitle>
          <DialogContent dividers>
            {itemSelecionado && (
              <Stack spacing={2}>
                <Stack spacing={0.75}>
                  <Typography variant="body2"><strong>Cliente:</strong> {itemSelecionado.cliente}</Typography>
                  <Typography variant="body2"><strong>Codigo do cliente:</strong> {itemSelecionado.clienteId || '-'}</Typography>
                  <Typography variant="body2"><strong>Vendedor:</strong> {itemSelecionado.vendedor}</Typography>
                  <Typography variant="body2"><strong>Status atual:</strong> {itemSelecionado.statusAtual}</Typography>
                  <Typography variant="body2"><strong>Data do status:</strong> {formatDateTime(itemSelecionado.dataHoraStatus)}</Typography>
                  <Typography variant="body2"><strong>Recebimento:</strong> {formatDateTime(itemSelecionado.dataHoraRecebimento)}</Typography>
                  <Typography variant="body2"><strong>Transportadora:</strong> {itemSelecionado.transportadora || '-'}</Typography>
                  <Typography variant="body2"><strong>Numero da nota:</strong> {itemSelecionado.numeroNota || '-'}</Typography>
                  <Typography variant="body2"><strong>Chave NF-e:</strong> {itemSelecionado.identificacaoNfe || '-'}</Typography>
                  <Typography variant="body2"><strong>Controle:</strong> {itemSelecionado.controleId || '-'}</Typography>
                  <Typography variant="body2"><strong>Status SSW:</strong> {itemSelecionado.sswStatus || '-'}</Typography>
                  <Typography variant="body2"><strong>Mensagem SSW:</strong> {itemSelecionado.sswMensagem || '-'}</Typography>
                  <Typography variant="body2"><strong>Valor:</strong> {money(itemSelecionado.valor)}</Typography>
                </Stack>

                <Divider />

                <Typography variant="subtitle1" fontWeight={800}>
                  Historico completo de ocorrencias
                </Typography>

                {itemSelecionado.ocorrencias.length === 0 && (
                  <Alert severity="info">Nenhuma ocorrencia de rastreio retornada para este pedido.</Alert>
                )}

                <Stack spacing={1.5}>
                  {itemSelecionado.ocorrencias.map((ocorrencia, index) => (
                    <Box
                      key={`${itemSelecionado.id}-ocorrencia-${index}`}
                      sx={{
                        borderLeft: '3px solid',
                        borderColor: 'rgba(59, 130, 246, 0.35)',
                        pl: 2,
                        py: 0.25,
                      }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {ocorrencia.ocorrencia || ocorrencia.tipo || 'Ocorrencia'}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {formatDateTime(ocorrencia.dataHoraEfetiva || ocorrencia.dataHora)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {compactText(
                          ocorrencia.descricao,
                          ocorrencia.ocorrenciaSsw,
                          ocorrencia.detalhe,
                          ocorrencia.documentos,
                          ocorrencia.conferentes
                        ) || '-'}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        {compactText(ocorrencia.cidade, ocorrencia.filial, ocorrencia.dominio, ocorrencia.usuario) || 'Sem complemento'}
                      </Typography>
                      {ocorrencia.imagemUrl && (
                        <Box sx={{ mt: 0.75 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            href={ocorrencia.imagemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver comprovante/imagem
                          </Button>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Stack>
            )}
          </DialogContent>
        </Dialog>
      </AppLayout>
    </ProtectedRoute>
  );
}

(PendenciasEntregaPage as any).usesAppLayout = true;
