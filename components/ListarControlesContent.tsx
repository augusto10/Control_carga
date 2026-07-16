import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import type { ControleCarga as PrismaControleCarga, NotaFiscal } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// Extensão local da interface ControleCarga para incluir campos adicionais
interface ControleComNotas extends PrismaControleCarga {
  notas: NotaFiscal[];
  auditor?: any | null;
}

import { 
  Container, 
  Typography, 
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Table, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TableBody,
  Box, 
  Tooltip,
  useMediaQuery,
  useTheme,
  Alert,
  Snackbar,
  Select,
  TextField,
  Card,
  CardContent
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { CEPService } from '../services/cep';
import { useAuth } from '../contexts/AuthContext';
import { estimarFreteDfPorRegiao } from '@/lib/freteDf';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

import ResponsiveTable from './ResponsiveTable';
import ModalAssinaturaDigitalPro from './ModalAssinaturaDigitalPro';
import ModalAssinaturaSimplesAlternativo from './ModalAssinaturaSimplesAlternativo';
import ImageCapture from './ImageCapture';

interface Controle extends Omit<PrismaControleCarga, 'notas' | 'numeroManifesto' | 'assinaturaMotorista' | 'assinaturaResponsavel' | 'dataAssinaturaMotorista' | 'dataAssinaturaResponsavel'> {
  numeroManifesto: string | null;
  assinaturaMotorista: string | null;
  assinaturaResponsavel: string | null;
  dataAssinaturaMotorista: Date | null;
  dataAssinaturaResponsavel: Date | null;
  aberto: boolean;
  controle: ControleComNotas | null;
}


interface DetalhesState {
  aberto: boolean;
  controle: ControleComNotas | null;
}

interface AssinaturaState {
  aberto: boolean;
  controleId: string;
  tipo: 'motorista' | 'responsavel';
}
const ListarControlesContent: React.FC = () => {
  const { user } = useAuth();
  const { controles: controlesStore, fetchControles, finalizarControle, atualizarControle } = useStore();
  const [controles, setControles] = useState<ControleComNotas[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingButtons, setLoadingButtons] = useState<Record<string, boolean>>({});
  const [detalhesModal, setDetalhesModal] = useState<DetalhesState>({
    aberto: false,
    controle: null
  });

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    start: '',
    end: '',
    transportadora: '',
    notaFiscal: '',
    motorista: '',
    responsavel: '',
    limit: 50
  });
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);
  
  // Opções fixas de transportadoras
  const transportadorasFixas = [
    { id: 'ACERT', nome: 'ACERT', descricao: 'ACERT Transportes' },
    { id: 'ACCERT', nome: 'ACCERT', descricao: 'ACCERT Transportes' },
    { id: 'EXPRESSO_GOIAS', nome: 'EXPRESSO_GOIAS', descricao: 'Expresso Goiás' },
    { id: 'TERCEIRIZADA', nome: 'TERCEIRIZADA', descricao: 'Terceirizada' },
    { id: 'DETAFRA_TRANSPORTES', nome: 'DETAFRA_TRANSPORTES', descricao: 'Detafra Transportes' },
    { id: 'RETIRA_VENDEDOR', nome: 'RETIRA_VENDEDOR', descricao: 'Retira Vendedor' },
    { id: 'RETIRA_CLIENTE', nome: 'RETIRA_CLIENTE', descricao: 'Retira Cliente' },
    { id: 'VLOG', nome: 'VLOG', descricao: 'VLOG Transportes' },
    { id: 'ZANUELO_TRANSPORTE_LOGISTICA', nome: 'ZANUELO_TRANSPORTE_LOGISTICA', descricao: 'Zanuelo Transporte e Logistica' }
  ];

  // Função para obter o objeto da transportadora pelo ID
  const getTransportadoraById = (id: string) => {
    const encontrada = transportadorasFixas.find(t => t.id === id);
    if (!encontrada) {
      console.warn(`Transportadora com ID ${id} não encontrada`);
      return transportadorasFixas[0]; // Retorna ACCERT como padrão
    }
    return encontrada;
  };
  
  // Estilos consistentes para os botões
  const buttonStyles = {
    minWidth: '32px',
    minHeight: '32px',
    padding: '6px 10px',
    margin: '0 2px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    '&:before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(255, 255, 255, 0.1)',
      opacity: 0,
      transition: 'opacity 0.3s ease',
      zIndex: 1,
    },
    '&:hover:not(.Mui-disabled)': {
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      '&:before': {
        opacity: 1,
      },
      '&.MuiButton-containedPrimary': {
        boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)'
      },
      '&.MuiButton-containedError': {
        boxShadow: '0 2px 8px rgba(244, 67, 54, 0.4)'
      },
      '&.MuiButton-containedSuccess': {
        boxShadow: '0 2px 8px rgba(46, 125, 50, 0.4)'
      },
      '&.MuiButton-containedWarning': {
        boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)'
      }
    },
    '&:active:not(.Mui-disabled)': {
      transform: 'translateY(0)',
      transition: 'transform 0.1s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    '&.Mui-disabled': {
      opacity: 0.5,
      transform: 'none !important',
      boxShadow: 'none !important',
      pointerEvents: 'none',
      '&:before': {
        display: 'none',
      }
    },
    '& .MuiSvgIcon-root': {
      transition: 'all 0.3s ease',
      position: 'relative',
      zIndex: 2,
      fontSize: '1rem',
    },
    '&:hover .MuiSvgIcon-root': {
      transform: 'scale(1.1)'
    },
    '& .MuiButton-label': {
      position: 'relative',
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    '&.MuiButton-containedSuccess': {
      backgroundColor: '#4caf50',
      '&:hover': {
        backgroundColor: '#388e3c',
      }
    },
    '&.MuiButton-containedPrimary': {
      backgroundColor: '#1976d2',
      '&:hover': {
        backgroundColor: '#1565c0',
      }
    }
  } as const;
  
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const converterControles = useCallback((controlesStore: PrismaControleCarga[]): ControleComNotas[] => {
    console.log('[converterControles] Convertendo controles:', controlesStore.length);
    return controlesStore.map(controle => {
      const converted = {
        ...controle,
        dataCriacao: new Date(controle.dataCriacao),
        dataAssinaturaMotorista: controle.dataAssinaturaMotorista ? new Date(controle.dataAssinaturaMotorista) : null,
        dataAssinaturaResponsavel: controle.dataAssinaturaResponsavel ? new Date(controle.dataAssinaturaResponsavel) : null,
        // Garante que os campos de assinatura sejam preservados
        assinaturaMotorista: controle.assinaturaMotorista || null,
        assinaturaResponsavel: controle.assinaturaResponsavel || null,
        notas: (controle as any).notas || [],
        auditor: (controle as any).auditor || null,
        dataAuditoria: (controle as any).dataAuditoria ? new Date((controle as any).dataAuditoria) : null
      };
      
      // Log para debug das assinaturas
      if (converted.assinaturaMotorista || converted.assinaturaResponsavel) {
        console.log(`[converterControles] Controle ${controle.id} - Assinaturas:`, {
          motorista: !!converted.assinaturaMotorista,
          responsavel: !!converted.assinaturaResponsavel,
          motoristaLength: converted.assinaturaMotorista?.length || 0,
          responsavelLength: converted.assinaturaResponsavel?.length || 0
        });
      } else {
        // Log também quando não há assinaturas para debug
        console.log(`[converterControles] Controle ${controle.id} - SEM assinaturas`);
      }
      
      return converted;
    });
  }, []);

  useEffect(() => {
    setControles(converterControles(controlesStore as any));
  }, [controlesStore, converterControles]);
  const [editing, setEditing] = React.useState<ControleComNotas | null>(null);
  const [editData, setEditData] = React.useState<Partial<Omit<PrismaControleCarga, 'id' | 'dataCriacao' | 'notas'>>>({});
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [assinaturaAberta, setAssinaturaAberta] = React.useState<AssinaturaState>({
    aberto: false,
    controleId: '',
    tipo: 'motorista'
  });

  const [imageCaptureOpen, setImageCaptureOpen] = React.useState(false);
  const [currentControleId, setCurrentControleId] = React.useState<string>('');
  const [previewImageOpen, setPreviewImageOpen] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string>('');

  // Função para capturar imagem
  const handleCapturarImagem = (controle: ControleComNotas) => {
    setCurrentControleId(controle.id);
    setImageCaptureOpen(true);
  };

  // Função chamada quando a imagem é capturada (abre preview)
  const handleImageCapture = async (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setImageCaptureOpen(false);
    setPreviewImageOpen(true);
  };

  // Função para aprovar e salvar a imagem
  const handleAprovarImagem = async () => {
    try {
      setLoading(true);

      // Buscar controle atual
      const controleAtual = controles.find(c => c.id === currentControleId);
      if (!controleAtual) {
        throw new Error('Controle não encontrado');
      }

      // Adicionar nova imagem ao array existente
      const imagensAtuais = controleAtual.imagens || [];
      const novasImagens = [...imagensAtuais, capturedImage];

      // Atualizar controle no banco usando a API específica
      await api.put(`/api/controles/${currentControleId}`, {
        imagens: novasImagens
      });

      // Criar controle atualizado localmente
      const controleAtualizado = {
        ...controleAtual,
        imagens: novasImagens
      };

      // Atualizar a lista local substituindo o controle antigo pelo novo
      setControles(prevControles => 
        prevControles.map(c => 
          c.id === currentControleId ? controleAtualizado : c
        )
      );

      // Atualizar o modal de detalhes se estiver aberto
      if (detalhesModal.aberto && detalhesModal.controle?.id === currentControleId) {
        setDetalhesModal({
          aberto: true,
          controle: controleAtualizado
        });
      }

      enqueueSnackbar('Imagem adicionada com sucesso!', { variant: 'success' });

      // Fechar modal e limpar estados
      setPreviewImageOpen(false);
      setCapturedImage('');
      setCurrentControleId('');

    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      enqueueSnackbar('Erro ao salvar imagem', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Função para rejeitar a imagem e tirar outra
  const handleRejeitarImagem = () => {
    setCapturedImage('');
    setPreviewImageOpen(false);
    setImageCaptureOpen(true);
  };

  // Função para cancelar completamente
  const handleCancelarCaptura = () => {
    setCapturedImage('');
    setPreviewImageOpen(false);
    setCurrentControleId('');
  };

  // Função para excluir uma imagem específica
  const handleExcluirImagem = async (controleId: string, indexImagem: number) => {
    if (!confirm('Deseja realmente excluir esta imagem?')) {
      return;
    }

    try {
      setLoading(true);

      // Buscar controle atual
      const controleAtual = controles.find(c => c.id === controleId);
      if (!controleAtual) {
        throw new Error('Controle não encontrado');
      }

      // Remover a imagem do array
      const imagensAtuais = controleAtual.imagens || [];
      const novasImagens = imagensAtuais.filter((_, index) => index !== indexImagem);

      // Atualizar controle no banco
      await api.put(`/api/controles/${controleId}`, {
        imagens: novasImagens
      });

      // Atualizar lista local
      await fetchControles();
      setControles(converterControles(controlesStore as any));

      // Atualizar o modal de detalhes se estiver aberto
      if (detalhesModal.aberto && detalhesModal.controle?.id === controleId) {
        const controleAtualizado = controles.find(c => c.id === controleId);
        if (controleAtualizado) {
          setDetalhesModal({
            aberto: true,
            controle: controleAtualizado
          });
        }
      }

      enqueueSnackbar('Imagem excluída com sucesso!', { variant: 'success' });

    } catch (error) {
      console.error('Erro ao excluir imagem:', error);
      enqueueSnackbar('Erro ao excluir imagem', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        
        // Carregar apenas os últimos 2 dias por padrão
        const hoje = new Date();
        const doisDiasAtras = new Date();
        doisDiasAtras.setDate(hoje.getDate() - 2);
        
        const filtrosIniciais = {
          start: format(doisDiasAtras, 'yyyy-MM-dd'),
          end: format(hoje, 'yyyy-MM-dd'),
          transportadora: '',
          notaFiscal: '',
          motorista: '',
          responsavel: '',
          limit: 50
        };
        
        // Atualizar estado dos filtros
        setFiltros(prev => ({
          ...prev,
          ...filtrosIniciais
        }));
        
        console.log('🔄 [ListarControles] Carregando últimos 2 dias:', filtrosIniciais);
        await fetchControles(filtrosIniciais);
        
      } catch (error) {
        console.error('Erro ao carregar controles:', error);
        enqueueSnackbar('Erro ao carregar controles', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []); // Executar apenas uma vez ao montar o componente

  // Atualiza a lista local quando controlesStore muda
  useEffect(() => {
    setControles(converterControles(controlesStore as any));
  }, [controlesStore, converterControles]);

  // Funções para gerenciar filtros
  const handleFiltroChange = (campo: string, valor: string | number) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      console.log('🔍 [ListarControles] Aplicando filtros:', filtros);
      
      // Filtrar apenas campos não vazios
      const filtrosLimpos = Object.entries(filtros).reduce((acc, [key, value]) => {
        if (value !== '' && value !== 0) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      await fetchControles(filtrosLimpos);
      setFiltrosAtivos(Object.keys(filtrosLimpos).length > 1); // Mais que apenas limit
      
    } catch (error) {
      console.error('Erro ao aplicar filtros:', error);
      enqueueSnackbar('Erro ao aplicar filtros', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = async () => {
    try {
      setLoading(true);
      
      // Resetar para últimos 2 dias
      const hoje = new Date();
      const doisDiasAtras = new Date();
      doisDiasAtras.setDate(hoje.getDate() - 2);
      
      const filtrosIniciais = {
        start: format(doisDiasAtras, 'yyyy-MM-dd'),
        end: format(hoje, 'yyyy-MM-dd'),
        transportadora: '',
        notaFiscal: '',
        motorista: '',
        responsavel: '',
        limit: 50
      };
      
      setFiltros(filtrosIniciais);
      await fetchControles({
        start: filtrosIniciais.start,
        end: filtrosIniciais.end,
        limit: filtrosIniciais.limit
      });
      setFiltrosAtivos(false);
      
    } catch (error) {
      console.error('Erro ao limpar filtros:', error);
      enqueueSnackbar('Erro ao limpar filtros', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filtrarHoje = async () => {
    try {
      setLoading(true);
      const hoje = format(new Date(), 'yyyy-MM-dd');
      
      const filtrosHoje = {
        ...filtros,
        start: hoje,
        end: hoje
      };
      
      setFiltros(filtrosHoje);
      await fetchControles(filtrosHoje);
      setFiltrosAtivos(true);
      
    } catch (error) {
      console.error('Erro ao filtrar por hoje:', error);
      enqueueSnackbar('Erro ao filtrar por hoje', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const gerarPdf = async (controle: ControleComNotas) => {
    // Importar dependências necessárias
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    try {
      const controlePdf = await api
        .get(`/api/controles/${controle.id}/pdf-dados`)
        .then((response) => response.data as ControleComNotas)
        .catch(() => controle);

      // Garante que as propriedades opcionais estejam definidas
      const controleCompleto: ControleComNotas = {
        ...controlePdf,
        numeroManifesto: 'numeroManifesto' in controle ? controle.numeroManifesto : null,
        motorista: controle.motorista || '',
        responsavel: controle.responsavel || '',
        cpfMotorista: 'cpfMotorista' in controle ? controle.cpfMotorista || '' : '',
        transportadora: controle.transportadora || 'ACERT',
        qtdPallets: 'qtdPallets' in controle ? controle.qtdPallets || 0 : 0,
        // Novos campos opcionais
        ...(('qtdPalletsLevados' in controle) ? { qtdPalletsLevados: (controle as any).qtdPalletsLevados || 0 } : {}),
        ...(('qtdPalletsDevolvidos' in controle) ? { qtdPalletsDevolvidos: (controle as any).qtdPalletsDevolvidos || 0 } : {}),
        ...(('placaVeiculo' in controle) ? { placaVeiculo: (controle as any).placaVeiculo || '' } : {}),
        observacao: 'observacao' in controle ? controle.observacao || '' : '',
        finalizado: 'finalizado' in controle ? !!controle.finalizado : false,
        assinaturaMotorista: 'assinaturaMotorista' in controle ? controle.assinaturaMotorista || null : null,
        assinaturaResponsavel: 'assinaturaResponsavel' in controle ? controle.assinaturaResponsavel || null : null,
        dataAssinaturaMotorista: 'dataAssinaturaMotorista' in controle ? controle.dataAssinaturaMotorista || null : null,
        dataAssinaturaResponsavel: 'dataAssinaturaResponsavel' in controle ? controle.dataAssinaturaResponsavel || null : null,
        notas: 'notas' in controlePdf ? (controlePdf.notas || []) : []
      };
      const extrairChaveNFe = (codigo: string): string | null => {
        if (!codigo) return null;
        const codigoLimpo = String(codigo).replace(/[^\d]/g, '');
        if (codigoLimpo.length === 44) return codigoLimpo;
        if (codigoLimpo.length > 44) {
          for (let i = 0; i <= codigoLimpo.length - 44; i++) {
            const bloco = codigoLimpo.substring(i, i + 44);
            if (/^\d{44}$/.test(bloco)) return bloco;
          }
        }
        return null;
      };
      const pickTexto = (...values: Array<unknown>) => {
        for (const value of values) {
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
          }
          if (typeof value === 'number') {
            return String(value);
          }
        }
        return null;
      };
      const resolveCnpj = (nota: any) => {
        return pickTexto(
          nota?.CNPJ_CPF,
          nota?.cnpj,
          nota?.CNPJ,
          nota?.CNPJ_DESTINATARIO,
          nota?.CNPJ_EMITENTE,
          nota?.CNPJ_CLIENTE,
          nota?.CNPJ_CPF_DESTINATARIO,
          nota?.CPF_CNPJ,
          nota?.cliente?.cnpj,
          nota?.emitente?.cnpj
        );
      };
      const toNumber = (x: any) => {
        if (x === null || x === undefined) return undefined;
        let s = String(x).trim().replace(/R\$\s*/g, '');
        if (s === '') return undefined;
        const hasComma = s.includes(',');
        if (hasComma) {
          s = s.replace(/\./g, '').replace(',', '.');
        }
        const n = Number(s);
        return isNaN(n) ? undefined : n;
      };
      const notaExternaCache = new Map<string, any>();
      const buscarNotaExternaCache = async (params: Record<string, string>) => {
        const cacheKey = Object.entries(params)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([chave, valor]) => `${chave}:${valor}`)
          .join('|');

        if (notaExternaCache.has(cacheKey)) {
          return notaExternaCache.get(cacheKey);
        }

        const promise = api
          .get('/api/buscar-nota-externa', { params })
          .then((resp) => resp.data || {})
          .catch(() => ({}));

        notaExternaCache.set(cacheKey, promise);
        const data = await promise;
        notaExternaCache.set(cacheKey, data);
        return data;
      };
      const notasParaPdf = await Promise.all(
        (controleCompleto.notas || []).map(async (nota) => {
          const base = { ...nota };
          try {
            if ((base as any)._pdfEnriquecida) return base;
            const chave = extrairChaveNFe(base.codigo || '');
            if (chave) {
              const d = await buscarNotaExternaCache({ chave });
              const valorFromD = toNumber(d.valorPedido ?? d.valor ?? d.VALOR_TOTAL_NOTA ?? d.VALOR_TOTAL ?? (d as any).TOTAL ?? (d as any).total);
              const pesoFromD = toNumber(
                (d as any).TOTAL_PESO ?? (d as any).PESO_TOTAL ?? (d as any).PESO_NOTA ??
                d.pesoBruto ?? d.peso ??
                (d as any).PESO_BRUTO ?? (d as any).PESO ?? (d as any).PESO_LIQUIDO ?? (d as any).peso_liquido
              );
              const valorFromBase = toNumber((base as any).valorPedido ?? (base as any).valor ?? (base as any).VALOR_TOTAL ?? (base as any).TOTAL ?? (base as any).valor_total);
              const pesoFromBase = toNumber(
                (base as any).pesoBruto ?? (base as any).peso ??
                (base as any).PESO_BRUTO ?? (base as any).PESO ?? (base as any).PESO_LIQUIDO ?? (base as any).peso_liquido ??
                (base as any).PESO_TOTAL ?? (base as any).PESO_NOTA ?? (base as any).TOTAL_PESO
              );
              const valorFinal = (valorFromBase !== undefined) ? valorFromBase : valorFromD;
              const pesoFinal = (pesoFromBase !== undefined && pesoFromBase > 0) ? pesoFromBase : pesoFromD;
              return {
                ...base,
                volumes: String(base.volumes ?? d.volumes ?? '1'),
                valorPedido: valorFinal,
                razaoSocial: (base as any).razaoSocial ?? d.razaoSocial ?? d.cliente?.nome ?? d.cliente?.razaoSocial ?? d.NOME_RAZAO_SOCIAL,
                pesoBruto: pesoFinal,
                dataEmissao: (base as any).dataEmissao ?? d.dataEmissao ?? d.DATA_EMISSAO,
                cnpj: resolveCnpj({
                  ...(base as any),
                  ...(d || {})
                }) || undefined,
              };
            }
            if (base.numeroNota) {
              const d = await buscarNotaExternaCache({ numero: String(base.numeroNota), serie: '1' });
              const valorFromD = toNumber(d.valorPedido ?? d.valor ?? d.VALOR_TOTAL_NOTA ?? d.VALOR_TOTAL ?? (d as any).TOTAL ?? (d as any).total);
              const pesoFromD = toNumber(
                (d as any).TOTAL_PESO ?? (d as any).PESO_TOTAL ?? (d as any).PESO_NOTA ??
                d.pesoBruto ?? d.peso ??
                (d as any).PESO_BRUTO ?? (d as any).PESO ?? (d as any).PESO_LIQUIDO ?? (d as any).peso_liquido
              );
              const valorFromBase = toNumber((base as any).valorPedido ?? (base as any).valor ?? (base as any).VALOR_TOTAL ?? (base as any).TOTAL ?? (base as any).valor_total);
              const pesoFromBase = toNumber(
                (base as any).pesoBruto ?? (base as any).peso ??
                (base as any).PESO_BRUTO ?? (base as any).PESO ?? (base as any).PESO_LIQUIDO ?? (base as any).peso_liquido ??
                (base as any).PESO_TOTAL ?? (base as any).PESO_NOTA ?? (base as any).TOTAL_PESO
              );
              const valorFinal = (valorFromBase !== undefined) ? valorFromBase : valorFromD;
              const pesoFinal = (pesoFromBase !== undefined && pesoFromBase > 0) ? pesoFromBase : pesoFromD;
              return {
                ...base,
                volumes: String(base.volumes ?? d.volumes ?? '1'),
                valorPedido: valorFinal,
                razaoSocial: (base as any).razaoSocial ?? d.razaoSocial ?? d.cliente?.nome ?? d.cliente?.razaoSocial ?? d.NOME_RAZAO_SOCIAL,
                pesoBruto: pesoFinal,
                dataEmissao: (base as any).dataEmissao ?? d.dataEmissao ?? d.DATA_EMISSAO,
                cnpj: resolveCnpj({
                  ...(base as any),
                  ...(d || {})
                }) || undefined,
              };
            }
          } catch (_) {}
          return base;
        })
      );
      const existingBytes = await fetch('/templates/modelo-romaneio.pdf').then(res => res.arrayBuffer());
      const doc = await PDFDocument.load(existingBytes);
      let page = doc.getPage(0);
      let { width, height } = page.getSize();
      
      // Usar fonte padrão do PDF
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontSize = 9; // fonte menor para caber mais linhas
      const lineHeight = 12; // altura da linha ainda mais reduzida
      const topMargin = 40; // margem superior reduzida
      const bottomMargin = 50; // espaço para rodapés/assinaturas reduzido
      const minSpaceForSignatures = 160; // espaço otimizado para duas assinaturas
      let yPos = height - topMargin;

      // Helpers de paginação (uma coluna)
      const tableBaseX = 40;

      const drawTableHeaderForColumn = (baseX: number, headerY: number) => {
        const col1 = baseX;       // Qtd
        const col2 = baseX + 30;  // Nota Fiscal
        const col3 = baseX + 110; // Data
        const col4 = baseX + 200; // Valor
        const col5 = baseX + 300; // Peso
        const col6 = baseX + 400; // Volumes
        page.drawText('Qtd', { x: col1, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText('Nota Fiscal', { x: col2, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText('Data', { x: col3, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText('Valor', { x: col4, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText('Peso', { x: col5, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText('Volumes', { x: col6, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        // linha sob o cabeçalho desta coluna
        page.drawLine({
          start: { x: baseX, y: headerY - 5 },
          end: { x: width - 50, y: headerY - 5 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
        return { col1, col2, col3, col4, col5, col6, nextY: headerY - 24 };
      };

      const addNewPage = () => {
        const newPage = doc.addPage([width, height]);
        page = newPage;
        // Atualiza dimensões caso o template tenha tamanhos diferentes
        const size = page.getSize();
        width = size.width; height = size.height;
        yPos = height - topMargin;
      };

      // Cabeçalho
      // Usa a mesma referência de data/hora exibida na lista: dataCriacao do controle
      const dataHoraCriacao = controleCompleto.dataCriacao ? new Date(controleCompleto.dataCriacao) : new Date();
      const dataAtual = format(dataHoraCriacao, 'dd/MM/yyyy', { locale: ptBR });
      const horaAtual = format(dataHoraCriacao, 'HH:mm', { locale: ptBR });
      
      // Ajustando posição inicial mais para baixo
      yPos -= lineHeight * 9; // Aumentado de 6 para 9 linhas (3 linhas a mais)
      
      // Linha 1
      console.log('[PDF] Transportadora do controle:', controleCompleto.transportadora);
      const transportadoraExibida = getTransportadoraById(controleCompleto.transportadora || 'ACCERT');
      console.log('[PDF] Transportadora exibida:', transportadoraExibida);
      page.drawText(`Transportadora: ${transportadoraExibida.descricao}`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Usuário: ${controleCompleto.responsavel}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 2
      yPos -= lineHeight * 1.5;
      page.drawText(`Placa Veículo: ${(((controle as any).placaVeiculo || (controleCompleto as any).placaVeiculo || '-') as string).toString().toUpperCase()}`,
        { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Nome Motorista: ${controleCompleto.motorista}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 3
      yPos -= lineHeight * 1.5;
      page.drawText(`CPF Motorista: ${controleCompleto.cpfMotorista}`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Horário: ${horaAtual}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 4 - Pallets (novos campos)
      yPos -= lineHeight * 1.5;
      const palletsLevados = Number((controle as any).qtdPalletsLevados ?? (controleCompleto as any).qtdPalletsLevados ?? 0);
      const palletsDevolvidos = Number((controle as any).qtdPalletsDevolvidos ?? (controleCompleto as any).qtdPalletsDevolvidos ?? 0);
      page.drawText(`Pallets Levados: ${palletsLevados}`,
        { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Pallets Devolvidos: ${palletsDevolvidos}`,
        { x: 250, y: yPos, size: fontSize, font });

      // Linha 5 - Diferença e Data
      yPos -= lineHeight * 1.5;
      const _lev = palletsLevados;
      const _dev = palletsDevolvidos;
      const _diff = _lev - _dev;
      page.drawText(`Diferença: ${_diff}`,{ x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Data: ${dataAtual}`, { x: 250, y: yPos, size: fontSize, font });

      // Imagens (se houver) - Layout otimizado para caber em uma folha
      if (controleCompleto.imagens && controleCompleto.imagens.length > 0) {
        yPos -= lineHeight * 1.5;
        page.drawText('Imagens Anexadas:', { x: 50, y: yPos, size: fontSize, font });
        yPos -= lineHeight;

        // Calcular espaço disponível para imagens
        const espacoDisponivel = yPos - (bottomMargin + minSpaceForSignatures + 100); // Reserva espaço para tabela e assinaturas
        const numImagens = controleCompleto.imagens.length;
        
        // Determinar layout baseado no número de imagens e espaço disponível
        let imagensLayout: { width: number; height: number; cols: number; rows: number };
        
        if (numImagens === 1) {
          // Uma imagem: tamanho médio
          imagensLayout = { width: 120, height: 90, cols: 1, rows: 1 };
        } else if (numImagens === 2) {
          // Duas imagens: lado a lado
          imagensLayout = { width: 100, height: 75, cols: 2, rows: 1 };
        } else if (numImagens <= 4) {
          // 3-4 imagens: 2x2 ou 2x1
          imagensLayout = { width: 80, height: 60, cols: 2, rows: Math.ceil(numImagens / 2) };
        } else if (numImagens <= 6) {
          // 5-6 imagens: layout compacto 3 colunas
          imagensLayout = { width: 60, height: 45, cols: 3, rows: Math.ceil(numImagens / 3) };
        } else {
          // Muitas imagens (7+): layout ultra compacto 4 colunas
          imagensLayout = { width: 45, height: 35, cols: 4, rows: Math.ceil(numImagens / 4) };
        }

        // Ajustar tamanho se não couber no espaço disponível
        const alturaTotal = imagensLayout.rows * (imagensLayout.height + 20); // +20 para espaçamento
        if (alturaTotal > espacoDisponivel) {
          const fatorReducao = espacoDisponivel / alturaTotal * 0.9; // 90% para margem de segurança
          imagensLayout.width *= fatorReducao;
          imagensLayout.height *= fatorReducao;
        }

        // Processar imagens no layout otimizado
        let imagemIndex = 0;
        for (let row = 0; row < imagensLayout.rows && imagemIndex < numImagens; row++) {
          for (let col = 0; col < imagensLayout.cols && imagemIndex < numImagens; col++) {
            const imagem = controleCompleto.imagens[imagemIndex];
            
            try {
              // Detectar o formato da imagem
              const imageMatch = imagem.match(/^data:image\/([a-z]+);base64,/);
              const imageFormat = imageMatch ? imageMatch[1] : 'png';
              
              const imageBuffer = Buffer.from(imagem.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
              
              // Usar o método correto baseado no formato
              let image;
              if (imageFormat === 'jpeg' || imageFormat === 'jpg') {
                image = await doc.embedJpg(imageBuffer);
              } else {
                image = await doc.embedPng(imageBuffer);
              }

              // Calcular posição da imagem
              const xPos = 50 + col * (imagensLayout.width + 15); // 15px de espaçamento horizontal
              const yPosImagem = yPos - row * (imagensLayout.height + 25) - imagensLayout.height; // 25px de espaçamento vertical

              // Desenhar imagem mantendo proporção
              const imageAspectRatio = image.width / image.height;
              let finalWidth = imagensLayout.width;
              let finalHeight = imagensLayout.height;
              
              // Ajustar para manter proporção
              if (imageAspectRatio > finalWidth / finalHeight) {
                finalHeight = finalWidth / imageAspectRatio;
              } else {
                finalWidth = finalHeight * imageAspectRatio;
              }

              page.drawImage(image, {
                x: xPos,
                y: yPosImagem,
                width: finalWidth,
                height: finalHeight,
              });

              // Label da imagem (menor e mais compacto)
              page.drawText(`${imagemIndex + 1}`, {
                x: xPos + finalWidth / 2 - 5,
                y: yPosImagem - 12,
                size: fontSize - 2,
                font,
                color: rgb(0.5, 0.5, 0.5)
              });

            } catch (error) {
              console.error(`Erro ao adicionar imagem ${imagemIndex + 1}:`, error);
              const xPos = 50 + col * (imagensLayout.width + 15);
              const yPosImagem = yPos - row * (imagensLayout.height + 25);
              
              page.drawText(`[Erro Img ${imagemIndex + 1}]`, {
                x: xPos,
                y: yPosImagem,
                size: fontSize - 2,
                font,
                color: rgb(0.8, 0, 0)
              });
            }
            
            imagemIndex++;
          }
        }

        // Ajustar yPos após todas as imagens
        yPos -= imagensLayout.rows * (imagensLayout.height + 25) + 10;
      }
      
      // Tabela de Notas (uma coluna) - Ajustada dinamicamente
      yPos -= lineHeight * 1.5; // Espaço reduzido antes da tabela
      
      // Calcular quantas linhas cabem no espaço restante
      const espacoRestante = yPos - (bottomMargin + minSpaceForSignatures);
      const rowSpacing = lineHeight * 2; // cada nota consome duas linhas (principal + detalhes)
      const maxRowsPossivel = Math.floor(espacoRestante / rowSpacing) - 2; // reserva espaço para totais
      const maxRowsPerPage = Math.max(8, Math.min(22, maxRowsPossivel));
      
      // Cabeçalho para a coluna única
      const header = drawTableHeaderForColumn(tableBaseX, yPos);
      let yRow = header.nextY;
      let rows = 0;

      const drawNota = (idx: number, nota: any, cols: {col1:number,col2:number,col3:number,col4:number,col5:number,col6:number}, y: number) => {
        const volumes = parseInt(nota.volumes) || 1;
        const dataNota = nota.dataCriacao
          ? new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit', month: '2-digit', year: 'numeric',
            }).format(new Date(nota.dataCriacao))
          : '-';
        
        // Detalhes adicionais (valor, razão social, peso, emissão, CNPJ)
        const nf: any = nota || {};
        const rawValor = nf.valorPedido ?? nf.valor ?? nf.VALOR_TOTAL ?? nf.valor_total ?? undefined;
        let valorNum: number | undefined;
        if (typeof rawValor === 'number') {
          valorNum = rawValor;
        } else if (typeof rawValor === 'string') {
          const parsed = Number(rawValor.replace(',', '.'));
          valorNum = isNaN(parsed) ? undefined : parsed;
        }
        const valorFmt = (valorNum !== undefined)
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNum)
          : '-';
        
        const rawPeso = nf.pesoBruto ?? nf.peso ?? undefined;
        let pesoNum: number | undefined;
        if (typeof rawPeso === 'number') {
          pesoNum = rawPeso;
        } else if (typeof rawPeso === 'string') {
          const parsedPeso = Number(rawPeso.replace(',', '.'));
          pesoNum = isNaN(parsedPeso) ? undefined : parsedPeso;
        }
        const pesoFmt = (pesoNum !== undefined)
          ? `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(pesoNum)} kg`
          : '-';

        page.drawText((idx + 1).toString(), { x: cols.col1, y, size: fontSize, font });
        page.drawText(nota.numeroNota || '-', { x: cols.col2, y, size: fontSize, font });
        page.drawText(dataNota, { x: cols.col3, y, size: fontSize, font });
        page.drawText(valorFmt, { x: cols.col4, y, size: fontSize, font });
        page.drawText(pesoFmt, { x: cols.col5, y, size: fontSize, font });
        page.drawText(String(volumes), { x: cols.col6, y, size: fontSize, font });
        
        const razao = nf.razaoSocial ?? nf.cliente?.nome ?? nf.emitente?.razaoSocial ?? '-';
        const emRaw = nf.dataEmissao ?? nf.DATA_EMISSAO ?? undefined;
        const emFmt = emRaw ? new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit', month: '2-digit', year: 'numeric',
        }).format(new Date(emRaw)) : '-';
        const cnpj = resolveCnpj(nf) ?? '-';
        
        const detalhes = `Razão: ${String(razao).slice(0, 45)} • Emissão: ${emFmt} • CNPJ: ${cnpj}`;
        page.drawText(detalhes, { x: cols.col2, y: y - (lineHeight - 2), size: fontSize - 2, font, color: rgb(0.35, 0.35, 0.35) });
      };

      let totalVolumes = 0;
      let totalValor = 0;
      let totalPeso = 0;
      notasParaPdf.forEach((nota, index) => {
        const volumes = parseInt(nota.volumes) || 1;
        totalVolumes += volumes;
        const valorItem = (typeof (nota as any).valorPedido === 'number')
          ? (nota as any).valorPedido
          : (typeof (nota as any).valor === 'number' ? (nota as any).valor : undefined);
        if (typeof valorItem === 'number') totalValor += valorItem;
        const pesoItem = (typeof (nota as any).pesoBruto === 'number')
          ? (nota as any).pesoBruto
          : (typeof (nota as any).peso === 'number' ? (nota as any).peso : undefined);
        if (typeof pesoItem === 'number') totalPeso += pesoItem;

        const noSpace = (rows >= maxRowsPerPage) || (yRow < bottomMargin + minSpaceForSignatures + lineHeight);
        if (noSpace) {
          page.drawText('Continua na próxima página...', { x: 50, y: 40, size: fontSize - 2, font, color: rgb(0.5, 0.5, 0.5) });
          addNewPage();
          const newHeader = drawTableHeaderForColumn(tableBaseX, yPos);
          yRow = newHeader.nextY;
          rows = 0;
        }

        drawNota(index, nota, header, yRow);
        yRow -= rowSpacing;
        rows += 1;
      });
      
      // Totalizadores
      const totalValorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor);
      const totalPesoFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(totalPeso);
      
      yPos = yRow - 8;
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPos -= lineHeight;
      
      // Totais alinhados na coluna esquerda
      page.drawText('TOTAL:', { x: header.col2, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(notasParaPdf.length.toString(), { x: header.col1, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(totalValorFmt, { x: header.col4, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(`${totalPesoFmt} kg`, { x: header.col5, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(totalVolumes.toString(), { x: header.col6, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      
      // Rodapé
      yPos -= lineHeight * 2;
      page.drawText(`Nº Controle: ${controleCompleto.numeroManifesto || '-'}`, { x: 50, y: yPos, size: fontSize - 1, font });
      page.drawText(`Placa Veículo: ${controleCompleto.placaVeiculo || '-'}`, { x: 250, y: yPos, size: fontSize - 1, font });
      page.drawText(`Total de Volumes: ${totalVolumes}`, { x: 420, y: yPos, size: fontSize - 1, font });
      yPos -= lineHeight;
      page.drawText(`Pallets Levados: ${controleCompleto.qtdPalletsLevados || 0}`, { x: 50, y: yPos, size: fontSize - 1, font });
      page.drawText(`Pallets Devolvidos: ${controleCompleto.qtdPalletsDevolvidos || 0}`, { x: 250, y: yPos, size: fontSize - 1, font });
      const diferenca = (controleCompleto.qtdPalletsLevados || 0) - (controleCompleto.qtdPalletsDevolvidos || 0);
      page.drawText(`Diferença: ${diferenca}`, { x: 420, y: yPos, size: fontSize - 1, font });
      yPos -= lineHeight;
      page.drawText(`Total de Valor: ${totalValorFmt}`, { x: 50, y: yPos, size: fontSize - 1, font });
      page.drawText(`Total de Peso: ${totalPesoFmt} kg`, { x: 250, y: yPos, size: fontSize - 1, font });
      const valorFreteControle = Number((controle as any).valorFrete ?? (controleCompleto as any).valorFrete ?? 0);
      const freteInformadoControle = Boolean((controle as any).freteInformado ?? (controleCompleto as any).freteInformado);
      if (freteInformadoControle) {
        yPos -= lineHeight;
        page.drawText(
          `Frete Terceirizado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFreteControle)}`,
          { x: 50, y: yPos, size: fontSize - 1, font }
        );
      }

      // Seção de Assinaturas
      // Garante espaço suficiente; se não houver, cria nova página para as assinaturas
      if (yPos < bottomMargin + minSpaceForSignatures) {
        addNewPage();
      }
      yPos -= lineHeight * 2;
      
      // Linha divisória para assinaturas
      const assinaturaY = yPos - 10;
      
      // Função para desenhar o carimbo de assinatura digital
      const drawDigitalStamp = async (x: number, y: number, name: string, signature: string | null, signatureDate: Date | null) => {
        // Desenha o nome
        const nameY = y;
        page.drawText(name, { x, y: nameY, size: fontSize, font });
        
        if (signature) {
          try {
            // Desenha a assinatura como imagem
            const signatureImage = await doc.embedPng(signature);
            const signatureAspectRatio = signatureImage.width / signatureImage.height;
            const signatureWidth = 150;
            const signatureHeight = signatureWidth / signatureAspectRatio;
            
            // Desenha a assinatura
            page.drawImage(signatureImage, {
              x: x,
              y: nameY - 20 - signatureHeight, // Reduzido para ficar mais próximo do carimbo
              width: signatureWidth,
              height: signatureHeight,
            });
            
            // Desenha o carimbo digital abaixo da assinatura com mais espaço
            const stampX = x - 8;
            const stampY = nameY - 35 - signatureHeight; // Reduzido para ficar mais próximo da assinatura
            const stampWidth = signatureWidth + 16;
            const stampHeight = 45; // Aumentado para acomodar melhor o conteúdo
            
            // Fundo do carimbo com bordas arredondadas (simulado)
            const cornerRadius = 4;
            
            // Retângulo principal com borda arredondada
            page.drawRectangle({
              x: stampX,
              y: stampY - stampHeight,
              width: stampWidth,
              height: stampHeight,
              borderWidth: 0.8,
              borderColor: rgb(0, 0.6, 0),
              borderOpacity: 0.6,
              color: rgb(0.98, 1, 0.98), // Fundo mais branco
              opacity: 0.9,
              borderDashArray: [1, 1],
            });
            
            // Linha decorativa superior
            page.drawLine({
              start: { x: stampX + 10, y: stampY - 5 },
              end: { x: stampX + stampWidth - 10, y: stampY - 5 },
              thickness: 1.5,
              color: rgb(0, 0.5, 0),
              opacity: 0.3,
            });
            
            // Texto do carimbo com fonte em negrito
            const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
            page.drawText('ASSINATURA DIGITAL', {
              x: stampX + (stampWidth / 2) - 45, // Centralizado
              y: stampY - 22,
              size: fontSize - 1,
              font: boldFont,
              color: rgb(0, 0.4, 0),
              opacity: 0.9,
            });
            
            // Linha decorativa abaixo do texto
            page.drawLine({
              start: { x: stampX + 15, y: stampY - 26 },
              end: { x: stampX + stampWidth - 15, y: stampY - 26 },
              thickness: 0.5,
              color: rgb(0, 0.5, 0),
              opacity: 0.3,
            });
            
            // Data e hora da assinatura mais abaixo
            if (signatureDate) {
              const dateStr = new Date(signatureDate).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'America/Sao_Paulo'
              });
              
              // Texto da data com fundo sutil
              const dateText = `Assinado em: ${dateStr}`;
              const dateTextWidth = font.widthOfTextAtSize(dateText, fontSize - 3);
              
              // Fundo sutil para a data
              page.drawRectangle({
                x: stampX + (stampWidth - dateTextWidth) / 2 - 3,
                y: stampY - stampHeight + 6,
                width: dateTextWidth + 6,
                height: 14,
                color: rgb(0.95, 1, 0.95),
                borderWidth: 0.5,
                borderColor: rgb(0.9, 0.9, 0.9),
                opacity: 0.7,
              });
              
              // Texto da data
              page.drawText(dateText, {
                x: stampX + (stampWidth - dateTextWidth) / 2,
                y: stampY - stampHeight + 8,
                size: fontSize - 3,
                font,
                color: rgb(0, 0.3, 0),
              });
            }
            
            // Retorna a posição Y para o próximo elemento
            return stampY - stampHeight - 10;
            
          } catch (error) {
            console.error('Erro ao processar assinatura digital:', error);
            // Fallback para o modo texto se houver erro ao processar a imagem
            const fallbackY = y - 25;
            page.drawText('Assinatura Digital', { 
              x, 
              y: fallbackY, 
              size: fontSize - 1, 
              font, 
              color: rgb(0, 0.5, 0) 
            });
            
            // Adiciona a data mesmo no fallback
            if (signatureDate) {
              const dateStr = new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
              }).format(new Date(signatureDate));
              page.drawText(`Assinado em: ${dateStr}`, {
                x,
                y: fallbackY - 15,
                size: fontSize - 2,
                font,
                color: rgb(0, 0.4, 0),
              });
              return fallbackY - 35;
            }
            
            return fallbackY - 20;
          }
          
        } else {
          // Gera carimbo automático quando não há assinatura
          const stampY = y - 25;
          const stampWidth = 200;
          const stampHeight = 60;
          
          // Fundo do carimbo com bordas arredondadas (simulado)
          page.drawRectangle({
            x: x,
            y: stampY - stampHeight,
            width: stampWidth,
            height: stampHeight,
            borderWidth: 1,
            borderColor: rgb(0, 0.6, 0),
            borderOpacity: 0.8,
            color: rgb(0.98, 1, 0.98),
            opacity: 0.9,
            borderDashArray: [2, 2],
          });
          
          // Texto do carimbo
          const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
          page.drawText('CARIMBO AUTOMÁTICO', {
            x: x + (stampWidth / 2) - 65,
            y: stampY - 20,
            size: fontSize,
            font: boldFont,
            color: rgb(0, 0.4, 0),
            opacity: 0.9,
          });
          
          // Texto com nome e data
          const currentDate = new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
          });
          
          page.drawText(`Assinado por: ${name}`, {
            x: x + 10,
            y: stampY - 40,
            size: fontSize - 2,
            font,
            color: rgb(0, 0.3, 0),
          });
          
          page.drawText(`Data: ${currentDate}`, {
            x: x + 10,
            y: stampY - 55,
            size: fontSize - 2,
            font,
            color: rgb(0, 0.3, 0),
          });
          
          // Retorna a posição Y para o próximo elemento
          return stampY - stampHeight - 10;
        }
      };
      
      // Assinatura do Motorista
      page.drawText('Motorista:', { x: 100, y: yPos - 10, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
      const motoristaY = await (async () => {
        try {
          return await drawDigitalStamp(
            100, 
            yPos - 35,
            controleCompleto.motorista, 
            controleCompleto.assinaturaMotorista,
            controleCompleto.dataAssinaturaMotorista
          );
        } catch (error) {
          console.error('Erro ao desenhar assinatura do motorista:', error);
          return yPos - 50; // Retorna uma posição padrão em caso de erro
        }
      })();

      // Assinatura do Responsável
      page.drawText('Responsável:', { x: 350, y: yPos - 10, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
      const responsavelY = await (async () => {
        try {
          return await drawDigitalStamp(
            350, 
            yPos - 35,
            controleCompleto.responsavel, 
            controleCompleto.assinaturaResponsavel,
            controleCompleto.dataAssinaturaResponsavel
          );
        } catch (error) {
          console.error('Erro ao desenhar assinatura do responsável:', error);
          return yPos - 50; // Retorna uma posição padrão em caso de erro
        }
      })();
      
      // Rodapé com informações de assinatura digital
      const footerY = Math.min(motoristaY, responsavelY) - 20;
      if (controleCompleto.assinaturaMotorista || controleCompleto.assinaturaResponsavel) {
        const assinaturaInfo = [];
        
        if (controleCompleto.assinaturaMotorista && controleCompleto.dataAssinaturaMotorista) {
          const data = new Date(controleCompleto.dataAssinaturaMotorista).toLocaleString('pt-BR');
          assinaturaInfo.push(`Assinado por ${controleCompleto.motorista} em ${data}`);
        }
        
        if (controleCompleto.assinaturaResponsavel && controleCompleto.dataAssinaturaResponsavel) {
          const data = new Date(controleCompleto.dataAssinaturaResponsavel).toLocaleString('pt-BR');
          assinaturaInfo.push(`Aprovado por ${controleCompleto.responsavel} em ${data}`);
        }
        
        if (assinaturaInfo.length > 0) {
          page.drawText('DOCUMENTO ASSINADO DIGITALMENTE', {
            x: 50,
            y: footerY,
            size: fontSize - 1,
            font,
            color: rgb(0, 0.6, 0),
            opacity: 0.9
          });
          
          assinaturaInfo.forEach((info, index) => {
            page.drawText(`• ${info}`, {
              x: 50,
              y: footerY - (index + 1) * 15,
              size: fontSize - 2,
              font,
              color: rgb(0.3, 0.3, 0.3),
            });
          });
        }
      }
      
      // Data da assinatura do responsável
      const dataResponsavel = controleCompleto.dataAssinaturaResponsavel 
        ? new Date(controleCompleto.dataAssinaturaResponsavel).toLocaleDateString('pt-BR')
        : '';
      if (dataResponsavel) {
        page.drawText(`Data: ${dataResponsavel}`, { x: 350, y: assinaturaY - 45, size: fontSize - 2, font });
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfOpen(true);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      enqueueSnackbar('Erro ao gerar PDF', { variant: 'error' });
    }
  };

  const canEdit = (c: ControleComNotas): boolean => {
    if (!c.finalizado) return true;
    return user?.tipo === 'GERENTE' || user?.tipo === 'ADMIN';
  };

  const handleExcluirControle = async (controle: ControleComNotas) => {
    if (!confirm(`Tem certeza que deseja excluir o controle ${controle.numeroManifesto || controle.id.substring(0, 8)}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    const deleteKey = `delete_${controle.id}`;
    setLoadingButtons(prev => ({ ...prev, [deleteKey]: true }));

    try {
      // Corrigido para usar DELETE na rota correta
      const response = await api.delete(`/api/controles/${controle.id}`);
      
      if (response.status === 200 || response.status === 204) {
        enqueueSnackbar('Controle excluído com sucesso!', { 
          variant: 'success',
          autoHideDuration: 3000 
        });
        
        // Recarregar a lista de controles
        await fetchControles();
        setControles(converterControles(controlesStore as any));
      }
    } catch (error: any) {
      console.error('Erro ao excluir controle:', error);
      
      let errorMessage = 'Erro ao excluir controle. Tente novamente.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    } finally {
      setLoadingButtons(prev => ({ ...prev, [deleteKey]: false }));
    }
  };

  const handleOpenEdit = useCallback((c: ControleComNotas) => {
    setEditing(c);
    setEditData({
      motorista: c.motorista,
      responsavel: c.responsavel,
      cpfMotorista: c.cpfMotorista ?? '',
      transportadora: c.transportadora,
      qtdPallets: c.qtdPallets,
      observacao: c.observacao ?? '',
    });
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditing(null);
    setEditData({});
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editing) return;
    try {
      // Cria um objeto com apenas os campos que podem ser atualizados
      const dadosAtualizacao: Partial<Omit<PrismaControleCarga, 'id' | 'dataCriacao' | 'notas'>> = {};
      
      // Adiciona apenas os campos que foram alterados e não são undefined
      if (editData.motorista !== undefined) dadosAtualizacao.motorista = editData.motorista as string;
      if (editData.responsavel !== undefined) dadosAtualizacao.responsavel = editData.responsavel as string;
      if (editData.cpfMotorista !== undefined) dadosAtualizacao.cpfMotorista = editData.cpfMotorista as string;
      if (editData.transportadora !== undefined) {
        const transportadoraValida = (['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE', 'VLOG', 'ZANUELO_TRANSPORTE_LOGISTICA'].includes(editData.transportadora)) ? editData.transportadora : 'ACCERT';
        dadosAtualizacao.transportadora = transportadoraValida;
      }
      if (editData.qtdPallets !== undefined) dadosAtualizacao.qtdPallets = Number(editData.qtdPallets) || 0;
      if (editData.observacao !== undefined) dadosAtualizacao.observacao = editData.observacao as string | null;
      
      // Trata o numeroManifesto separadamente para garantir que null seja convertido para undefined
      if (editData.numeroManifesto !== undefined) {
        dadosAtualizacao.numeroManifesto = editData.numeroManifesto || undefined;
      }
      
      await atualizarControle(editing.id, dadosAtualizacao as any);
      enqueueSnackbar('Controle atualizado com sucesso', { variant: 'success' });
      handleCloseEdit();
    } catch (error) {
      console.error('Erro ao atualizar controle:', error);
      enqueueSnackbar('Erro ao atualizar controle', { variant: 'error' });
    }
  }, [editing, editData, atualizarControle, enqueueSnackbar, handleCloseEdit]);

  const handleAbrirAssinatura = useCallback((controle: ControleComNotas, tipo: 'motorista' | 'responsavel') => {
    console.log('[Modal Assinatura] Abrindo modal para controle:', controle.id, 'tipo:', tipo);
    
    if (!controle.id) {
      console.error('[Modal Assinatura] controleId não informado');
      enqueueSnackbar('Erro: ID do controle não encontrado', { variant: 'error' });
      return;
    }
    
    // Define o botão como loading
    setLoadingButtons(prev => ({
      ...prev,
      [`sign_${tipo}_${controle.id}`]: true
    }));
    
    setAssinaturaAberta({
      aberto: true,
      controleId: controle.id,
      tipo
    });
  }, []);

  const extrairChaveNFeDetalhes = (codigo?: string): string | null => {
    if (!codigo) return null;
    const apenasDigitos = String(codigo).replace(/[^\d]/g, '');
    if (apenasDigitos.length === 44) return apenasDigitos;
    if (apenasDigitos.length > 44) {
      for (let i = 0; i <= apenasDigitos.length - 44; i++) {
        const bloco = apenasDigitos.substring(i, i + 44);
        if (/^\d{44}$/.test(bloco)) return bloco;
      }
    }
    return null;
  };

  const aplicarFreteReferenciaNaNota = (nota: any) => {
    const bairro =
      nota?.bairro ??
      nota?.Bairro ??
      nota?.NOME_BAIRRO_NOTA ??
      nota?.BAIRRO ??
      nota?.cliente?.bairro ??
      null;
    const cidade =
      nota?.cidade ??
      nota?.Cidade ??
      nota?.NOME_CIDADE ??
      nota?.CIDADE ??
      nota?.cliente?.cidade ??
      null;
    const estado =
      nota?.estado ??
      nota?.UF ??
      nota?.ESTADO ??
      nota?.ESTADO_DESTINO ??
      nota?.cliente?.estado ??
      'DF';
    const endereco =
      nota?.endereco ??
      nota?.ENDERECO ??
      nota?.LOGRADOURO ??
      nota?.LOGRADOURO_ENTREGA ??
      nota?.cliente?.endereco ??
      null;

    const frete = estimarFreteDfPorRegiao({ bairro, cidade, estado, endereco });

    return {
      ...nota,
      bairro,
      cidade,
      estado,
      endereco,
      freteRegiao: frete.regiao,
      freteReferencia: frete.valor,
      freteOrigem: frete.origem,
      freteDescricao: frete.descricao,
      freteObservacao: frete.observacao,
    };
  };

  const enriquecerNotasDoControle = async (controle: ControleComNotas): Promise<ControleComNotas> => {
    const notas = controle.notas || [];
    const enriquecidas = await Promise.all(notas.map(async (nota: any) => {
      const base = { ...nota };
      try {
        const chave = extrairChaveNFeDetalhes(base.codigo);
        let resp;
        if (chave) {
          resp = await api.get('/api/buscar-nota-externa', { params: { chave } });
        } else if (base.numeroNota) {
          resp = await api.get('/api/buscar-nota-externa', { params: { numero: base.numeroNota, serie: '1' } });
        }
        const d = resp?.data || null;
        if (d) {
          const toNumber = (x: any) => {
            if (x === null || x === undefined) return undefined;
            let s = String(x).trim().replace(/R\$\s*/g, '');
            if (s === '') return undefined;
            const hasComma = s.includes(',');
            if (hasComma) {
              s = s.replace(/\./g, '').replace(',', '.');
            }
            const n = Number(s);
            return isNaN(n) ? undefined : n;
          };
          base.volumes = String(base.volumes ?? d.volumes ?? '1');
          const valorFromD = toNumber(d.valorPedido ?? d.valor ?? d.VALOR_TOTAL_NOTA ?? d.VALOR_TOTAL ?? (d as any).TOTAL ?? (d as any).total);
          const valorFromBase = toNumber((base as any).valorPedido ?? (base as any).valor ?? (base as any).VALOR_TOTAL_NOTA ?? (base as any).VALOR_TOTAL ?? (base as any).TOTAL ?? (base as any).valor_total);
          base.valorPedido = (valorFromBase !== undefined) ? valorFromBase : valorFromD;
          base.razaoSocial = (base as any).razaoSocial ?? d.razaoSocial ?? d.NOME_RAZAO_SOCIAL;
          base.bairro = (base as any).bairro ?? d.bairro ?? d.NOME_BAIRRO_NOTA ?? d.BAIRRO ?? d.cliente?.bairro;
          base.cidade = (base as any).cidade ?? d.cidade ?? d.NOME_CIDADE ?? d.CIDADE ?? d.cliente?.cidade;
          base.estado = (base as any).estado ?? d.estado ?? d.ESTADO ?? d.ESTADO_DESTINO ?? d.cliente?.estado ?? 'DF';
          base.endereco = (base as any).endereco ?? d.endereco ?? d.LOGRADOURO_ENTREGA ?? d.LOGRADOURO ?? d.ENDERECO ?? d.cliente?.endereco;
          const pesoFromD = toNumber(
            (d as any).TOTAL_PESO ?? (d as any).PESO_TOTAL ?? (d as any).PESO_NOTA ??
            d.pesoBruto ?? d.peso ??
            (d as any).PESO_BRUTO ?? (d as any).PESO ?? (d as any).PESO_LIQUIDO ?? (d as any).peso_liquido
          );
          const pesoFromBase = toNumber(
            (base as any).pesoBruto ?? (base as any).peso ??
            (base as any).PESO_BRUTO ?? (base as any).PESO ?? (base as any).PESO_LIQUIDO ?? (base as any).peso_liquido ??
            (base as any).PESO_TOTAL ?? (base as any).PESO_NOTA ?? (base as any).TOTAL_PESO
          );
          base.pesoBruto = (pesoFromBase !== undefined && pesoFromBase > 0) ? pesoFromBase : pesoFromD;
          base.dataEmissao = (base as any).dataEmissao ?? d.dataEmissao ?? d.DATA_EMISSAO;
          base.cnpj = (base as any).cnpj ?? d.cnpj ?? d.CNPJ;
          base.cep = (base as any).cep ?? d.cep ?? d.CEP ?? d.CEP_ENTREGA ?? d.cliente?.cep;
        }
      } catch (e) {
        // silencioso: mantém dados existentes
      }

      if ((!base.bairro || !base.cidade) && base.cep) {
        try {
          const cepData = await CEPService.buscarCEP(String(base.cep));
          if (cepData) {
            base.endereco = base.endereco || cepData.logradouro || '';
            base.bairro = base.bairro || cepData.bairro || '';
            base.cidade = base.cidade || cepData.localidade || '';
            base.estado = base.estado || cepData.uf || 'DF';
            base.cep = base.cep || cepData.cep || '';
          }
        } catch {
          // fallback silencioso
        }
      }

      return aplicarFreteReferenciaNaNota(base);
    }));
    return { ...controle, notas: enriquecidas };
  };

  const handleAbrirDetalhes = useCallback(async (controle: ControleComNotas) => {
    console.log('[Modal Detalhes] Abrindo modal para controle:', controle.id);
    setDetalhesModal({
      aberto: true,
      controle
    });
    try {
      const controleEnriquecido = await enriquecerNotasDoControle(controle);
      setDetalhesModal({
        aberto: true,
        controle: controleEnriquecido
      });
    } catch (error) {
      console.warn('Falha ao enriquecer notas para detalhes:', error);
    }
  }, []);

  const handleFecharDetalhes = useCallback(() => {
    setDetalhesModal({
      aberto: false,
      controle: null
    });
  }, []);

  const handleFecharAssinatura = useCallback(() => {
    console.log('[Modal Assinatura] Fechando modal...');
    if (assinaturaAberta.controleId && assinaturaAberta.tipo) {
      // Remove o loading do botão
      setLoadingButtons(prev => ({
        ...prev,
        [`sign_${assinaturaAberta.tipo}_${assinaturaAberta.controleId}`]: false
      }));
    }
    setAssinaturaAberta({
      aberto: false,
      controleId: '',
      tipo: 'motorista'
    });
  }, [assinaturaAberta, setLoadingButtons]);

  const resumoFreteDetalhes = (detalhesModal.controle?.notas || []).reduce((acc, nota: any) => {
    const valor = typeof nota?.freteReferencia === 'number' ? nota.freteReferencia : 0;
    if (valor > 0) {
      acc.total += valor;
      if (nota?.freteOrigem === 'referencia_publica') {
        acc.comFrete += 1;
      } else {
        acc.provisorio += 1;
      }
    } else {
      acc.semFrete += 1;
    }
    return acc;
  }, { total: 0, comFrete: 0, provisorio: 0, semFrete: 0 });


  const handleFinalizarControle = useCallback(async (controle: ControleComNotas) => {
    if (!controle) return;
    try {
      setLoadingButtons(prev => ({ ...prev, [controle.id]: true }));
      await finalizarControle(controle.id);
      enqueueSnackbar('Controle finalizado com sucesso!', { 
        variant: 'success',
        autoHideDuration: 3000,
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
      });
    } catch (error) {
      console.error('Erro ao finalizar controle:', error);
      enqueueSnackbar('Erro ao finalizar controle. Tente novamente.', { 
        variant: 'error',
        autoHideDuration: 5000,
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
      });
    } finally {
      setLoadingButtons(prev => ({ ...prev, [controle.id]: false }));
    }
  }, [finalizarControle, enqueueSnackbar, setLoadingButtons]);



  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        sx={{
          '& .MuiCircularProgress-root': {
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%': { opacity: 0.6, transform: 'scale(0.9)' },
              '50%': { opacity: 1, transform: 'scale(1.1)' },
              '100%': { opacity: 0.6, transform: 'scale(0.9)' }
            }
          }
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        mt: 4, 
        mb: 4,
        opacity: 0,
        animation: 'fadeIn 0.5s ease-out forwards',
        '@keyframes fadeIn': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Controles de Carga
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => router.push('/criar-controle')}
        >
          Novo Controle
        </Button>
      </Box>

      {/* Seção de Filtros */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon color="primary" />
            Filtros de Consulta
            {filtrosAtivos && (
              <Chip 
                label="Filtros Ativos" 
                color="primary" 
                size="small" 
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            {/* Filtros de Data */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filtros.start}
                onChange={(e) => handleFiltroChange('start', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filtros.end}
                onChange={(e) => handleFiltroChange('end', e.target.value)}
                size="small"
              />
            </Grid>
            
            {/* Filtros de Texto */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Transportadora</InputLabel>
                <Select
                  value={filtros.transportadora}
                  onChange={(e) => handleFiltroChange('transportadora', e.target.value)}
                  label="Transportadora"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {transportadorasFixas.map((transportadora) => (
                    <MenuItem key={transportadora.id} value={transportadora.id}>
                      {transportadora.descricao}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Nota Fiscal"
                value={filtros.notaFiscal}
                onChange={(e) => handleFiltroChange('notaFiscal', e.target.value)}
                size="small"
                placeholder="Ex: 12345"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Motorista"
                value={filtros.motorista}
                onChange={(e) => handleFiltroChange('motorista', e.target.value)}
                size="small"
                placeholder="Nome do motorista"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Responsável"
                value={filtros.responsavel}
                onChange={(e) => handleFiltroChange('responsavel', e.target.value)}
                size="small"
                placeholder="Nome do responsável"
              />
            </Grid>
            
            {/* Limite de Resultados */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Limite</InputLabel>
                <Select
                  value={filtros.limit}
                  onChange={(e) => handleFiltroChange('limit', e.target.value as number)}
                  label="Limite"
                >
                  <MenuItem value={10}>10 registros</MenuItem>
                  <MenuItem value={25}>25 registros</MenuItem>
                  <MenuItem value={50}>50 registros</MenuItem>
                  <MenuItem value={100}>100 registros</MenuItem>
                  <MenuItem value={200}>200 registros</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {/* Botões de Ação */}
          <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              startIcon={<SearchIcon />}
              onClick={aplicarFiltros}
              disabled={loading}
              size="small"
            >
              Buscar
            </Button>
            <Button 
              variant="contained" 
              startIcon={<TodayIcon />}
              onClick={filtrarHoje}
              disabled={loading}
              size="small"
              color="secondary"
            >
              Hoje
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<CalendarMonthIcon />}
              onClick={limparFiltros}
              disabled={loading}
              size="small"
            >
              Últimos 2 Dias
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<ClearIcon />}
              onClick={limparFiltros}
              disabled={loading}
              size="small"
              color="error"
            >
              Limpar Filtros
            </Button>
          </Box>
          
          {/* Resumo dos Resultados */}
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Período:</strong> {filtros.start ? format(new Date(filtros.start), 'dd/MM/yyyy') : 'Sem limite'} até {filtros.end ? format(new Date(filtros.end), 'dd/MM/yyyy') : 'Sem limite'}
              {' | '}
              <strong>Total encontrado:</strong> {controles.length} controle(s)
              {filtros.transportadora && ` | Transportadora: ${transportadorasFixas.find(t => t.id === filtros.transportadora)?.descricao}`}
              {filtros.notaFiscal && ` | Nota Fiscal: ${filtros.notaFiscal}`}
              {filtros.motorista && ` | Motorista: ${filtros.motorista}`}
              {filtros.responsavel && ` | Responsável: ${filtros.responsavel}`}
            </Typography>
          </Box>
        </CardContent>
      </Card>
      
      <Paper 
        sx={{ 
          width: '100%', 
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
          '&:hover': {
            boxShadow: '0 8px 30px 0 rgba(0,0,0,0.1)'
          },
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <TableContainer 
          sx={{ 
            maxHeight: 'calc(100vh - 400px)', // Aumentar espaço para os filtros
            minHeight: '400px', // Altura mínima garantida
            overflowY: 'auto', // Garantir scroll vertical
            overflowX: 'auto', // Scroll horizontal se necessário
            '&::-webkit-scrollbar': {
              width: '12px', // Scrollbar mais visível
              height: '12px'
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '6px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#1976d2',
              borderRadius: '6px',
              '&:hover': {
                backgroundColor: '#1565c0'
              }
            },
            // Melhorias para mobile
            '@media (max-width: 900px)': {
              maxHeight: 'calc(100vh - 200px)',
              minHeight: '300px',
              '& .MuiTable-root': {
                minWidth: '1000px' // Força largura mínima para scroll horizontal (aumentado devido à nova coluna)
              }
            }
          }}
        >
          <Table 
            stickyHeader 
            aria-label="tabela de controles"
            sx={{
              '& .MuiTableCell-root': {
                borderBottom: '1px solid rgba(224, 224, 224, 0.5)',
                // Melhorias para mobile
                '@media (max-width: 900px)': {
                  padding: '12px 8px', // Padding menor em mobile
                  fontSize: '0.875rem'
                }
              },
              '& .MuiTableRow-root:last-child .MuiTableCell-root': {
                borderBottom: 'none'
              },
              '& .MuiTableRow-root:hover .MuiTableCell-root': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)'
              },
              '& .MuiTableRow-root.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12)'
                }
              }
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff',
                  borderTopLeftRadius: '8px',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)'
                  },
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.3)'
                  }
                }}>Nº</TableCell>
                <TableCell sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)'
                  },
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.3)'
                  }
                }}>Data</TableCell>
                <TableCell sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)'
                  },
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.3)'
                  }
                }}>Motorista</TableCell>
                <TableCell sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)'
                  },
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.3)'
                  }
                }}>Responsável</TableCell>
                <TableCell sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)'
                  },
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.3)'
                  }
                }}>Transportadora</TableCell>
                <TableCell sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)'
                  },
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.3)'
                  }
                }}>Notas</TableCell>
                <TableCell sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)'
                  },
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.3)'
                  }
                }}>Status</TableCell>
                <TableCell sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff',
                  borderTopRightRadius: '8px',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)'
                  },
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.3)'
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'primary.contrastText'
                  }
                }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {controles.map((controle, idx) => (
                <TableRow 
                  key={controle.id} 
                  hover
                  sx={{
                    '&.MuiTableRow-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        '& .MuiTableCell-root': {
                          color: 'text.primary',
                          fontWeight: 500
                        }
                      }
                    },
                    '& .MuiTableCell-root': {
                      transition: 'all 0.2s ease',
                      py: 1.5
                    },
                    animation: 'fadeIn 0.3s ease-in-out',
                    '@keyframes fadeIn': {
                      '0%': { opacity: 0, transform: 'translateY(10px)' },
                      '100%': { opacity: 1, transform: 'translateY(0)' }
                    }
                  }}
                >
                  <TableCell>{controle.numeroManifesto?.replace('CTRL-', '') || (controle.id ? `ID-${controle.id.substring(0, 6)}` : 'N/A')}</TableCell>
                  <TableCell>
                    {format(new Date(controle.dataCriacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{controle.motorista}</TableCell>
                  <TableCell>{controle.responsavel}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getTransportadoraById(controle.transportadora || 'ACCERT').descricao}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        height: '24px',
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          color: 'white'
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>{controle.notas?.length || 0} nota(s)</TableCell>
                  <TableCell>
                    <Chip 
                      label={controle.finalizado ? 'Finalizado' : 'Em andamento'} 
                      color={controle.finalizado ? 'success' : 'warning'}
                      size="small"
                      sx={controle.finalizado ? { backgroundColor: '#4caf50', color: 'white' } : {}}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="Ver detalhes completos">
                        <IconButton 
                          onClick={() => handleAbrirDetalhes(controle)}
                          color={!controle.finalizado ? 'success' : 'primary'}
                          size="small"
                          disabled={loadingButtons[controle.id]}
                          sx={{
                            ...buttonStyles,
                            minHeight: '44px',
                            minWidth: '44px',
                            '&:hover': {
                              backgroundColor: !controle.finalizado ? 'rgba(46, 125, 50, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                              transform: 'scale(1.05)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Gerar PDF">
                        <IconButton 
                          onClick={() => gerarPdf(controle)}
                          color="primary"
                          size="small"
                          disabled={loadingButtons[controle.id]}
                          sx={buttonStyles}
                        >
                          <PictureAsPdfIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={controle.imagens && controle.imagens.length > 0 ? `${controle.imagens.length} foto(s) anexada(s)` : "Adicionar Foto"}>
                        <IconButton
                          onClick={() => handleCapturarImagem(controle)}
                          color={controle.imagens && controle.imagens.length > 0 ? "success" : "secondary"}
                          size="small"
                          disabled={loadingButtons[controle.id]}
                          sx={{
                            ...buttonStyles,
                            ...(controle.imagens && controle.imagens.length > 0 && {
                              backgroundColor: 'rgba(76, 175, 80, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                              }
                            })
                          }}
                        >
                          {controle.imagens && controle.imagens.length > 0 ? (
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <CameraAltIcon fontSize="small" />
                              <CheckIcon 
                                fontSize="small" 
                                sx={{ 
                                  position: 'absolute', 
                                  top: -4, 
                                  right: -4, 
                                  fontSize: '0.7rem',
                                  color: 'success.main',
                                  backgroundColor: 'white',
                                  borderRadius: '50%'
                                }} 
                              />
                            </Box>
                          ) : (
                            <CameraAltIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>

                      {canEdit(controle) && (
                        <>
                          <Tooltip title="Editar">
                            <span>
                              <IconButton 
                                onClick={() => handleOpenEdit(controle)} 
                                color="primary"
                                size="small"
                                disabled={loadingButtons[controle.id]}
                                sx={buttonStyles}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          {(
                            (!controle.finalizado && (user?.tipo === 'ADMIN' || user?.tipo === 'GERENTE')) ||
                            (controle.finalizado && user?.tipo === 'ADMIN')
                          ) && (
                            <Tooltip title="Excluir">
                              <span>
                                <IconButton 
                                  onClick={() => handleExcluirControle(controle)} 
                                  color="error" 
                                  size="small"
                                  disabled={loadingButtons[`delete_${controle.id}`]}
                                  sx={buttonStyles}
                                >
                                  {loadingButtons[`delete_${controle.id}`] ? (
                                    <CircularProgress size={20} color="inherit" />
                                  ) : (
                                    <DeleteIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}

                          {!controle.finalizado ? (
                            <Tooltip title="Finalizar">
                              <span>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  size="small"
                                  onClick={() => handleFinalizarControle(controle)}
                                  disabled={loadingButtons[controle.id]}
                                  sx={{
                                    ...buttonStyles,
                                    minWidth: '40px',
                                    minHeight: '40px',
                                    padding: '8px'
                                  }}
                                >
                                  {loadingButtons[controle.id] ? (
                                    <CircularProgress size={18} color="inherit" />
                                  ) : (
                                    <HowToRegIcon fontSize="small" />
                                  )}
                                </Button>
                              </span>
                            </Tooltip>
                          ) : (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {/* Se ambos assinaram, mostra apenas um ícone verde */}
                              {controle.assinaturaMotorista && controle.assinaturaResponsavel ? (
                                <Tooltip title="Controle totalmente assinado (Motorista e Responsável)">
                                  <Chip
                                    icon={<CheckCircleOutlineIcon />}
                                    label="Assinado"
                                    color="success"
                                    variant="filled"
                                    sx={{
                                      backgroundColor: '#4caf50',
                                      color: 'white',
                                      fontWeight: 600,
                                      '& .MuiChip-icon': {
                                        color: 'white'
                                      }
                                    }}
                                  />
                                </Tooltip>
                              ) : (
                                <>
                                  {/* Botão Motorista - Oculto temporariamente a pedido do usuário */}
                                  {false && (
                                    <Tooltip title={controle.assinaturaMotorista ? 'Assinatura do motorista já registrada' : 'Assinar como motorista'}>
                                      <Button
                                        variant="contained"
                                        color={controle.assinaturaMotorista ? 'success' : 'primary'}
                                        size="small"
                                        onClick={() => handleAbrirAssinatura(controle, 'motorista')}
                                        disabled={loadingButtons[`sign_motorista_${controle.id}`] || !controle.finalizado}
                                        startIcon={controle.assinaturaMotorista ? 
                                          <CheckCircleOutlineIcon /> : 
                                          <EditIcon />
                                        }
                                        sx={{
                                          ...buttonStyles,
                                          textTransform: 'none',
                                          fontWeight: 500,
                                          letterSpacing: '0.5px',
                                          display: controle.finalizado ? 'inline-flex' : 'none'
                                        }}
                                      >
                                        {loadingButtons[`sign_motorista_${controle.id}`] ? (
                                          <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                                        ) : null}
                                        {controle.assinaturaMotorista ? 'Motorista ✓' : 'Motorista'}
                                      </Button>
                                    </Tooltip>
                                  )}
                                  
                                  {/* Botão Responsável - Oculto temporariamente a pedido do usuário */}
                                  {false && (
                                    <Tooltip title={controle.assinaturaResponsavel ? 'Assinatura do responsável já registrada' : 'Assinar como responsável'}>
                                      <Button
                                        variant="contained"
                                        color={controle.assinaturaResponsavel ? 'success' : 'primary'}
                                        size="small"
                                        onClick={() => handleAbrirAssinatura(controle, 'responsavel')}
                                        disabled={loadingButtons[`sign_responsavel_${controle.id}`] || !controle.finalizado}
                                        startIcon={controle.assinaturaResponsavel ? 
                                          <CheckCircleOutlineIcon /> : 
                                          <EditIcon />
                                        }
                                        sx={{
                                          ...buttonStyles,
                                          textTransform: 'none',
                                          fontWeight: 500,
                                          letterSpacing: '0.5px',
                                          display: controle.finalizado ? 'inline-flex' : 'none'
                                        }}
                                      >
                                        {loadingButtons[`sign_responsavel_${controle.id}`] ? (
                                          <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                                        ) : null}
                                        {controle.assinaturaResponsavel ? 'Responsável ✓' : 'Responsável'}
                                      </Button>
                                    </Tooltip>
                                  )}
                                </>
                              )}
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal de Edição */}
      {editing && (
        <Dialog open={!!editing} onClose={handleCloseEdit} maxWidth="md" fullWidth>
          <DialogTitle>Editar Controle</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Motorista"
                  value={editData.motorista || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, motorista: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CPF do Motorista"
                  value={editData.cpfMotorista || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, cpfMotorista: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Responsável"
                  value={editData.responsavel || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, responsavel: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Transportadora</InputLabel>
                  <Select
                    value={editData.transportadora || 'ACERT'}
                    onChange={(e) => setEditData(prev => ({ ...prev, transportadora: e.target.value as any }))}
                    label="Transportadora"
                  >
                    {transportadorasFixas.map((transportadora) => (
                      <MenuItem key={transportadora.id} value={transportadora.id}>
                        {transportadora.descricao}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantidade de Pallets"
                  type="number"
                  value={editData.qtdPallets || 0}
                  onChange={(e) => setEditData(prev => ({ ...prev, qtdPallets: parseInt(e.target.value) || 0 }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações"
                  multiline
                  rows={3}
                  value={editData.observacao || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, observacao: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>Cancelar</Button>
            <Button onClick={handleSaveEdit} variant="contained">Salvar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modal de Visualização de PDF */}
      {pdfUrl && (
        <Dialog open={pdfOpen} onClose={() => setPdfOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Visualizar PDF</DialogTitle>
          <DialogContent>
            <iframe
              src={pdfUrl}
              width="100%"
              height="600px"
              style={{ border: 'none' }}
              title="PDF do Controle"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPdfOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Diálogo de Assinatura - Usa o componente alternativo mais simples */}
      <ModalAssinaturaSimplesAlternativo
        open={assinaturaAberta.aberto}
        onClose={handleFecharAssinatura}
        controleId={assinaturaAberta.controleId || ''}
        tipoAssinatura={assinaturaAberta.tipo}
        onAssinaturaSalva={async () => {
          console.log('🔄 [RELOAD] Iniciando processo de reload após assinatura...');
          
          try {
            // 1. Fechar modal imediatamente
            setAssinaturaAberta({ aberto: false, controleId: '', tipo: 'motorista' });
            
            // 2. Mostrar loading
            setLoading(true);
            
            // 3. Aguardar um pouco para a assinatura ser processada
            console.log('🔄 [RELOAD] Aguardando assinatura ser processada...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // 4. Mostrar feedback antes do reload
            enqueueSnackbar('✅ Assinatura salva! Atualizando página...', { 
              variant: 'success',
              autoHideDuration: 2000,
              anchorOrigin: { vertical: 'top', horizontal: 'center' }
            });
            
            // 5. Aguardar um pouco para o usuário ver o feedback
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('🔄 [RELOAD] Fazendo reload da página...');
            
            // 6. RELOAD COMPLETO DA PÁGINA
            window.location.reload();
            
          } catch (error) {
            console.error('❌ [RELOAD] Erro no processo:', error);
            setLoading(false);
            
            // Fallback: tentar atualização manual
            try {
              await fetchControles();
              const novosControles = converterControles(controlesStore as any);
              setControles([...novosControles]);
              
              enqueueSnackbar('Assinatura salva! Lista atualizada manualmente.', { 
                variant: 'success',
                autoHideDuration: 3000 
              });
            } catch (fallbackError) {
              console.error('❌ [RELOAD] Erro no fallback:', fallbackError);
              enqueueSnackbar('Assinatura salva, mas é necessário atualizar a página manualmente', { 
                variant: 'warning',
                autoHideDuration: 5000 
              });
            }
          }
        }}
      />


      {/* Modal de Visualização Detalhada */}
      {detalhesModal.aberto && detalhesModal.controle && (
        <Dialog open={detalhesModal.aberto} onClose={handleFecharDetalhes} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ 
            backgroundColor: 'primary.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="h6">
              Detalhes do Controle - {detalhesModal.controle.numeroManifesto?.replace('CTRL-', '') || 'N/A'}
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleFecharDetalhes}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Box sx={{ mb: 3 }}>
              {/* Informações Básicas */}
              <Typography variant="h6" gutterBottom sx={{ 
                color: 'primary.main', 
                fontWeight: 600,
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                pb: 1,
                mb: 2
              }}>
                Informações Básicas
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary">Data de Criação</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {format(new Date(detalhesModal.controle.dataCriacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip 
                      label={detalhesModal.controle.finalizado ? 'Finalizado' : 'Em andamento'} 
                      color={detalhesModal.controle.finalizado ? 'success' : 'warning'}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>
              </Grid>

              {/* Assinaturas */}
              <Typography variant="h6" gutterBottom sx={{ 
                color: 'primary.main', 
                fontWeight: 600,
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                pb: 1,
                mb: 2
              }}>
                Assinaturas
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary">Motorista</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {detalhesModal.controle.motorista || 'PENDENTE'}
                    </Typography>
                    {detalhesModal.controle.assinaturaMotorista && (
                      <Chip 
                        label="Assinado Digitalmente" 
                        color="success" 
                        size="small" 
                        sx={{ mt: 1 }}
                        icon={<CheckCircleOutlineIcon />}
                      />
                    )}
                    {detalhesModal.controle.dataAssinaturaMotorista && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Assinado em: {format(new Date(detalhesModal.controle.dataAssinaturaMotorista), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary">Responsável</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {detalhesModal.controle.responsavel || 'PENDENTE'}
                    </Typography>
                    {detalhesModal.controle.assinaturaResponsavel && (
                      <Chip 
                        label="Assinado Digitalmente" 
                        color="success" 
                        size="small" 
                        sx={{ mt: 1 }}
                        icon={<CheckCircleOutlineIcon />}
                      />
                    )}
                    {detalhesModal.controle.dataAssinaturaResponsavel && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Assinado em: {format(new Date(detalhesModal.controle.dataAssinaturaResponsavel), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Imagens */}
              {detalhesModal.controle.imagens && detalhesModal.controle.imagens.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: 'primary.main', 
                    fontWeight: 600,
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    pb: 1,
                    mb: 2
                  }}>
                    Imagens Anexadas ({detalhesModal.controle.imagens.length})
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {detalhesModal.controle.imagens.map((imagem, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Paper sx={{ p: 1, textAlign: 'center', position: 'relative' }}>
                          <Box sx={{ position: 'relative' }}>
                            <img
                              src={imagem}
                              alt={`Imagem ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                // Abrir imagem em nova aba/janela para visualização ampliada
                                window.open(imagem, '_blank');
                              }}
                            />
                            <IconButton
                              onClick={() => handleExcluirImagem(detalhesModal.controle!.id, index)}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: 'rgba(244, 67, 54, 0.9)',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: 'rgba(211, 47, 47, 1)',
                                },
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                              }}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Imagem {index + 1}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* Observações */}
              {detalhesModal.controle.observacao && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: 'primary.main', 
                    fontWeight: 600,
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    pb: 1,
                    mb: 2
                  }}>
                    Observações
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
                    <Typography variant="body1">
                      {detalhesModal.controle.observacao}
                    </Typography>
                  </Paper>
                </>
              )}

              {/* Notas Fiscais */}
              <Typography variant="h6" gutterBottom sx={{ 
                color: 'primary.main', 
                fontWeight: 600,
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                pb: 1,
                mb: 2
              }}>
                Notas Fiscais ({detalhesModal.controle.notas?.length || 0})
              </Typography>
<Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary">Frete estimado total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumoFreteDetalhes.total)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary">Notas com frete mapeado</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {resumoFreteDetalhes.comFrete}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary">Notas com estimativa provisória</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {resumoFreteDetalhes.provisorio}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              {detalhesModal.controle.notas && detalhesModal.controle.notas.length > 0 ? (
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Número da Nota</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Código</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Valor do Pedido</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Razão Social</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Peso Bruto</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Data da Emissão</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>CNPJ</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Região DF</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Frete Ref.</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Volumes</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Data de Criação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detalhesModal.controle.notas.map((nota: any) => (
                        <TableRow key={nota.id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{nota.numeroNota}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ 
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              wordBreak: 'break-all'
                            }}>
                              {nota.codigo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {typeof nota.valorPedido === 'number' || typeof nota.valor === 'number'
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                  (typeof nota.valorPedido === 'number' ? nota.valorPedido : nota.valor) as number
                                )
                              : '-'}
                          </TableCell>
                          <TableCell>{nota.razaoSocial || nota?.cliente?.nome || nota?.emitente?.razaoSocial || '-'}</TableCell>
                          <TableCell>
                            {typeof nota.pesoBruto === 'number' || typeof nota.peso === 'number'
                              ? `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
                                  (typeof nota.pesoBruto === 'number' ? nota.pesoBruto : nota.peso) as number
                                )} kg`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {nota.dataEmissao 
                              ? format(new Date(nota.dataEmissao), "dd/MM/yyyy", { locale: ptBR })
                              : nota.DATA_EMISSAO
                                ? format(new Date(nota.DATA_EMISSAO), "dd/MM/yyyy", { locale: ptBR })
                                : '-'}
                          </TableCell>
                          <TableCell>{nota.cnpj || nota?.cliente?.cnpj || nota?.emitente?.cnpj || '-'}</TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {nota.freteRegiao || nota.bairro || '-'}
                              </Typography>
                              {nota.freteDescricao && (
                                <Typography variant="caption" color="text.secondary">
                                  {nota.freteDescricao}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {typeof nota.freteReferencia === 'number'
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.freteReferencia)
                              : 'A consultar'}
                          </TableCell>
                          <TableCell>{nota.volumes}</TableCell>
                          <TableCell>
                            {nota.dataCriacao ? 
                              format(new Date(nota.dataCriacao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 
                              'N/A'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <Typography variant="body1" color="text.secondary">
                    Nenhuma nota fiscal vinculada a este controle.
                  </Typography>
                </Paper>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button 
              onClick={handleFecharDetalhes}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Fechar
            </Button>
            <Button 
              variant="contained" 
              onClick={() => detalhesModal.controle && gerarPdf(detalhesModal.controle)}
              startIcon={<PictureAsPdfIcon />}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                }
              }}
            >
              Gerar PDF
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modal de Captura de Imagem */}
      <ImageCapture
        open={imageCaptureOpen}
        onClose={() => {
          setImageCaptureOpen(false);
          setCurrentControleId('');
        }}
        onImageCapture={handleImageCapture}
        currentImages={controles.find(c => c.id === currentControleId)?.imagens || []}
      />

      {/* Modal de Preview da Imagem Capturada */}
      <Dialog 
        open={previewImageOpen} 
        onClose={handleCancelarCaptura}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ 
          backgroundColor: 'primary.main', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h6">
            Confirmar Foto
          </Typography>
          <IconButton edge="end" color="inherit" onClick={handleCancelarCaptura}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2, textAlign: 'center' }}>
          {capturedImage && (
            <Box sx={{ 
              position: 'relative',
              display: 'inline-block',
              maxWidth: '100%'
            }}>
              <img
                src={capturedImage}
                alt="Foto capturada"
                style={{
                  width: '100%',
                  maxHeight: '500px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}
              />
            </Box>
          )}
          <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
            Deseja salvar esta foto?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'center' }}>
          <Button
            onClick={handleRejeitarImagem}
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              minWidth: '140px'
            }}
          >
            Tirar Outra
          </Button>
          <Button
            onClick={handleAprovarImagem}
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
            disabled={loading}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              minWidth: '140px',
              backgroundColor: '#4caf50',
              '&:hover': {
                backgroundColor: '#388e3c',
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Salvar Foto'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default ListarControlesContent;





