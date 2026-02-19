import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  LocalShipping as LocalShippingIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useStore } from '../store/store';
import BarcodeScanner from './BarcodeScanner';
import PrinterSelectDialog from './PrinterSelectDialog';

import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';

const MotionBox = motion(Box);
const MotionGrid = motion(Grid);
const MotionCard = motion(Card);
const MotionPaper = motion(Paper);

const glassStyles = {
  background: alpha('#ffffff', 0.7),
  backdropFilter: 'blur(12px)',
  border: `1px solid ${alpha('#ffffff', 0.3)}`,
  boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
};

interface EtiquetaLote {
  id: string;
  dataCriacao: string;
  codigoBarras: string;
  numeroNota: string;
  cliente: string;
  endereco?: string; // Adicionado
  transportadora: string;
  numeroPedido: string;
  volumes: number;
  observacoes?: string;
  criadoPor: string;
  volumesEtiquetas: EtiquetaVolume[];
}

interface EtiquetaVolume {
  id: string;
  loteId: string;
  indiceVolume: number;
  totalVolumes: number;
  codigoVolume: string;
  impressoEm?: string | null;
  lote?: any;
}

const GerarEtiquetasContent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { fetchTransportadoras } = useStore();
  const { enqueueSnackbar } = useSnackbar();

  // Estados
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const [currentLote, setCurrentLote] = useState<EtiquetaLote | null>(null);

  // Debug: monitorar mudanças no estado saving
  useEffect(() => {
    console.log('🔍 [DEBUG] Estado saving mudou para:', saving);
  }, [saving]);

  

  // Dados do formulário
  const [notaData, setNotaData] = useState({
    codigoBarras: '',
    numeroNota: '',
    cliente: '',
    transportadora: '',
    numeroPedido: '',
    endereco: '',
    valor: '',
    volumes: 1,
    observacoes: ''
  });

  // Função para buscar nota fiscal por número
  const buscarPedidoPorNumero = async () => {
    if (!notaData.numeroPedido.trim()) return;

    // Limpar os dados antes de fazer uma nova busca
    const dadosIniciais = {
      cliente: '',
      endereco: '',
      cidade: '',
      numeroNota: notaData.numeroNota, // Mantém o número da nota se já estiver preenchido
      valor: '',
      transportadora: '',
      observacoes: notaData.observacoes, // Mantém as observações se já estiverem preenchidas
      volumes: 1,
      pedidoId: ''
    };

    // Atualiza o estado para limpar os campos
    setNotaData(prev => ({
      ...prev,
      ...dadosIniciais
    }));

    setLoading(true);
    try {
      const numeroPedido = notaData.numeroPedido.trim();
      console.log('🔍 [Buscar Pedido] Iniciando busca para pedido:', numeroPedido);

      // 1. Buscar o pedido
      const responsePedido = await fetch(`/api/notas/fiscais/buscar/${numeroPedido}`);
      
      if (!responsePedido.ok) {
        const errorData = await responsePedido.json();
        throw new Error(errorData.message || 'Erro ao buscar pedido');
      }
      
      const result = await responsePedido.json();
      console.log('📦 [Buscar Pedido] Resposta bruta:', result);

      // Extrair o pedido de forma robusta
      let pedido = null;
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        pedido = result.data[0];
      } else if (Array.isArray(result) && result.length > 0) {
        pedido = result[0];
      } else if (result && typeof result === 'object' && !Array.isArray(result) && Object.keys(result).length > 0 && !result.data) {
        // Caso o objeto seja o próprio pedido
        pedido = result;
      }

      if (!pedido || (!pedido.CADASTRO_ID && !pedido.ID && !pedido.NUMERO_PEDIDO)) {
        console.error('❌ Pedido não encontrado ou estrutura inválida:', result);
        throw new Error('Pedido não encontrado na base de dados externa ou dados incompletos');
      }
      
      console.log('📦 [Buscar Pedido] Pedido identificado:', pedido);
      
      // 2. Buscar a nota fiscal correspondente ao pedido
      console.log('🔍 [Buscar Nota Fiscal] Buscando nota fiscal para o pedido:', numeroPedido);
      
      // Tentar primeiro o endpoint específico da API Santri
      const responseNotaFiscal = await fetch(`/api/v1/notas-fiscais/pedido/${numeroPedido}`);
      let numeroNotaFiscal = '';
      let dadosNotaFiscal = null;
      
      if (responseNotaFiscal.ok) {
        const notasFiscais = await responseNotaFiscal.json();
        console.log('📄 [Buscar Nota Fiscal] Resposta da API:', notasFiscais);
        
        // Verificar se a resposta é um array e pegar a primeira nota
        if (Array.isArray(notasFiscais) && notasFiscais.length > 0) {
          dadosNotaFiscal = notasFiscais[0];
          // Tentar diferentes campos que podem conter o número da nota
          numeroNotaFiscal = dadosNotaFiscal.numero || 
                            dadosNotaFiscal.NUMERO || 
                            dadosNotaFiscal.NUM_NOTA || 
                            dadosNotaFiscal.numeroNotaFiscal || 
                            dadosNotaFiscal.NUMERO_NOTA_FISCAL || 
                            '';
          
          console.log('📄 [Buscar Nota Fiscal] Número da nota encontrado:', numeroNotaFiscal);
        } else {
          console.log('ℹ️ [Buscar Nota Fiscal] Nenhuma nota fiscal encontrada na API Santri');
          
          // Se não encontrar na API Santri, tentar a rota antiga como fallback
          const responseFallback = await fetch(`/api/notas-fiscais/buscar-por-pedido/${numeroPedido}`);
          if (responseFallback.ok) {
            const notaFallback = await responseFallback.json();
            console.log('🔄 [Buscar Nota Fiscal] Dados da nota (fallback):', notaFallback);
            numeroNotaFiscal = notaFallback.numero || '';
          }
        }
      } else {
        console.log('ℹ️ [Buscar Nota Fiscal] Erro ao buscar nota fiscal:', responseNotaFiscal.statusText);
      }
      
      // Formatar o valor para exibição
      const formatarValor = (valor: any) => {
        if (typeof valor === 'number') {
          return valor.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          });
        }
        return valor || '';
      };

      // Formatar endereço completo (rua, número, complemento, bairro)
      // Garantir que o bairro seja incluído com nomes de campos comuns da API
      const bairro = pedido.BAIRRO || pedido.BAIRRO_ENTREGA || pedido.bairro || pedido.neighborhood || '';
      
      const enderecoCompleto = [
        pedido.LOGRADOURO || pedido.ENDERECO || pedido.LOGRADOURO_ENTREGA || pedido.ENDERECO_ENTREGA || pedido.rua || pedido.endereco || '',
        pedido.NUMERO || pedido.NUMERO_ENDERECO || pedido.NUMERO_ENTREGA || pedido.numero ? `, ${pedido.NUMERO || pedido.NUMERO_ENDERECO || pedido.NUMERO_ENTREGA || pedido.numero}` : '',
        pedido.COMPLEMENTO || pedido.COMPLEMENTO_ENTREGA || pedido.complemento ? ` - ${pedido.COMPLEMENTO || pedido.COMPLEMENTO_ENTREGA || pedido.complemento}` : '',
        bairro ? ` ${bairro}` : ''
      ].filter(Boolean).join('');

      // Formatar cidade/estado/CEP
      const cidadeEstado = [
        pedido.CIDADE || pedido.CIDADE_ENTREGA || pedido.cidade || '',
        pedido.UF || pedido.ESTADO || pedido.UF_ENTREGA || pedido.uf || pedido.estado ? `/${pedido.UF || pedido.ESTADO || pedido.UF_ENTREGA || pedido.uf || pedido.estado}` : '',
        pedido.CEP || pedido.CEP_ENTREGA || pedido.cep ? ` - CEP: ${pedido.CEP || pedido.CEP_ENTREGA || pedido.cep}` : ''
      ].filter(Boolean).join(' ');

      // Buscar observações de forma exaustiva
      const encontrarObservacoes = (obj: any) => {
        // 1. Lista de campos conhecidos (prioridade)
        const camposPrioritarios = [
          'OBSERVACAO', 'OBSERVACOES', 'OBS', 'OBSERVACAO_PEDIDO', 'RECADOS', 
          'MEN_NOTA', 'MENSAGEM', 'OBS_INTERNA', 'OBS_EXTERNA', 'INFO_ADICIONAL'
        ];
        
        for (const campo of camposPrioritarios) {
          if (obj[campo] && typeof obj[campo] === 'string' && obj[campo].trim().length > 0) return obj[campo].trim();
          if (obj[campo.toLowerCase()] && typeof obj[campo.toLowerCase()] === 'string' && obj[campo.toLowerCase()].trim().length > 0) return obj[campo.toLowerCase()].trim();
        }

        // 2. Busca por campos que começam com "OBS" (ex: OBSERVACAO1, OBSERVACAO2)
        const chavesObs = Object.keys(obj).filter(key => 
          key.toUpperCase().startsWith('OBS') && typeof obj[key] === 'string' && obj[key].trim().length > 0
        );
        if (chavesObs.length > 0) {
          return chavesObs.map(key => obj[key].trim()).join(' | ');
        }

        // 3. Busca genérica por qualquer campo que contenha "OBS" ou "MEN" no nome
        const chaveGenerica = Object.keys(obj).find(key => 
          (key.toUpperCase().includes('OBS') || key.toUpperCase().includes('MEN')) && 
          typeof obj[key] === 'string' && obj[key].trim().length > 0
        );
        if (chaveGenerica) return obj[chaveGenerica].trim();

        return '';
      };

      // Buscar data do pedido e vendedor
      const dataPedido = pedido.DATA_PEDIDO || pedido.DATA_EMISSAO || pedido.EMISSAO || pedido.DATA || pedido.data_pedido || '';
      const vendedor = pedido.VENDEDOR_NOME || pedido.NOME_VENDEDOR || pedido.VENDEDOR || pedido.USUARIO || pedido.vendedor_nome || '';
      const dataRecebimento = pedido.DATA_HORA_RECEBIMENTO || pedido.data_hora_recebimento || '';
      const dataEntrega = pedido.DATA_ENTREGA || pedido.data_entrega || '';
      
      // Função auxiliar para formatar datas da API
      const formatarDataBR = (dataStr: string, incluirHora: boolean = false) => {
        if (!dataStr) return '';
        try {
          const d = new Date(dataStr);
          if (isNaN(d.getTime())) return dataStr;
          
          if (incluirHora && dataStr.includes('T')) {
            return d.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
          return d.toLocaleDateString('pt-BR');
        } catch (e) {
          return dataStr;
        }
      };

      const dataPedidoFormatada = formatarDataBR(dataPedido);
      const dataRecebimentoFormatada = formatarDataBR(dataRecebimento, true);
      const dataEntregaFormatada = formatarDataBR(dataEntrega);

      // Buscar observações de forma simples e direta primeiro, depois exaustiva
      let observacoesApi = pedido.OBSERVACAO || pedido.OBSERVACOES || pedido.OBS || pedido.MEN_NOTA || pedido.MENSAGEM || '';
      
      if (!observacoesApi) {
        observacoesApi = encontrarObservacoes(pedido);
      }

      // Montar bloco de informações extras para observações
      const infoExtras = [
        dataPedidoFormatada ? `PEDIDO: ${dataPedidoFormatada}` : '',
        dataRecebimentoFormatada ? `RECEB: ${dataRecebimentoFormatada}` : '',
        dataEntregaFormatada ? `ENTREGA: ${dataEntregaFormatada}` : '',
        vendedor ? `VENDEDOR: ${vendedor}` : ''
      ].filter(Boolean).join(' | ');

      // Atualizar o estado com os dados do pedido
      setNotaData(prev => {
        // Combinar informações extras com observações da API
        let obsFinal = infoExtras;
        if (observacoesApi) {
          obsFinal = obsFinal ? `${obsFinal} | OBS: ${observacoesApi}` : observacoesApi;
        }
        
        // Se ainda estiver vazio, usa o que já tinha no estado
        obsFinal = obsFinal || prev.observacoes || '';
        
        return {
          ...prev,
          cliente: pedido.NOME_FANTASIA || pedido.CLIENTE_NOME || pedido.RAZAO_SOCIAL || 'Cliente não identificado',
          endereco: enderecoCompleto || 'Endereço não informado',
          cidade: cidadeEstado || 'Cidade/UF não informado',
          numeroNota: prev.numeroNota || numeroNotaFiscal || pedido.NUMERO_NOTA || pedido.NOTA_FISCAL || '',
          valor: formatarValor(pedido.VALOR_TOTAL || pedido.VALOR_PEDIDO || 0),
          transportadora: pedido.TRANSPORTADORA_NOME || pedido.NOME_TRANSPORTADORA || 'Transportadora não informada',
          pedidoId: pedido.CADASTRO_ID || pedido.ID || pedido.NUMERO_PEDIDO || numeroPedido,
          observacoes: obsFinal,
          volumes: 1
        };
      });

      enqueueSnackbar(`Pedido ${pedido.CADASTRO_ID || numeroPedido} encontrado${numeroNotaFiscal ? ` com nota fiscal ${numeroNotaFiscal}` : ''}`, { variant: 'success' });
      
    } catch (error: any) {
      console.error('Erro ao buscar pedido:', error);
      enqueueSnackbar(error.message || 'Erro ao buscar pedido', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Opções de transportadoras
  const [transportadoras, setTransportadoras] = useState<any[]>([]);

  // Carregar transportadoras ao montar
  useEffect(() => {
    const loadTransportadoras = async () => {
      try {
        const transportadorasData = await fetchTransportadoras();
        if (Array.isArray(transportadorasData) && transportadorasData.length > 0) {
          setTransportadoras(transportadorasData);
        } else {
          // Fallback com transportadoras padrão se API falhar
          console.warn('Usando transportadoras padrão como fallback');
          setTransportadoras([
            { id: 'ACCERT', descricao: 'ACCERT' },
            { id: 'EXPRESSO_GOIAS', descricao: 'EXPRESSO GOIAS' },
            { id: 'TERCEIRIZADA', descricao: 'TERCEIRIZADA' },
            { id: 'DETAFRA_TRANSPORTES', descricao: 'DETAFRA TRANSPORTES' },
            { id: 'RETIRA_VENDEDOR', descricao: 'RETIRA VENDEDOR' },
            { id: 'RETIRA_CLIENTE', descricao: 'RETIRA CLIENTE' }
          ]);
        }
      } catch (error) {
        console.error('Erro ao carregar transportadoras:', error);
        // Fallback com transportadoras padrão
        setTransportadoras([
          { id: 'ACCERT', descricao: 'ACCERT' },
          { id: 'EXPRESSO_GOIAS', descricao: 'EXPRESSO GOIAS' },
          { id: 'TERCEIRIZADA', descricao: 'TERCEIRIZADA' },
          { id: 'DETAFRA_TRANSPORTES', descricao: 'DETAFRA TRANSPORTES' },
          { id: 'RETIRA_VENDEDOR', descricao: 'RETIRA VENDEDOR' },
          { id: 'RETIRA_CLIENTE', descricao: 'RETIRA CLIENTE' }
        ]);
      }
    };

    loadTransportadoras();
  }, [fetchTransportadoras]);

  // Função para buscar dados da nota fiscal na API externa
  const buscarNotaExterna = async (codigo: string, numero: string) => {
    try {
      console.log('[API Externa] Buscando nota fiscal:', { codigo, numero });
      
      // Tentar buscar por número e série (assumindo série padrão '1' se não informada)
      const response = await fetch(`/api/buscar-nota-externa?numero=${numero}&serie=1`, {});
      
      if (response.ok) {
        const notaExterna = await response.json();
        console.log('[API Externa] Nota encontrada:', notaExterna);
        
        // Atualizar dados com informações da API externa
        setNotaData(prev => ({
          ...prev,
          cliente: notaExterna.cliente?.nome || prev.cliente,
          endereco: notaExterna.cliente?.endereco || prev.endereco,
          cidade: notaExterna.cliente?.cidade || prev.cidade,
          estado: notaExterna.cliente?.estado || prev.estado,
          volumes: notaExterna.volumes || prev.volumes,
          valor: notaExterna.valor || prev.valor
        }));
        
        enqueueSnackbar(`Dados da nota ${notaExterna.numero}/${notaExterna.serie} carregados da API externa!`, { variant: 'success' });
      } else {
        console.log('[API Externa] Nota não encontrada na API externa');
        enqueueSnackbar('Nota fiscal lida, mas não encontrada na API externa. Preencha os dados manualmente.', { variant: 'warning' });
      }
    } catch (error) {
      console.error('[API Externa] Erro ao buscar nota:', error);
      enqueueSnackbar('Erro ao buscar dados na API externa. Preencha os dados manualmente.', { variant: 'error' });
    }
  };

  // Função para lidar com leitura do código de barras
  const handleBarcodeScanned = useCallback(async (codigo: string) => {
    try {
      console.log('Código de barras lido:', codigo);

      // Tentar extrair dados do código (formato esperado: CODIGO;NUMERO)
      const partes = codigo.split(';');
      if (partes.length >= 2) {
        const codigoBarras = partes[0];
        const numeroNota = partes[1];

        setNotaData(prev => ({
          ...prev,
          codigoBarras,
          numeroNota
        }));

        setScannerOpen(false);
        enqueueSnackbar('Nota fiscal lida com sucesso!', { variant: 'success' });
        
        // Buscar dados adicionais na API externa
        await buscarNotaExterna(codigoBarras, numeroNota);
      } else {
        // Se não for o formato esperado, usar como código de barras
        setNotaData(prev => ({
          ...prev,
          codigoBarras: codigo
        }));
        setScannerOpen(false);
        enqueueSnackbar('Código de barras lido. Preencha o número da nota manualmente.', { variant: 'info' });
      }
    } catch (error) {
      console.error('Erro ao processar código de barras:', error);
      enqueueSnackbar('Erro ao processar código de barras', { variant: 'error' });
    }
  }, []);

  // Função para gerar etiquetas diretamente (sem salvar no banco)
  const handleGerar = () => {
    console.log('🔍 [DEBUG] handleGerar chamado');
    console.log('🔍 [DEBUG] Estado saving:', saving);
    console.log('🔍 [DEBUG] Dados do formulário:', notaData);
    console.log('🔍 [DEBUG] Transportadoras disponíveis:', transportadoras);

    if (saving) {
      console.log('⚠️ [DEBUG] Salvamento em andamento, ignorando clique');
      return;
    }

    // Validações
    const camposObrigatorios = [];
    if (!notaData.numeroNota.trim()) camposObrigatorios.push('Número da Nota');
    if (!notaData.cliente.trim()) camposObrigatorios.push('Cliente');
    if (!notaData.transportadora) camposObrigatorios.push('Transportadora');
    if (!notaData.numeroPedido.trim()) camposObrigatorios.push('Número do Pedido');
    if (!notaData.volumes || notaData.volumes < 1) camposObrigatorios.push('Volumes');

    console.log('🔍 [DEBUG] Campos obrigatórios faltando:', camposObrigatorios);

    if (camposObrigatorios.length > 0) {
      const mensagem = `Preencha os campos obrigatórios: ${camposObrigatorios.join(', ')}`;
      console.log('⚠️ [DEBUG] Validação falhou:', mensagem);
      enqueueSnackbar(mensagem, { variant: 'warning' });
      return;
    }

    console.log('✅ [DEBUG] Validações passaram, iniciando geração...');

    try {
      setSaving(true);
      console.log('🔄 [DEBUG] Estado saving definido para true');

      console.log('🏷️ Gerando etiquetas diretamente:', notaData);

      // Criar lote temporário para preview e impressão
      const loteTemporario: EtiquetaLote = {
        id: `temp-${Date.now()}`,
        dataCriacao: new Date().toISOString(),
        codigoBarras: notaData.codigoBarras || '',
        numeroNota: notaData.numeroNota,
        cliente: notaData.cliente,
        endereco: notaData.endereco, // Incluído aqui
        transportadora: notaData.transportadora as any,
        numeroPedido: notaData.numeroPedido,
        volumes: notaData.volumes,
        observacoes: notaData.observacoes || undefined,
        criadoPor: 'temp-user',
        volumesEtiquetas: []
      };

      // Gerar volumes individuais
      const volumesEtiquetas = [];
      for (let i = 1; i <= notaData.volumes; i++) {
        // Gerar código único para o volume baseado no timestamp e índice
        const timestamp = Date.now();
        const codigoVolume = `${notaData.numeroPedido}-${i.toString().padStart(3, '0')}-${timestamp}`;

        volumesEtiquetas.push({
          id: `vol-${timestamp}-${i}`,
          loteId: loteTemporario.id,
          indiceVolume: i,
          totalVolumes: notaData.volumes,
          codigoVolume,
          impressoEm: undefined,
          lote: loteTemporario
        });
      }

      loteTemporario.volumesEtiquetas = volumesEtiquetas;

      console.log('✅ Lote temporário criado:', loteTemporario);
      
      console.log('🔄 [DEBUG] Definindo currentLote...');
      setCurrentLote(loteTemporario);
      
      console.log('🔄 [DEBUG] Abrindo preview...');
      setPreviewOpen(true);

      console.log('🔄 [DEBUG] Enviando notificação de sucesso...');
      enqueueSnackbar('Etiquetas geradas com sucesso! Pronto para imprimir.', { variant: 'success' });

      // Limpar formulário
      console.log('🔄 [DEBUG] Limpando formulário...');
      setNotaData({
        codigoBarras: '',
        numeroNota: '',
        cliente: '',
        transportadora: '',
        numeroPedido: '',
        volumes: 1,
        observacoes: ''
      });

      console.log('✅ [DEBUG] Processo concluído com sucesso');

    } catch (error: any) {
      console.error('💥 Erro ao gerar etiquetas:', error);
      enqueueSnackbar('Erro ao gerar etiquetas', { variant: 'error' });
    } finally {
      console.log('🔄 [DEBUG] Resetando estado saving para false');
      setSaving(false);
    }
  };

  // Função para gerar ZPL das etiquetas com número do pedido em destaque e logo
  const gerarZPL = (lote: EtiquetaLote, volumeIndice?: number): string => {
    let zpl = '';

    // Logo da empresa desenhado diretamente com comandos ZPL (sem download de arquivo)
    // Desenho simplificado do logo ESPLENDOR usando comandos nativos
    const logoZPL = '^FO650,20^GB30,30,2^FS\n' + // Quadrado superior esquerdo
                   '^FO650,20^GB30,15,2^FS\n' + // Linha horizontal
                   '^FO650,25^GB15,30,2^FS\n' + // Linha vertical
                   '^FO650,35^GB30,15,2^FS\n' + // Linha horizontal inferior
                   '^FO665,35^GB15,30,2^FS\n' + // Linha vertical direita
                   '^FO640,60^A0N,12,12^FDESPLENDOR^FS\n';

    const volumesParaImprimir = volumeIndice !== undefined 
      ? lote.volumesEtiquetas.filter(v => v.indiceVolume === volumeIndice)
      : lote.volumesEtiquetas;

    volumesParaImprimir.forEach(volume => {
      // Início da etiqueta
      zpl += '^XA\n';

      // Configurações da etiqueta (ajustar conforme impressora)
      zpl += '^PW812\n'; // Largura da etiqueta (812 pontos = 3 polegadas)
      zpl += '^LL609\n'; // Comprimento da etiqueta (609 pontos = 2.4 polegadas)

      // Logo da empresa
      zpl += logoZPL;

      // Número do pedido GRANDE em destaque no topo (conforme solicitado)
      const numeroPedidoFormatado = lote.numeroPedido || lote.numeroNota;
      zpl += `^FO50,35^A0N,75,75^FD${numeroPedidoFormatado}^FS\n`;

      // Código de barras Code 128 (baseado no código do volume)
      zpl += `^FO50,125^BCN,80,Y,N,N^FD${volume.codigoVolume}^FS\n`;

      // Nome do cliente (centralizado, fonte menor)
      zpl += `^FO50,225^A0N,28,28^FD${lote.cliente.toUpperCase().substring(0, 40)}^FS\n`;

      // Endereço (se disponível)
      if (lote.endereco) {
        const end = lote.endereco.substring(0, 80);
        zpl += `^FO50,255^A0N,18,18^FB700,2,0,L^FD${end.toUpperCase()}^FS\n`;
      }

      // Volume atual/total (formato X/Y como nas imagens)
      zpl += `^FO50,295^A0N,35,35^FD${volume.indiceVolume}/${volume.totalVolumes}^FS\n`;

      // Transportadora (se não for RETIRA_CLIENTE)
      if (lote.transportadora !== 'RETIRA_CLIENTE') {
        const transportadoraNome = lote.transportadora === 'ACCERT' ? 'ACCERT' :
                                  lote.transportadora === 'EXPRESSO_GOIAS' ? 'EXPRESSO GOIAS' :
                                  lote.transportadora === 'TERCEIRIZADA' ? 'TERCEIRIZADA' :
                                  lote.transportadora === 'DETAFRA_TRANSPORTES' ? 'DETAFRA' :
                                  lote.transportadora === 'RETIRA_VENDEDOR' ? 'RETIRA VENDEDOR' :
                                  lote.transportadora === 'VLOG' ? 'VLOG' :
                                  lote.transportadora;
        
        zpl += `^FO50,335^A0N,25,25^FD${transportadoraNome}^FS\n`;
      }

      // Observações (se houver)
      if (lote.observacoes && lote.observacoes.trim()) {
        const obs = lote.observacoes.substring(0, 150);
        zpl += `^FO50,370^A0N,18,18^FB700,3,0,L^FDOBS: ${obs.toUpperCase()}^FS\n`;
      }

      // Data no formato brasileiro (canto inferior)
      const dataFormatada = new Date().toLocaleDateString('pt-BR');
      zpl += `^FO50,440^A0N,20,20^FD${dataFormatada}^FS\n`;

      // Número da NF e Pedido (pequeno, canto direito) - mostrando ambos
      zpl += `^FO350,440^A0N,16,16^FDNF: ${lote.numeroNota}^FS\n`;
      if (lote.numeroPedido && lote.numeroPedido.trim()) {
        zpl += `^FO350,460^A0N,16,16^FDPed: ${lote.numeroPedido}^FS\n`;
      }

      // Fim da etiqueta
      zpl += '^XZ\n\n';
    });

    return zpl;
  };

  // Função para imprimir etiquetas
  const handleImprimir = async () => {
    if (!currentLote) return;

    console.log('[Print] Abrindo diálogo de seleção de impressora...');
    setPrinterDialogOpen(true);
  };

  // Estado para controle de qual volume imprimir individualmente
  const [selectedVolumeIndex, setSelectedVolumeIndex] = useState<number | null>(null);

  // Função para imprimir volume individual
  const handleImprimirIndividual = (indice: number) => {
    setSelectedVolumeIndex(indice);
    setPrinterDialogOpen(true);
  };

  // Função para imprimir com impressora selecionada
  const handlePrintWithPrinter = async (printerName: string) => {
    if (!currentLote) return;

    setSaving(true);
    
    try {
      // Verificar se é uma impressora Zebra para usar ZPL
      const isZebra = printerName.toLowerCase().includes('zebra') || 
                      printerName.toLowerCase().includes('zdesigner') ||
                      printerName.toLowerCase().includes('zt220') ||
                      printerName.toLowerCase().includes('zd220');

      if (isZebra) {
        console.log('[Print] Usando fluxo ZPL para impressora Zebra:', printerName);
        const zplData = gerarZPL(currentLote, selectedVolumeIndex !== null ? selectedVolumeIndex : undefined);
        
        const response = await fetch('/api/impressoras/imprimir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zplData,
            printer: printerName,
            loteData: currentLote
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao enviar para impressora');
        }

        enqueueSnackbar(`✅ Etiqueta(s) enviada(s) para ${printerName} com sucesso!`, { variant: 'success' });
        
        // Limpar seleção individual após imprimir
        setSelectedVolumeIndex(null);
        return;
      }

      // Caso contrário, usar fluxo HTML normal
      console.log('[Print] Usando fluxo HTML para:', printerName);

      // Criar HTML para impressão
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Não foi possível abrir janela de impressão');
      }

      // Gerar HTML das etiquetas
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Etiquetas de Transporte</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; background: white; }
            @page { size: 4in 6in; margin: 0; }
            @media print {
              body { margin: 0; padding: 0; }
              .etiqueta { page-break-after: always; }
            }
            .etiqueta {
              width: 4in;
              height: 6in;
              padding: 0.15in;
              display: flex;
              flex-direction: column;
              font-size: 10pt;
              page-break-after: always;
              border: 1px solid #000;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              margin-bottom: 0.1in;
              border-bottom: 1px solid #000;
              padding-bottom: 0.05in;
            }
            .barcode-section {
              display: flex;
              gap: 0.1in;
              margin-bottom: 0.1in;
            }
            .barcode {
              flex: 0 0 1.2in;
              text-align: center;
              border: 1px solid #000;
              padding: 0.05in;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .barcode svg {
              max-width: 100%;
              height: auto;
              margin: 0 auto;
            }
            .barcode-text {
              font-size: 7pt;
              margin-top: 0.02in;
              font-weight: bold;
            }
            .info-box {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border: 1px solid #000;
              padding: 0.05in;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 9pt;
              margin-bottom: 0.03in;
            }
            .info-label {
              font-weight: bold;
              font-size: 8pt;
            }
            .info-value {
              font-size: 8pt;
            }
            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-around;
              margin: 0.1in 0;
              text-align: center;
            }
            .numero-pedido {
              font-size: 32pt;
              font-weight: bold;
              line-height: 1;
            }
            .cliente {
              font-size: 11pt;
              font-weight: bold;
              margin: 0.05in 0;
            }
            .volume-info {
              display: flex;
              justify-content: space-around;
              align-items: center;
              margin: 0.05in 0;
              border: 1px solid #000;
              padding: 0.05in;
            }
            .volume-number {
              font-size: 18pt;
              font-weight: bold;
            }
            .box-number {
              font-size: 14pt;
              font-weight: bold;
              border: 2px solid #000;
              padding: 0.05in 0.1in;
            }
            .footer-info {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              border-top: 1px solid #000;
              padding-top: 0.05in;
              margin-top: 0.05in;
            }
          </style>
        </head>
        <body>
      `;

      // Adicionar volumes (todos ou apenas um)
      const volumesParaHTML = selectedVolumeIndex !== null 
        ? currentLote.volumesEtiquetas.filter(v => v.indiceVolume === selectedVolumeIndex)
        : currentLote.volumesEtiquetas;

      volumesParaHTML.forEach((volume, index) => {
        const transportadoraNome = currentLote.transportadora === 'ACCERT' ? 'ACCERT' :
                                  currentLote.transportadora === 'EXPRESSO_GOIAS' ? 'EXPRESSO GOIAS' :
                                  currentLote.transportadora === 'TERCEIRIZADA' ? 'TERCEIRIZADA' :
                                  currentLote.transportadora === 'DETAFRA_TRANSPORTES' ? 'DETAFRA' :
                                  currentLote.transportadora === 'RETIRA_VENDEDOR' ? 'RETIRA VENDEDOR' :
                                  currentLote.transportadora === 'VLOG' ? 'VLOG' :
                                  currentLote.transportadora;

        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
        const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Usar apenas números para o código de barras (Code128 requer formato específico)
        const codigoBarrasNumerico = volume.codigoVolume.replace(/[^0-9]/g, '').substring(0, 12) || volume.indiceVolume.toString().padStart(12, '0');

        htmlContent += `
          <div class="etiqueta">
            <div class="header-info">
              <span>NF: ${currentLote.numeroNota}</span>
              <span>${dataFormatada} ${horaFormatada}</span>
              <span style="font-weight: bold;">${volume.indiceVolume}</span>
            </div>
            
            <div class="barcode-section">
              <div class="barcode">
                <svg id="barcode-${index}"></svg>
                <div class="barcode-text">${codigoBarrasNumerico}</div>
              </div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">PEDIDO:</span>
                  <span class="info-value">${currentLote.numeroPedido}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">CLIENTE:</span>
                  <span class="info-value">${currentLote.cliente.substring(0, 15)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">TRANSP:</span>
                  <span class="info-value">${transportadoraNome.substring(0, 12)}</span>
                </div>
              </div>
            </div>

            <div class="main-content">
              <div class="numero-pedido">${currentLote.numeroPedido}</div>
              <div class="cliente">${currentLote.cliente.toUpperCase().substring(0, 25)}</div>
              <div class="volume-info">
                <div class="volume-number">${volume.indiceVolume}/${volume.totalVolumes}</div>
                <div class="box-number">BOX<br>${volume.indiceVolume}</div>
              </div>
            </div>

            <div class="footer-info">
              <span>Vol: ${volume.indiceVolume}/${volume.totalVolumes}</span>
              <span>${dataFormatada}</span>
              <span>Seq: ${volume.indiceVolume}</span>
            </div>
          </div>
        `;
      });

      htmlContent += `
        <script>
          // Gerar códigos de barras após carregamento
          window.addEventListener('load', function() {
            console.log('Gerando códigos de barras...');
      `;

      // Adicionar script para cada código de barras
      volumesParaHTML.forEach((volume, index) => {
        const codigoBarrasNumerico = volume.codigoVolume.replace(/[^0-9]/g, '').substring(0, 12) || volume.indiceVolume.toString().padStart(12, '0');
        htmlContent += `
            try {
              JsBarcode("#barcode-${index}", "${codigoBarrasNumerico}", {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: false,
                margin: 2
              });
            } catch(e) {
              console.error('Erro ao gerar código de barras ${index}:', e);
            }
        `;
      });

      htmlContent += `
            console.log('Códigos de barras gerados com sucesso');
            
            // Aguardar um pouco para garantir que os códigos foram renderizados
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
          });
        </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Limpar seleção individual
      setSelectedVolumeIndex(null);

    } catch (error) {
      console.error('Erro ao imprimir:', error);
      
      enqueueSnackbar(`❌ Erro ao imprimir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };



  return (
    <AnimatePresence>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        sx={{ 
          p: { xs: 2, md: 4 }, 
          maxWidth: 1400, 
          mx: 'auto',
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`
        }}
      >
        <Box sx={{ mb: 6, textAlign: { xs: 'center', md: 'left' } }}>
          <Typography 
            variant="overline" 
            sx={{ 
              color: 'primary.main', 
              fontWeight: 700, 
              letterSpacing: 2,
              mb: 1,
              display: 'block'
            }}
          >
            LOGÍSTICA & EXPEDIÇÃO
          </Typography>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800,
              color: 'text.primary',
              letterSpacing: '-1px',
              textShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            Gerar Etiquetas
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Seção de Busca por Pedido */}
          <Grid item xs={12}>
            <MotionCard
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              sx={{
                p: 4,
                ...glassStyles,
                borderRadius: 4,
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  fontWeight: 700,
                  mb: 4,
                  color: 'primary.main',
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}
              >
                <ReceiptIcon />
                1. Identificação do Pedido
              </Typography>

              <Grid container spacing={3} alignItems="flex-start">
                <Grid item xs={12} md={7}>
                  <TextField
                    fullWidth
                    label="Número do Pedido"
                    placeholder="Ex: 12345"
                    value={notaData.numeroPedido}
                    onChange={(e) => setNotaData(prev => ({ ...prev, numeroPedido: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && buscarPedidoPorNumero()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton 
                            onClick={buscarPedidoPorNumero}
                            disabled={!notaData.numeroPedido.trim() || loading}
                            sx={{ 
                              bgcolor: 'primary.main', 
                              color: 'white',
                              borderRadius: 2,
                              transition: 'all 0.2s',
                              '&:hover': { 
                                bgcolor: 'primary.dark',
                                transform: 'scale(1.05)'
                              },
                              '&.Mui-disabled': { 
                                bgcolor: 'action.disabledBackground' 
                              }
                            }}
                          >
                            {loading ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5),
                        '&:hover': { bgcolor: alpha('#fff', 0.8) }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    label="Número da Nota Fiscal"
                    placeholder="Opcional"
                    value={notaData.numeroNota}
                    onChange={(e) => setNotaData(prev => ({ ...prev, numeroNota: e.target.value }))}
                    InputProps={{ 
                      sx: { 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5),
                        '&:hover': { bgcolor: alpha('#fff', 0.8) }
                      } 
                    }}
                  />
                </Grid>
              </Grid>
            </MotionCard>
          </Grid>

          {/* Seção de Dados do Cliente e Transporte */}
          <Grid item xs={12}>
            <MotionCard
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              sx={{
                p: 4,
                ...glassStyles,
                borderRadius: 4,
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  mb: 4,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}
              >
                <LocalShippingIcon />
                2. Informações de Entrega
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Cliente"
                    value={notaData.cliente}
                    onChange={(e) => setNotaData(prev => ({ ...prev, cliente: e.target.value }))}
                    InputLabelProps={{ shrink: !!notaData.cliente }}
                    required
                    InputProps={{ 
                      sx: { 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5)
                      } 
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Transportadora</InputLabel>
                    <Select
                      value={notaData.transportadora}
                      onChange={(e) => setNotaData(prev => ({ ...prev, transportadora: e.target.value }))}
                      label="Transportadora"
                      sx={{ 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5)
                      }}
                    >
                      {transportadoras.map((transportadora: any) => (
                        <MenuItem key={transportadora.id} value={transportadora.id}>
                          {transportadora.descricao}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Endereço de Entrega"
                    value={notaData.endereco}
                    onChange={(e) => setNotaData(prev => ({ ...prev, endereco: e.target.value }))}
                    InputLabelProps={{ shrink: !!notaData.endereco }}
                    multiline
                    rows={2}
                    InputProps={{ 
                      sx: { 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5)
                      } 
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Cidade/UF/CEP"
                    value={notaData.cidade}
                    onChange={(e) => setNotaData(prev => ({ ...prev, cidade: e.target.value }))}
                    InputLabelProps={{ shrink: !!notaData.cidade }}
                    InputProps={{ 
                      sx: { 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5)
                      } 
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Valor Total"
                    value={notaData.valor}
                    onChange={(e) => setNotaData(prev => ({ ...prev, valor: e.target.value }))}
                    InputLabelProps={{ shrink: !!notaData.valor }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                      sx: { 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5)
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quantidade de Volumes"
                    value={notaData.volumes}
                    onChange={(e) => setNotaData(prev => ({ ...prev, volumes: parseInt(e.target.value) || 1 }))}
                    inputProps={{ min: 1, max: 100 }}
                    required
                    InputProps={{
                      endAdornment: <InputAdornment position="end">un</InputAdornment>,
                      sx: { 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5)
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observações Adicionais"
                    placeholder="Instruções especiais para entrega..."
                    value={notaData.observacoes}
                    onChange={(e) => setNotaData(prev => ({ ...prev, observacoes: e.target.value }))}
                    InputLabelProps={{ shrink: !!notaData.observacoes }}
                    multiline
                    rows={3}
                    InputProps={{ 
                      sx: { 
                        borderRadius: 3,
                        bgcolor: alpha('#fff', 0.5)
                      } 
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 6, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setNotaData({
                    codigoBarras: '',
                    numeroNota: '',
                    cliente: '',
                    transportadora: '',
                    numeroPedido: '',
                    endereco: '',
                    valor: '',
                    volumes: 1,
                    observacoes: '',
                    cidade: ''
                  } as any)}
                  sx={{ 
                    borderRadius: 3, 
                    px: 4,
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2 }
                  }}
                >
                  Limpar Campos
                </Button>
                <Button
                  variant="contained"
                  onClick={handleGerar}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />}
                  size="large"
                  sx={{ 
                    borderRadius: 3, 
                    px: 6,
                    py: 1.5,
                    fontWeight: 700,
                    boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                    '&:hover': {
                      boxShadow: `0 12px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {saving ? 'Gerando...' : 'Gerar Etiquetas'}
                </Button>
              </Box>
            </MotionCard>
          </Grid>
        </Grid>

        {/* Diálogo de Preview das Etiquetas */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            px: 3,
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ReceiptIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Preview das Etiquetas</Typography>
            </Box>
            <IconButton onClick={() => setPreviewOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {currentLote && (
              <Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4 }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">Pedido</Typography>
                    <Typography variant="h6" fontWeight={700}>{currentLote.numeroPedido}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">Nota Fiscal</Typography>
                    <Typography variant="h6" fontWeight={700}>{currentLote.numeroNota || '---'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">Volumes</Typography>
                    <Typography variant="h6" fontWeight={700}>{currentLote.volumes}</Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="overline" color="text.secondary">Cliente</Typography>
                    <Typography variant="h6" fontWeight={700} noWrap>{currentLote.cliente}</Typography>
                  </Box>
                </Stack>

                <Divider sx={{ mb: 4 }} />

                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
                  Visualização das Etiquetas ({currentLote.volumesEtiquetas.length})
                </Typography>

                <Grid container spacing={3}>
                  {currentLote.volumesEtiquetas.map((volume, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={volume.id}>
                      <MotionCard
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        variant="outlined"
                        sx={{ 
                          borderRadius: 3,
                          overflow: 'hidden',
                          border: '2px solid',
                          borderColor: 'divider',
                          position: 'relative',
                          '&:hover': {
                            borderColor: 'primary.light',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                          }
                        }}
                      >
                        <Box sx={{ 
                          bgcolor: 'grey.50', 
                          p: 1.5, 
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Chip 
                            label={`Volume ${volume.indiceVolume}/${volume.totalVolumes}`} 
                            size="small" 
                            color="primary" 
                            sx={{ fontWeight: 600 }}
                          />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            NF: {currentLote.numeroNota}
                          </Typography>
                        </Box>

                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="h3" sx={{ 
                            fontWeight: 800, 
                            fontFamily: 'monospace',
                            mb: 2,
                            letterSpacing: '2px'
                          }}>
                            {currentLote.numeroPedido || currentLote.numeroNota}
                          </Typography>

                          <Box sx={{ 
                            height: 60, 
                            background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px)',
                            mb: 2,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.8
                          }}>
                            <Typography variant="caption" sx={{ 
                              bgcolor: 'white',
                              px: 1,
                              py: 0.2,
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              letterSpacing: '1px'
                            }}>
                              {volume.codigoVolume.substring(0, 15)}...
                            </Typography>
                          </Box>

                          <Typography variant="body2" sx={{ 
                            fontWeight: 700,
                            mb: 1,
                            color: 'text.primary',
                            height: '2.5em',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {currentLote.cliente.toUpperCase()}
                          </Typography>

                          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                            <Chip 
                              label={currentLote.transportadora} 
                              variant="outlined" 
                              size="small" 
                              sx={{ fontSize: '0.7rem' }}
                            />
                            <Chip 
                              label={new Date().toLocaleDateString('pt-BR')} 
                              variant="outlined" 
                              size="small" 
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Stack>
                          
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PrintIcon />}
                            onClick={() => handleImprimirIndividual(volume.indiceVolume)}
                            fullWidth
                            sx={{ borderRadius: 2 }}
                          >
                            Imprimir Unitário
                          </Button>
                        </CardContent>
                      </MotionCard>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <Button onClick={() => setPreviewOpen(false)} sx={{ borderRadius: 2 }}>Voltar</Button>
            <Button
              onClick={handleImprimir}
              variant="contained"
              startIcon={<PrintIcon />}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Imprimir Todas as Etiquetas
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de seleção de impressora */}
        <PrinterSelectDialog
          open={printerDialogOpen}
          onClose={() => setPrinterDialogOpen(false)}
          onPrint={handlePrintWithPrinter}
          loading={saving}
          etiquetasData={currentLote}
        />

        
      </MotionBox>
    </AnimatePresence>
  );
};

export default GerarEtiquetasContent;
