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
  TextField
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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

import ResponsiveTable from './ResponsiveTable';
import ResponsiveContainer from './ResponsiveContainer';
import ModalAssinaturaDigitalPro from './ModalAssinaturaDigitalPro';
import ModalAssinaturaSimplesAlternativo from './ModalAssinaturaSimplesAlternativo';

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
  
  // Opções fixas de transportadoras
  const transportadorasFixas = [
    { id: 'ACCERT', nome: 'ACCERT', descricao: 'ACCERT Transportes' },
    { id: 'EXPRESSO_GOIAS', nome: 'EXPRESSO_GOIAS', descricao: 'Expresso Goiás' },
    { id: 'TERCEIRIZADA', nome: 'TERCEIRIZADA', descricao: 'Terceirizada' },
    { id: 'DETAFRA_TRANSPORTES', nome: 'DETAFRA_TRANSPORTES', descricao: 'Detafra Transportes' },
    { id: 'RETIRA_VENDEDOR', nome: 'RETIRA_VENDEDOR', descricao: 'Retira Vendedor' },
    { id: 'RETIRA_CLIENTE', nome: 'RETIRA_CLIENTE', descricao: 'Retira Cliente' }
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
      backgroundColor: '#ff9800',
      '&:hover': {
        backgroundColor: '#f57c00',
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
  // Carrega os controles ao montar o componente
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        await fetchControles();
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

  const gerarPdf = async (controle: ControleComNotas) => {
    // Importar dependências necessárias
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    try {
      // Garante que as propriedades opcionais estejam definidas
      const controleCompleto: ControleComNotas = {
        ...controle,
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
        notas: 'notas' in controle ? (controle.notas || []) : []
      };
      const existingBytes = await fetch('/templates/modelo-romaneio.pdf').then(res => res.arrayBuffer());
      const doc = await PDFDocument.load(existingBytes);
      let page = doc.getPage(0);
      let { width, height } = page.getSize();
      
      // Usar fonte padrão do PDF
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontSize = 9; // fonte menor para caber mais linhas
      const lineHeight = 14; // reduzir altura da linha
      const topMargin = 50;
      const bottomMargin = 60; // espaço para rodapés/assinaturas
      const minSpaceForSignatures = 180; // espaço otimizado para duas assinaturas
      let yPos = height - topMargin;

      // Helpers de paginação (duas colunas)
      const leftBaseX = 40;
      const rightBaseX = 300; // distância horizontal para segunda coluna

      const drawTableHeaderForColumn = (baseX: number, headerY: number) => {
        const col1 = baseX;       // Qtd
        const col2 = baseX + 30;  // Nota Fiscal
        const col3 = baseX + 100; // Data
        const col4 = baseX + 200; // Volumes
        page.drawText('Qtd', { x: col1, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText('Nota Fiscal', { x: col2, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText('Data', { x: col3, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText('Volumes', { x: col4, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
        // linha sob o cabeçalho desta coluna
        page.drawLine({
          start: { x: baseX, y: headerY - 5 },
          end: { x: baseX + 240, y: headerY - 5 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
        return { col1, col2, col3, col4, nextY: headerY - 24 };
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
      yPos -= lineHeight * 6; // Aumentado de 3 para 6 linhas (3 linhas a mais)
      
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

      // Observações (se houver)
      if (controleCompleto.observacao && String(controleCompleto.observacao).trim().length > 0) {
        yPos -= lineHeight * 1.5;
        page.drawText('Observações:', { x: 50, y: yPos, size: fontSize, font });
        yPos -= lineHeight;
        const obsText = String(controleCompleto.observacao);
        const wrap = (text: string, max = 95) => text.match(new RegExp(`.{1,${max}}`, 'g')) || [];
        wrap(obsText).forEach((ln) => {
          page.drawText(ln, { x: 50, y: yPos, size: fontSize, font });
          yPos -= lineHeight * 1.1;
        });
      }
      
      // Tabela de Notas (duas colunas)
      yPos -= lineHeight * 2; // Espaço antes da tabela
      // Cabeçalho para ambas as colunas na mesma linha
      const leftHeader = drawTableHeaderForColumn(leftBaseX, yPos);
      const rightHeader = drawTableHeaderForColumn(rightBaseX, yPos);
      let yLeft = leftHeader.nextY;
      let yRight = rightHeader.nextY;
      let rowsLeft = 0;
      let rowsRight = 0;
      const maxRowsPerColumn = 15; // objetivo: 15 por lado

      const drawNota = (idx: number, nota: any, cols: {col1:number,col2:number,col3:number,col4:number}, y: number) => {
        const volumes = parseInt(nota.volumes) || 1;
        const dataNota = nota.dataCriacao
          ? new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit', month: '2-digit', year: 'numeric',
            }).format(new Date(nota.dataCriacao))
          : '-';
        page.drawText((idx + 1).toString(), { x: cols.col1, y, size: fontSize, font });
        page.drawText(nota.numeroNota || '-', { x: cols.col2, y, size: fontSize, font });
        page.drawText(dataNota, { x: cols.col3, y, size: fontSize, font });
        page.drawText(String(volumes), { x: cols.col4, y, size: fontSize, font });
      };

      let totalVolumes = 0;
      controleCompleto.notas.forEach((nota, index) => {
        const volumes = parseInt(nota.volumes) || 1;
        totalVolumes += volumes;

        // Verifica se precisamos de nova página (sem espaço para mais linhas + assinaturas)
        const noSpaceLeft = (rowsLeft >= maxRowsPerColumn) || (yLeft < bottomMargin + minSpaceForSignatures + lineHeight);
        const noSpaceRight = (rowsRight >= maxRowsPerColumn) || (yRight < bottomMargin + minSpaceForSignatures + lineHeight);
        if (noSpaceLeft && noSpaceRight) {
          page.drawText('Continua na próxima página...', { x: 50, y: 40, size: fontSize - 2, font, color: rgb(0.5, 0.5, 0.5) });
          addNewPage();
          // redesenha cabeçalhos em nova página
          const newLeft = drawTableHeaderForColumn(leftBaseX, yPos);
          const newRight = drawTableHeaderForColumn(rightBaseX, yPos);
          yLeft = newLeft.nextY;
          yRight = newRight.nextY;
          rowsLeft = 0;
          rowsRight = 0;
        }

        // Preenche coluna esquerda até 15 linhas, senão a direita
        if (!noSpaceLeft && rowsLeft < maxRowsPerColumn) {
          drawNota(index, nota, leftHeader, yLeft);
          yLeft -= lineHeight;
          rowsLeft += 1;
        } else if (!noSpaceRight && rowsRight < maxRowsPerColumn) {
          drawNota(index, nota, rightHeader, yRight);
          yRight -= lineHeight;
          rowsRight += 1;
        } else {
          // caso limite atingido em ambas após checks, força nova página e desenha na esquerda
          page.drawText('Continua na próxima página...', { x: 50, y: 40, size: fontSize - 2, font, color: rgb(0.5, 0.5, 0.5) });
          addNewPage();
          const newLeft = drawTableHeaderForColumn(leftBaseX, yPos);
          const newRight = drawTableHeaderForColumn(rightBaseX, yPos);
          yLeft = newLeft.nextY;
          yRight = newRight.nextY;
          rowsLeft = 0;
          rowsRight = 0;
          drawNota(index, nota, newLeft, yLeft);
          yLeft -= lineHeight;
          rowsLeft += 1;
        }
      });
      
      // Totalizadores
      yPos -= lineHeight;
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      // posiciona totalizadores considerando a menor Y das duas colunas
      yPos = Math.min(yLeft, yRight) - 8;
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPos -= lineHeight;
      // Totais alinhados na coluna esquerda
      page.drawText('TOTAL:', { x: leftBaseX + 80, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(controleCompleto.notas.length.toString(), { x: leftBaseX, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(totalVolumes.toString(), { x: leftBaseX + 200, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      
      // Rodapé
      yPos -= lineHeight * 2;
      page.drawText(`Nº Controle: ${controleCompleto.numeroManifesto || '-'}`, { x: 50, y: yPos, size: fontSize - 1, font });
      page.drawText(`Total de Volumes: ${totalVolumes}`, { x: 250, y: yPos, size: fontSize - 1, font });

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
        : '__/__/____';
      page.drawText(`Data: ${dataResponsavel}`, { x: 350, y: assinaturaY - 45, size: fontSize - 2, font });

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
      // Usar POST ao invés de DELETE para contornar erro 405
      const response = await api.post('/api/controles/delete', { id: controle.id });
      
      if (response.status === 200) {
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
        const transportadoraValida = (['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE'].includes(editData.transportadora)) ? editData.transportadora : 'ACCERT';
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

  const handleAbrirDetalhes = useCallback((controle: ControleComNotas) => {
    console.log('[Modal Detalhes] Abrindo modal para controle:', controle.id);
    setDetalhesModal({
      aberto: true,
      controle
    });
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
            maxHeight: 'calc(100vh - 300px)',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px'
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.2)'
              }
            },
            // Melhorias para mobile
            '@media (max-width: 900px)': {
              maxHeight: 'none',
              overflowX: 'auto',
              '& .MuiTable-root': {
                minWidth: '800px' // Força largura mínima para scroll horizontal
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
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#fff',
                  borderTopLeftRadius: '8px',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
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
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
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
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
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
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
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
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
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
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
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
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#fff',
                  borderTopRightRadius: '8px',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
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
                  <TableCell>{controle.numeroManifesto || 'N/A'}</TableCell>
                  <TableCell>
                    {format(new Date(controle.dataCriacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{controle.motorista}</TableCell>
                  <TableCell>{controle.responsavel}</TableCell>
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
                                  {/* Botão Motorista */}
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
                                  
                                  {/* Botão Responsável */}
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
              Detalhes do Controle - {detalhesModal.controle.numeroManifesto || 'N/A'}
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
              
              {detalhesModal.controle.notas && detalhesModal.controle.notas.length > 0 ? (
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Número da Nota</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Código</TableCell>
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
                background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e55a2b 0%, #e57a35 100%)',
                }
              }}
            >
              Gerar PDF
            </Button>
          </DialogActions>
        </Dialog>
      )}

    </Container>
  );
};

export default ListarControlesContent;








