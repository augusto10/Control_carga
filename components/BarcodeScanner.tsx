import React, { useEffect } from 'react';
import { Typography, Box } from '@mui/material';

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
    <Box sx={{ textAlign: 'center', mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
      <Typography variant="body1" color="textSecondary">
        Aponte o leitor para o código de barras da NF-e
      </Typography>
      <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
        Formatos suportados:
      </Typography>
      <Typography variant="caption" color="textSecondary" display="block">
        • DANFE padrão (44 dígitos)
      </Typography>
      <Typography variant="caption" color="textSecondary" display="block">
        • Formato: CODIGO;NUMERO
      </Typography>
    </Box>
  );
};

export default BarcodeScanner;
