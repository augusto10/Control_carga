import React, { useEffect } from 'react';
import { Typography, Box } from '@mui/material';

type BarcodeScannerProps = {
  onScan: (data: string) => void;
};

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  useEffect(() => {
    let buffer = '';

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignora modificadores ou combinações
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // Captura tecla Enter --> processar
      if (e.key === 'Enter') {
        if (buffer.length === 44) {
          try {
            const barcode = buffer;
            const nfeData = {
              uf: barcode.substring(0, 2),
              emissao: barcode.substring(2, 6),
              cnpj: barcode.substring(6, 20),
              modelo: barcode.substring(20, 22),
              serie: barcode.substring(22, 25),
              numero: barcode.substring(25, 34),
              codigo: barcode.substring(34, 43),
              digito: barcode.substring(43, 44)
            };
            
            // Formato para nosso sistema: CODIGO;NUMERO;VALOR
            // Como o valor não vem no código, usaremos 0 por padrão
            onScan(`${nfeData.codigo};${nfeData.numero};0`);
          } catch (error) {
            console.error('Erro ao processar código de barras:', error);
          }
        }
        buffer = '';
        return;
      }
      // Se for caractere imprimível único, adicionar ao buffer
      if (e.key.length === 1) {
        buffer += e.key;
        // Mantém apenas os últimos 44 caracteres
        if (buffer.length > 44) {
          buffer = buffer.slice(-44);
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [onScan]);

  return (
    <Box sx={{ textAlign: 'center', mt: 2 }}>
      <Typography variant="body1" color="textSecondary">
        Aponte o leitor para o código de barras da NF-e
      </Typography>
      <Typography variant="caption" color="textSecondary">
        (Formato esperado: DANFE padrão - 44 caracteres)
      </Typography>
    </Box>
  );
};

export default BarcodeScanner;
