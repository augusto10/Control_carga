import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, TextField, Typography, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import BarcodeScanner from '../components/BarcodeScanner';
import { useStore } from '../store/store';

interface NotaAdicionada {
  codigo: string;
  numeroNota: string;
  valor: number;
}

const AdicionarNotasPage = () => {
  const [notas, setNotas] = useState<NotaAdicionada[]>([]);
  const [loading, setLoading] = useState(false);
  const [valorManual, setValorManual] = useState('');
  const { addNota, status } = useStore();
  const { enqueueSnackbar } = useSnackbar();

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
        valor: parseFloat(valorManual) || 0 
      };
      
      setNotas([...notas, novaNota]);
      setValorManual('');
      enqueueSnackbar('Nota escaneada com sucesso!', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Formato inválido', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    }
  };

  const handleAdicionar = async () => {
    if (notas.length === 0) return;
    
    setLoading(true);
    try {
      await Promise.all(notas.map(nota => addNota(nota)));
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
          Escaneie o código de barras da DANFE NF-e (44 caracteres)
        </Typography>
        <BarcodeScanner onScan={handleScan} />
        
        <TextField
          label="Valor da NF-e (R$)"
          value={valorManual}
          onChange={(e) => setValorManual(e.target.value.replace(/[^0-9.]/g, ''))}
          sx={{ mt: 2, width: '100%' }}
          placeholder="Digite o valor da nota fiscal"
          type="number"
        />
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
              <TextField
                label="Valor"
                value={nota.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                sx={{ flex: 1 }}
                disabled
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
