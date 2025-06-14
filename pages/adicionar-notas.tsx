import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, CircularProgress, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import BarcodeScanner from '../components/BarcodeScanner';
import { useStore } from '../store/store';
import { NumericFormat } from 'react-number-format';

interface NotaAdicionada {
  codigo: string;
  numeroNota: string;
  valorStr: string; // raw input string
}

interface CurrencyInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  fullWidth?: boolean;
  sx?: any;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ label, value, onChange, fullWidth, sx }) => {
  return (
    <NumericFormat
      value={value}
      onValueChange={(v: any) => onChange(v.formattedValue)}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      prefix=""
      customInput={TextField}
      fullWidth={fullWidth}
      sx={sx}
      // Passando as props do TextField diretamente
      label={label}
      variant="outlined"
    />
  );
};

const AdicionarNotasPage = () => {
  const [notas, setNotas] = useState<NotaAdicionada[]>([]);
  const [loading, setLoading] = useState(false);
  const { addNota, status } = useStore();
  const { enqueueSnackbar } = useSnackbar();
  const [manualCodigo, setManualCodigo] = useState('');
  const [manualNumero, setManualNumero] = useState('');
  const [manualValor, setManualValor] = useState('');

  useEffect(() => {
    if (status === 'success') {
      enqueueSnackbar('Notas salvas com sucesso!', { variant: 'success' });
    } else if (status === 'error') {
      enqueueSnackbar('Erro ao salvar notas', { variant: 'error' });
    }
  }, [status, enqueueSnackbar]);

  const handleScan = (data: string) => {
    try {
      const [codigo, numeroNota] = data.split(';');
      
      if (!codigo || !numeroNota) {
        throw new Error('Formato inválido. Use: CODIGO;NUMERO_NOTA');
      }
      
      const novaNota = { 
        codigo, 
        numeroNota, 
        valorStr: '' 
      };
      
      setNotas([...notas, novaNota]);
      enqueueSnackbar('Nota escaneada com sucesso!', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Formato inválido', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    }
  };

  // helper parse
  const parseDecimal = (value: string) => {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
  };

  const handleAddManual = () => {
    if (!manualNumero.trim()) {
      enqueueSnackbar('Número da nota obrigatório', { variant: 'warning' });
      return;
    }
    const novaNota: NotaAdicionada = {
      codigo: manualCodigo.trim() || 'MANUAL',
      numeroNota: manualNumero.trim(),
      valorStr: manualValor.trim(),
    };
    setNotas([...notas, novaNota]);
    setManualCodigo('');
    setManualNumero('');
    setManualValor('');
  };

  const handleAdicionar = async () => {
    if (notas.length === 0) return;
    
    setLoading(true);
    try {
      await Promise.all(notas.map(nota => addNota({
        codigo: nota.codigo,
        numeroNota: nota.numeroNota,
        valor: parseDecimal(nota.valorStr)
      })));
      setNotas([]);
    } catch (error) {
      console.error('Erro ao adicionar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Adicionar Notas Fiscais
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
          Escaneie o código de barras da DANFE NF-e (44 caracteres) ou preencha manualmente
        </Typography>
        <BarcodeScanner onScan={handleScan} />
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <TextField label="Código" value={manualCodigo} onChange={(e)=>setManualCodigo(e.target.value)} sx={{ flex: 1 }} />
          <TextField label="Número da Nota *" value={manualNumero} onChange={(e)=>setManualNumero(e.target.value)} sx={{ flex: 1 }} />
          <CurrencyInput label="Valor (R$)" value={manualValor} onChange={setManualValor} sx={{ flex: 1 }} fullWidth={false} />
          <Button variant="outlined" onClick={handleAddManual} sx={{ alignSelf: 'center', height: 56 }}>
            Adicionar Nota
          </Button>
        </Box>
      </Paper>
      
      {notas.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Notas a serem adicionadas ({notas.length}):
          </Typography>
          {notas.map((nota, index) => (
            <Box key={index} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <TextField
                label="Código"
                value={nota.codigo}
                sx={{ mr: 2, flex: 1 }}
                disabled
              />
              <TextField
                label="Número da Nota"
                value={nota.numeroNota}
                sx={{ mr: 2, flex: 1 }}
                disabled
              />
              <CurrencyInput
                label="Valor (R$)"
                value={nota.valorStr}
                onChange={(val)=>{
                  setNotas(prev=>{
                    const arr=[...prev];
                    arr[index].valorStr=val;
                    return arr;
                  });
                }}
                sx={{ flex:1 }}
              />
            </Box>
          ))}
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleAdicionar}
            disabled={loading}
            fullWidth
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Salvando...' : `Salvar ${notas.length} Nota(s)`}
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default AdicionarNotasPage;
