import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress, 
  TextField, 
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useSnackbar } from 'notistack';
import BarcodeScannerComponent from './BarcodeScanner';
import { useStore } from '../store/store';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon, Edit as EditIcon } from '@mui/icons-material';

interface NotaAdicionada {
  codigo: string;
  numeroNota: string;
  valorStr: string;
  editando?: boolean;
}

const AdicionarNotasContent: React.FC = () => {
  const [notas, setNotas] = useState<NotaAdicionada[]>([]);
  const [loading, setLoading] = useState(false);
  const [numeroNota, setNumeroNota] = useState('');
  const [valor, setValor] = useState('');
  const [scannerAberto, setScannerAberto] = useState(true);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { addNota } = useStore();

  // Função para processar código de barras lido
  const handleBarcodeScanned = (barcode: string) => {
    try {
      // Extrai o número da nota do código de barras (ajuste conforme o formato do seu código de barras)
      const numeroNotaExtraido = barcode.substring(0, 9); // Exemplo: pega os primeiros 9 dígitos
      
      // Verifica se a nota já existe
      const notaExistente = notas.find(n => n.numeroNota === numeroNotaExtraido);
      if (notaExistente) {
        enqueueSnackbar('Esta nota já foi adicionada', { variant: 'warning' });
        return;
      }
      
      // Adiciona a nova nota com valor em branco para preenchimento
      const novaNota: NotaAdicionada = {
        codigo: `NOTA-${Date.now()}`,
        numeroNota: numeroNotaExtraido,
        valorStr: '',
        editando: true
      };
      
      setNotas([...notas, novaNota]);
      enqueueSnackbar('Nota adicionada. Preencha o valor.', { variant: 'info' });
    } catch (error) {
      console.error('Erro ao processar código de barras:', error);
      enqueueSnackbar('Erro ao processar código de barras', { variant: 'error' });
    }
  };

  // Adiciona uma nota manualmente
  const adicionarNota = () => {
    if (!numeroNota) {
      enqueueSnackbar('Informe o número da nota', { variant: 'warning' });
      return;
    }

    // Verifica se a nota já existe
    const notaExistente = notas.find(n => n.numeroNota === numeroNota.trim());
    if (notaExistente) {
      enqueueSnackbar('Esta nota já foi adicionada', { variant: 'warning' });
      return;
    }

    const novaNota: NotaAdicionada = {
      codigo: `NOTA-${Date.now()}`,
      numeroNota: numeroNota.trim(),
      valorStr: valor || '',
      editando: true
    };

    setNotas([...notas, novaNota]);
    setNumeroNota('');
    setValor('');
    enqueueSnackbar('Nota adicionada. Preencha o valor.', { variant: 'info' });
  };

  // Remove uma nota da lista
  const removerNota = (index: number) => {
    const novasNotas = [...notas];
    novasNotas.splice(index, 1);
    setNotas(novasNotas);
    enqueueSnackbar('Nota removida', { variant: 'info' });
  };

  // Atualiza o valor de uma nota
  const atualizarValor = (index: number, novoValor: string) => {
    const novasNotas = [...notas];
    novasNotas[index].valorStr = novoValor;
    setNotas(novasNotas);
  };

  // Salva o valor de uma nota
  const salvarValor = (index: number) => {
    const nota = notas[index];
    if (!nota.valorStr || parseFloat(nota.valorStr.replace(',', '.')) <= 0) {
      enqueueSnackbar('Informe um valor válido maior que zero', { variant: 'warning' });
      return;
    }
    
    const novasNotas = [...notas];
    novasNotas[index].editando = false;
    setNotas(novasNotas);
    enqueueSnackbar('Valor salvo com sucesso', { variant: 'success' });
  };

  // Habilita a edição do valor
  const editarValor = (index: number) => {
    const novasNotas = [...notas];
    novasNotas[index].editando = true;
    setNotas(novasNotas);
  };

  // Salva todas as notas no banco de dados
  const salvarTodasNotas = async () => {
    if (notas.length === 0) {
      enqueueSnackbar('Nenhuma nota para salvar', { variant: 'warning' });
      return;
    }
    
    // Verifica se todas as notas têm valor preenchido
    const notasSemValor = notas.filter(n => !n.valorStr || parseFloat(n.valorStr.replace(',', '.')) <= 0);
    if (notasSemValor.length > 0) {
      enqueueSnackbar(`Preencha o valor para ${notasSemValor.length} nota(s)`, { variant: 'warning' });
      return;
    }
    
    setLoading(true);
    const loadingSnackbar = enqueueSnackbar('Salvando notas...', { 
      variant: 'info',
      persist: true
    });
    
    try {
      const resultados = await Promise.allSettled(
        notas.map(nota => {
          const valorNumerico = parseFloat(nota.valorStr.replace(/\./g, '').replace(',', '.'));
          
          return addNota({
            codigo: `NOTA-${nota.numeroNota}`,
            numeroNota: nota.numeroNota,
            valor: valorNumerico,
          });
        })
      );
      
      const sucessos = resultados.filter(r => r.status === 'fulfilled').length;
      const falhas = resultados.filter(r => r.status === 'rejected');
      
      if (loadingSnackbar) closeSnackbar(loadingSnackbar);
      
      // Mostra mensagens de erro individuais, se houver
      falhas.forEach((falha: any) => {
        if (falha.reason) {
          enqueueSnackbar(
            falha.reason.message || 'Erro ao salvar nota', 
            { variant: 'error' }
          );
        }
      });
      
      if (falhas.length > 0) {
        enqueueSnackbar(
          `${sucessos} nota(s) salva(s) com sucesso, ${falhas.length} falha(s).`, 
          { variant: 'warning' }
        );
      } else {
        enqueueSnackbar('Todas as notas foram salvas com sucesso!', { variant: 'success' });
        setNotas([]); // Limpa a lista após salvar com sucesso
      }
      
      // Remove apenas as notas salvas com sucesso
      if (sucessos > 0) {
        const indicesComErro = resultados
          .map((r, i) => r.status === 'rejected' ? i : -1)
          .filter(i => i !== -1);
          
        setNotas(prevNotas => 
          prevNotas.filter((_, index) => !indicesComErro.includes(index))
        );
      }
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
      enqueueSnackbar('Erro ao salvar notas', { variant: 'error' });
    } finally {
      setLoading(false);
      if (loadingSnackbar) closeSnackbar(loadingSnackbar);
    }
  };

  // Formata o valor para exibição
  const formatarValor = (valor: string): string => {
    if (!valor) return '0,00';
    // Remove tudo que não for número ou vírgula
    const valorLimpo = valor.replace(/[^0-9,]/g, '');
    // Se não tiver vírgula, adiciona ,00
    if (!valorLimpo.includes(',')) {
      return `${valorLimpo},00`;
    }
    // Garante que tem exatamente 2 casas decimais
    const [intPart, decimalPart] = valorLimpo.split(',');
    if (decimalPart.length === 1) return `${intPart},${decimalPart}0`;
    if (decimalPart.length > 2) return `${intPart},${decimalPart.substring(0, 2)}`;
    return valorLimpo;
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      {/* Leitor de Código de Barras */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Leitor de Código de Barras
        </Typography>
        <Box sx={{ 
          width: '100%', 
          height: 240, 
          position: 'relative',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          mb: 2
        }}>
          <BarcodeScannerComponent
            onUpdate={(_, result) => {
              if (result && result.getText()) {
                handleBarcodeScanned(result.getText());
              }
            }}
            onError={(error) => {
              console.error('Erro ao acessar a câmera:', error);
              enqueueSnackbar('Erro ao acessar a câmera', { variant: 'error' });
            }}
          />
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            zIndex: 1
          }}>
            <Typography>Posicione o código de barras dentro da área</Typography>
          </Box>
        </Box>
      </Paper>

      
      {/* Formulário de Adição Manual */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Adicionar Nota Manualmente
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, mb: 2 }}>
          <TextField
            label="Número da Nota"
            variant="outlined"
            fullWidth
            value={numeroNota}
            onChange={(e) => setNumeroNota(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && adicionarNota()}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={adicionarNota}
            startIcon={<AddIcon />}
            sx={{ minWidth: 150 }}
          >
            Adicionar
          </Button>
        </Box>
      </Paper>

      {/* Lista de Notas Adicionadas */}
      {notas.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Notas Adicionadas</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={salvarTodasNotas}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            >
              {loading ? 'Salvando...' : 'Salvar Todas'}
            </Button>
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Número da Nota</TableCell>
                  <TableCell align="right">Valor (R$)</TableCell>
                  <TableCell width={120} align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notas.map((nota, index) => (
                  <TableRow key={nota.codigo}>
                    <TableCell>{nota.numeroNota}</TableCell>
                    <TableCell align="right">
                      {nota.editando ? (
                        <TextField
                          value={nota.valorStr}
                          onChange={(e) => {
                            // Permite apenas números e vírgula
                            const valor = e.target.value.replace(/[^0-9,]/g, '');
                            // Remove vírgulas extras
                            const partes = valor.split(',');
                            if (partes.length > 2) {
                              // Se houver mais de uma vírgula, mantém apenas a primeira
                              const valorLimpo = [partes[0], partes.slice(1).join('')].join(',');
                              atualizarValor(index, valorLimpo);
                            } else {
                              atualizarValor(index, valor);
                            }
                          }}
                          size="small"
                          sx={{ width: 150 }}
                          autoFocus
                          onKeyPress={(e) => e.key === 'Enter' && salvarValor(index)}
                          placeholder="0,00"
                          inputProps={{ 
                            style: { textAlign: 'right' },
                            inputMode: 'decimal'
                          }}
                        />
                      ) : (
                        <Box 
                          onClick={() => editarValor(index)}
                          sx={{ 
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: 1,
                            '&:hover': { backgroundColor: 'action.hover' }
                          }}
                        >
                          {nota.valorStr ? 
                            parseFloat(nota.valorStr.replace(/\./g, '').replace(',', '.')).toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            }) : 
                            'Clique para editar'}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {nota.editando ? (
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => salvarValor(index)}
                          disabled={loading}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => editarValor(index)}
                          disabled={loading}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => removerNota(index)}
                        disabled={loading}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default AdicionarNotasContent;
