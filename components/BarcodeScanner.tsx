import React, { useEffect } from 'react';
import { Typography, Box, Paper, Stack } from '@mui/material';
import { QrCodeScanner as QrCodeScannerIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionPaper = motion(Paper);

type BarcodeScannerProps = {
  onScan: (data: string) => void;
};

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    const RESET_DELAY = 100; // Tempo em ms para considerar uma nova leitura

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime;
      
      // Se passou muito tempo desde a última tecla, reseta o buffer
      if (timeSinceLastKey > RESET_DELAY) {
        buffer = '';
      }
      lastKeyTime = now;

      // Ignora modificadores ou combinações
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Se for tecla Enter ou Tab, processa o buffer
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault(); // Evita comportamento padrão do navegador
        
        console.log('Buffer recebido:', buffer); // Log para depuração
        
        // Tenta processar como código de 44 caracteres (DANFE)
        if (buffer.length === 44) {
          try {
            const barcode = buffer;
            const nfeData = {
              uf: barcode.substring(0, 2),
              emissao: barcode.substring(2, 6),
              cnpj: barcode.substring(6, 20),
              modelo: barcode.substring(20, 22),
              serie: barcode.substring(22, 25),
              numero: barcode.substring(25, 34).replace(/^0+/, ''), // Remove zeros à esquerda
              codigo: barcode.substring(34, 43),
              digito: barcode.substring(43, 44)
            };
            
            console.log('NF-e processada:', nfeData); // Log para depuração
            
            // Formato para nosso sistema: CODIGO;NUMERO
            onScan(`${nfeData.codigo};${nfeData.numero}`);
            buffer = '';
            return;
          } catch (error) {
            console.error('Erro ao processar código de barras:', error);
          }
        }
        // Se não for código de 44 caracteres, tenta processar como formato alternativo
        else if (buffer.includes(';')) {
          // Formato alternativo: CODIGO;NUMERO
          onScan(buffer);
          buffer = '';
          return;
        }
        
        buffer = '';
        return;
      }

      // Se for caractere imprimível, adiciona ao buffer
      if (e.key.length === 1 && e.key.match(/[0-9;]/)) {
        buffer += e.key;
        // Limita o tamanho do buffer para evitar problemas de memória
        if (buffer.length > 100) {
          buffer = buffer.slice(-100);
        }
      }
    };

    // Adiciona os listeners
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onScan]);

  return (
    <MotionPaper
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      variant="outlined"
      sx={{ 
        textAlign: 'center', 
        mt: 2, 
        p: 4, 
        border: '2px dashed',
        borderColor: 'primary.light',
        borderRadius: 3,
        bgcolor: 'rgba(0, 118, 255, 0.02)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #0076ff, transparent)',
          animation: 'scanning 2s linear infinite'
        }}
      />
      
      <Stack spacing={2} alignItems="center">
        <QrCodeScannerIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.8 }} />
        
        <Box>
          <Typography variant="h6" fontWeight={700} color="primary.dark" gutterBottom>
            Pronto para Leitura
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aponte o leitor para o código de barras da NF-e
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 0.5, 
          bgcolor: 'white', 
          p: 2, 
          borderRadius: 2,
          border: '1px solid rgba(0,0,0,0.05)',
          width: '100%',
          maxWidth: 300
        }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Formatos suportados:
          </Typography>
          <Typography variant="caption" color="text.secondary">• DANFE padrão (44 dígitos)</Typography>
          <Typography variant="caption" color="text.secondary">• Formato: CODIGO;NUMERO</Typography>
        </Box>
      </Stack>

      <style jsx global>{`
        @keyframes scanning {
          0% { transform: translateY(0); opacity: 0; }
          50% { transform: translateY(150px); opacity: 1; }
          100% { transform: translateY(300px); opacity: 0; }
        }
      `}</style>
    </MotionPaper>
  );
};

export default BarcodeScanner;
