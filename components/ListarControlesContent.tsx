import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Box, 
  Select,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useRouter } from 'next/router';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';

import AssinaturaDigital from './AssinaturaDigital';
import ResponsiveTable from './ResponsiveTable';
import ResponsiveContainer from './ResponsiveContainer';

interface Controle extends Omit<PrismaControleCarga, 'notas' | 'numeroManifesto' | 'assinaturaMotorista' | 'assinaturaResponsavel' | 'dataAssinaturaMotorista' | 'dataAssinaturaResponsavel'> {
  numeroManifesto: string | null;
  assinaturaMotorista: string | null;
  assinaturaResponsavel: string | null;
  dataAssinaturaMotorista: Date | null;
  dataAssinaturaResponsavel: Date | null;
  notas: { 
    id: string; 
    numeroNota: string; 
    codigo: string; 
    volumes: string;
    dataCriacao?: Date;
  }[];
}

interface AssinaturaState {
  aberto: boolean;
  controleId: string;
  tipo: 'motorista' | 'responsavel';
}


const ListarControlesContent: React.FC = () => {
  const assinaturaRef = useRef<any>(null);
  const { user } = useAuth();
  const { controles: controlesStore, fetchControles, finalizarControle, atualizarControle } = useStore();
  const [controles, setControles] = useState<ControleComNotas[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingButtons, setLoadingButtons] = useState<Record<string, boolean>>({});
  
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
    return controlesStore.map(controle => ({
      ...controle,
      dataCriacao: new Date(controle.dataCriacao),
      dataAssinaturaMotorista: controle.dataAssinaturaMotorista ? new Date(controle.dataAssinaturaMotorista) : null,
      dataAssinaturaResponsavel: controle.dataAssinaturaResponsavel ? new Date(controle.dataAssinaturaResponsavel) : null,
      notas: (controle as any).notas || [],
      auditor: (controle as any).auditor || null,
      dataAuditoria: (controle as any).dataAuditoria ? new Date((controle as any).dataAuditoria) : null
    }));
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
    const fontBytes = await fetch('/fonts/helvetica.ttf').then(res => res.arrayBuffer());
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
      const page = doc.getPage(0);
      const { width, height } = page.getSize();
      
      // Usar fonte padrão do PDF
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontSize = 10;
      const lineHeight = 18;
      let yPos = height - 50;

      // Cabeçalho
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Ajustando posição inicial mais para baixo
      yPos -= lineHeight * 6; // Aumentado de 3 para 6 linhas (3 linhas a mais)
      
      // Linha 1
      page.drawText(`Transportadora: ${controleCompleto.transportadora}`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Usuário: ${controleCompleto.responsavel}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 2
      yPos -= lineHeight * 1.5;
      page.drawText(`Placa Veículo: -`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Nome Motorista: ${controleCompleto.motorista}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 3
      yPos -= lineHeight * 1.5;
      page.drawText(`CPF Motorista: ${controleCompleto.cpfMotorista}`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Horário: ${horaAtual}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 4
      yPos -= lineHeight * 1.5;
      page.drawText(`Quantidade de Pallets: ${controleCompleto.qtdPallets}`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Data: ${dataAtual}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Tabela de Notas
      yPos -= lineHeight * 2; // Espaço antes da tabela
      
      // Cabeçalho da Tabela
      const headerY = yPos;
      const col1 = 50;   // Qtd
      const col2 = 80;   // Nota Fiscal
      const col3 = 150;  // Data
      const col4 = 250;  // Volumes
      
      // Desenha linhas do cabeçalho
      page.drawText('Qtd', { x: col1, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText('Nota Fiscal', { x: col2, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText('Data', { x: col3, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText('Volumes', { x: col4, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
      
      // Linha divisória
      yPos -= 5;
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      // Dados das notas
      yPos -= 25;
      let totalVolumes = 0;
      
      controleCompleto.notas.forEach((nota, index) => {
        if (yPos < 100) {
          // Se estiver chegando no final da página, cria uma nova página
          page.drawText('Continua na próxima página...', { x: 50, y: 50, size: fontSize - 2, font, color: rgb(0.5, 0.5, 0.5) });
          yPos = height - 50; // Volta para o topo da nova página
        }
        
        const volumes = parseInt(nota.volumes) || 1;
        totalVolumes += volumes;
        const dataNota = nota.dataCriacao ? new Date(nota.dataCriacao).toLocaleDateString('pt-BR') : '-';
        
        page.drawText((index + 1).toString(), { x: col1, y: yPos, size: fontSize, font });
        page.drawText(nota.numeroNota || '-', { x: col2, y: yPos, size: fontSize, font });
        page.drawText(dataNota, { x: col3, y: yPos, size: fontSize, font });
        page.drawText(volumes.toString(), { x: col4, y: yPos, size: fontSize, font });
        
        yPos -= lineHeight;
      });
      
      // Totalizadores
      yPos -= lineHeight;
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      yPos -= lineHeight;
      page.drawText('TOTAL:', { x: col2, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(controleCompleto.notas.length.toString(), { x: col1, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(totalVolumes.toString(), { x: col4, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      
      // Rodapé
      yPos -= lineHeight * 2;
      page.drawText(`Nº Controle: ${controleCompleto.numeroManifesto || '-'}`, { x: 50, y: yPos, size: fontSize - 1, font });
      page.drawText(`Total de Volumes: ${totalVolumes}`, { x: 250, y: yPos, size: fontSize - 1, font });

      // Seção de Assinaturas
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
              y: nameY - 25 - signatureHeight,
              width: signatureWidth,
              height: signatureHeight,
            });
            
            // Desenha o carimbo digital abaixo da assinatura com mais espaço
            const stampX = x - 8;
            const stampY = nameY - 50 - signatureHeight; // Aumentado o espaço acima do carimbo
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
              const dateStr = new Date(signatureDate).toLocaleString('pt-BR');
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
          // Linha para assinatura não assinada
          const lineY = y - 25;
          page.drawLine({
            start: { x, y: lineY },
            end: { x: x + 200, y: lineY },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
          });
          
          // Texto de orientação
          page.drawText('(Assinatura não registrada)', {
            x,
            y: lineY - 15,
            size: fontSize - 2,
            font,
            color: rgb(0.6, 0.6, 0.6),
          });
          
          // Retorna a posição Y para o próximo elemento
          return lineY - 30;
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
      const response = await api.delete(`/api/controles/${controle.id}`);
      
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
        const transportadoraValida = editData.transportadora === 'EXPRESSO_GOIAS' ? 'EXPRESSO_GOIAS' : 'ACERT';
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
    setLoadingButtons(prev => ({ ...prev, [`sign_${tipo}_${controle.id}`]: true }));
    setAssinaturaAberta({
      aberto: true,
      controleId: controle.id,
      tipo
    });
  }, [setLoadingButtons, setAssinaturaAberta]);

  const handleFecharAssinatura = useCallback(() => {
    if (assinaturaAberta.controleId && assinaturaAberta.tipo) {
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
  }, [setLoadingButtons, setAssinaturaAberta, assinaturaAberta]);

  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);

  /**
   * Salva uma assinatura digital para um controle
   * @param assinatura - A assinatura em formato base64 (data URL)
   * @returns true se a assinatura foi salva com sucesso, false caso contrário
   */
  const handleSalvarAssinatura = useCallback(async (assinatura: string): Promise<boolean> => {
    console.log('[handleSalvarAssinatura] Iniciando salvamento da assinatura');
    console.log('[handleSalvarAssinatura] Parâmetros:', {
      controleId: assinaturaAberta.controleId,
      tipo: assinaturaAberta.tipo,
      assinaturaLength: assinatura?.length || 0
    });
    
    try {
      // Validação dos parâmetros
      if (!assinaturaAberta.controleId || !assinaturaAberta.tipo) {
        console.error('[handleSalvarAssinatura] Erro: ID do controle ou tipo não especificado');
        throw new Error('ID do controle ou tipo de assinatura não especificado');
      }
      
      if (!assinatura || typeof assinatura !== 'string') {
        throw new Error('Nenhuma assinatura fornecida ou formato inválido');
      }
      
      // Validação do formato da assinatura
      if (!assinatura.startsWith('data:image/')) {
        throw new Error('Formato de assinatura inválido. A assinatura deve ser uma imagem.');
      }
      
      // Verifica o tamanho da assinatura (máximo de 1MB)
      try {
        const base64String = assinatura.split(',')[1] || '';
        const padding = (base64String.match(/=*$/) || [''])[0].length;
        const fileSize = (base64String.length * 3) / 4 - padding;
        const maxSize = 1 * 1024 * 1024; // 1MB
        
        if (fileSize > maxSize) {
          throw new Error(`A assinatura é muito grande (${(fileSize / 1024).toFixed(2)}KB). O tamanho máximo permitido é 1MB.`);
        }
      } catch (error) {
        console.error('Erro ao verificar o tamanho da assinatura:', error);
        // Continua mesmo se não conseguir verificar o tamanho
      }
    
      setSalvandoAssinatura(true);
      
      // Atualiza o controle com a nova assinatura usando POST
      const response = await api.post('/api/controles/atualizar-assinatura', {
        controleId: assinaturaAberta.controleId,
        tipo: assinaturaAberta.tipo,
        assinatura: assinatura
      });
      
      // Verifica se a resposta é válida
      if (!response || response.status !== 200 || !response.data) {
        throw new Error('Resposta inválida do servidor');
      }
      
      const controleAtualizado = response.data;
      
      // Verifica se o controle retornado é válido
      if (!controleAtualizado || !controleAtualizado.id) {
        throw new Error('Dados de controle inválidos retornados do servidor');
      }
      
      // Atualiza o estado local para refletir a nova assinatura imediatamente
      const controlesAtualizados = controles.map(controle => 
        controle.id === controleAtualizado.id ? { ...controle, ...controleAtualizado } : controle
      );
      
      // Atualiza o estado global
      useStore.setState({ controles: controlesAtualizados });
      
      // Mostra feedback visual de sucesso
      enqueueSnackbar(`Assinatura do ${assinaturaAberta.tipo} salva com sucesso!`, { 
        variant: 'success',
        autoHideDuration: 3000,
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'center',
        }
      });
      
      // Fecha o diálogo de assinatura
      setAssinaturaAberta({ aberto: false, controleId: '', tipo: 'motorista' });
      
      return true;
    } catch (error: any) {
      console.error('Erro ao salvar assinatura:', error);
      
      let errorMessage = 'Erro ao salvar assinatura';
      
      // Tratamento de erros específicos
      const axiosError = error as any;
      if (axiosError.response) {
        // Erro de resposta da API
        if (axiosError.response.status === 401) {
          errorMessage = 'Sessão expirada. Faça login novamente.';
        } else if (axiosError.response.status === 403) {
          errorMessage = 'Você não tem permissão para realizar esta ação.';
        } else if (axiosError.response.status === 404) {
          errorMessage = 'Controle não encontrado.';
        } else if (error.response.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (error.response.status >= 500) {
          errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
        }
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      } else if (error.message) {
        // Outros erros
        errorMessage = error.message;
      }
      
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'center',
        }
      });
      
      return false;
    } finally {
      setSalvandoAssinatura(false);
    }
  }, [assinaturaAberta, enqueueSnackbar, setAssinaturaAberta, useStore, controles]);

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
                      <Tooltip title="Ver detalhes">
                        <IconButton 
                          onClick={() => router.push(`/controle/${controle.id}`)}
                          color={!controle.finalizado ? "success" : "primary"}
                          size="small"
                          disabled={loadingButtons[controle.id]}
                          sx={{
                            ...buttonStyles,
                            minHeight: '44px', // Melhor área de toque mobile
                            minWidth: '44px',
                            '&:hover': {
                              backgroundColor: !controle.finalizado ? 'rgba(46, 125, 50, 0.08)' : 'rgba(25, 118, 210, 0.08)'
                            }
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
                        </>
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
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                              {controle.assinaturaMotorista ? 'Assinado' : 'Assinar'}
                            </Button>
                          </Tooltip>
                          <Tooltip title={controle.assinaturaResponsavel ? 'Assinatura do responsável já registrada' : 'Assinar como responsável'}>
                            <Button
                              variant="contained"
                              color={controle.assinaturaResponsavel ? 'success' : 'primary'}
                              size="small"
                              onClick={() => handleAbrirAssinatura(controle, 'responsavel')}
                              disabled={salvandoAssinatura || loadingButtons[`sign_responsavel_${controle.id}`] || !controle.finalizado}
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
                              {controle.assinaturaResponsavel ? 'Assinado' : 'Assinar'}
                            </Button>
                          </Tooltip>
                        </Box>
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
        <Dialog open onClose={handleCloseEdit} maxWidth="sm" fullWidth>
          <DialogTitle>Editar Controle</DialogTitle>
          <DialogContent dividers>
            <TextField
              margin="normal"
              fullWidth
              label="Motorista"
              value={editData.motorista ?? ''}
              onChange={e => setEditData({ ...editData, motorista: e.target.value })}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Responsável"
              value={editData.responsavel ?? ''}
              onChange={e => setEditData({ ...editData, responsavel: e.target.value })}
            />
            <TextField
              margin="normal"
              fullWidth
              label="CPF Motorista"
              value={editData.cpfMotorista ?? ''}
              onChange={e => setEditData({ ...editData, cpfMotorista: e.target.value })}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="transportadora-label">Transportadora</InputLabel>
              <Select
                labelId="transportadora-label"
                value={editData.transportadora ?? 'ACERT'}
                label="Transportadora"
                onChange={e => setEditData({ ...editData, transportadora: e.target.value as any })}
              >
                <MenuItem value="ACERT">ACERT</MenuItem>
                <MenuItem value="EXPRESSO_GOIAS">EXPRESSO GOIÁS</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              fullWidth
              label="Quantidade de Pallets"
              type="number"
              value={editData.qtdPallets ?? 0}
              onChange={e => setEditData({ ...editData, qtdPallets: Number(e.target.value) })}
            />
            <TextField
              margin="normal"
              fullWidth
              multiline
              minRows={3}
              label="Observação"
              value={editData.observacao ?? ''}
              onChange={e => setEditData({ ...editData, observacao: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveEdit}>Salvar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modal de Visualização de PDF */}
      {pdfUrl && (
        <Dialog open={pdfOpen} onClose={() => setPdfOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>Pré-visualização do PDF</DialogTitle>
          <DialogContent dividers sx={{ height: 600 }}>
            <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPdfOpen(false)}>Fechar</Button>
            <Button
              onClick={() => {
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = 'romaneio.pdf';
                a.click();
              }}
            >
              Baixar
            </Button>
            {navigator.share && (
              <Button
                onClick={() => {
                  navigator.share({ title: 'Romaneio', url: pdfUrl });
                }}
              >
                Compartilhar
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* Diálogo de Assinatura - Só renderiza se tiver controleId válido */}
      {assinaturaAberta.aberto && assinaturaAberta.controleId && (
        <Dialog 
          open={true}
          onClose={handleFecharAssinatura}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }
          }}
        >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          py: 1.5,
          px: 3
        }}>
          <Box display="flex" alignItems="center">
            <HowToRegIcon sx={{ mr: 1 }} />
            <span id="assinatura-dialog-title">
              {assinaturaAberta.tipo === 'motorista' 
                ? 'Assinatura do Motorista' 
                : 'Assinatura do Responsável'}
            </span>
          </Box>
          <Tooltip title="Ajuda">
            <IconButton 
              size="small" 
              sx={{ color: 'primary.contrastText' }}
              onClick={() => {
                enqueueSnackbar('Assine na área indicada usando o mouse ou toque na tela', {
                  variant: 'info',
                  autoHideDuration: 5000,
                  anchorOrigin: { vertical: 'top', horizontal: 'center' },
                });
              }}
              aria-label="Ajuda com a assinatura digital"
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        
        <DialogContent sx={{ py: 3, px: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" id="assinatura-dialog-description" gutterBottom>
              Por favor, {assinaturaAberta.tipo === 'motorista' 
                ? 'assine no campo abaixo para confirmar o recebimento da carga' 
                : 'assine no campo abaixo para confirmar a entrega da carga'}
            </Typography>
            
            <Box sx={{ 
              mt: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              bgcolor: 'background.paper'
            }}>
              {(() => {
                if (!assinaturaAberta.controleId) {
                  console.error('[Modal Assinatura] controleId não informado');
                  return <Typography color="error">Erro: Controle não selecionado.</Typography>;
                }
                const controle = controles.find(c => c.id === assinaturaAberta.controleId);
                if (!controle) {
                  console.error('[Modal Assinatura] Controle não encontrado:', assinaturaAberta.controleId);
                  return <Typography color="error">Erro: Controle não encontrado.</Typography>;
                }
                return (
                  <AssinaturaDigital
                    ref={assinaturaRef}
                    onSave={async (signatureData) => {
                      try {
                        await handleSalvarAssinatura(signatureData);
                        await fetchControles();
                        handleFecharAssinatura();
                      } catch (error) {
                        console.error('Erro ao processar assinatura:', error);
                      }
                    }}
                    label={assinaturaAberta.tipo === 'motorista' ? 'Sua Assinatura' : 'Sua Assinatura'}
                    value={assinaturaAberta.tipo === 'motorista' ? controle.assinaturaMotorista || '' : controle.assinaturaResponsavel || ''}
                    showSaveButton={true}
                    disabled={salvandoAssinatura}
                  />
                );
              })()}
            </Box>
            
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              borderLeft: '4px solid',
              borderColor: 'primary.main'
            }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Importante:</strong> Sua assinatura será registrada digitalmente e terá valor legal. 
                Certifique-se de que está assinando no campo correto.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={handleFecharAssinatura}
            variant="outlined"
            color="inherit"
            disabled={salvandoAssinatura}
          >
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button 
            onClick={async () => {
              try {
                if (assinaturaRef.current) {
                  // Tenta obter a assinatura usando múltiplas estratégias
                  let signature = null;
                  
                  // Estratégia 1: Usar getSignature se disponível
                  if (typeof assinaturaRef.current.getSignature === 'function') {
                    signature = assinaturaRef.current.getSignature();
                  }
                  
                  // Estratégia 2: Verificar se não está vazio usando isEmpty
                  if (!signature && typeof assinaturaRef.current.isEmpty === 'function') {
                    if (!assinaturaRef.current.isEmpty()) {
                      // Se não está vazio, tenta obter via toDataURL
                      if (typeof assinaturaRef.current.toDataURL === 'function') {
                        signature = assinaturaRef.current.toDataURL('image/png');
                      }
                    }
                  }
                  
                  if (signature && signature.length > 1000) {
                    await handleSalvarAssinatura(signature);
                    await fetchControles();
                    handleFecharAssinatura();
                  } else {
                    enqueueSnackbar('Por favor, faça uma assinatura antes de salvar', {
                      variant: 'warning',
                      autoHideDuration: 3000,
                      anchorOrigin: { vertical: 'top', horizontal: 'center' },
                    });
                  }
                } else {
                  enqueueSnackbar('Erro: Componente de assinatura não está pronto', {
                    variant: 'error',
                    autoHideDuration: 3000,
                    anchorOrigin: { vertical: 'top', horizontal: 'center' },
                  });
                }
              } catch (error) {
                console.error('Erro ao processar assinatura:', error);
                enqueueSnackbar('Erro ao processar assinatura. Tente novamente.', {
                  variant: 'error',
                  autoHideDuration: 3000,
                  anchorOrigin: { vertical: 'top', horizontal: 'center' },
                });
              }
            }}
            variant="contained"
            color="primary"
            disabled={salvandoAssinatura}
            startIcon={salvandoAssinatura ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ minWidth: '120px' }}
          >
            {salvandoAssinatura ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
        </Dialog>
      )}

    </Container>
  );
};

export default ListarControlesContent;
