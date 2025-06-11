import React, { useEffect } from 'react';
import { Typography, Box } from '@mui/material';

type BarcodeScannerProps = {
  onScan: (data: string) => void;
};

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Verifica se é um código de barras (tecla Enter no final)
      if (e.key === 'Enter') {
        const barcode = (e.target as HTMLInputElement)?.value;
        if (barcode) {
          try {
            // Padrão DANFE NF-e: 44 caracteres
            if (barcode.length === 44) {
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
            } else {
              throw new Error('Código inválido - Não é um DANFE NF-e padrão');
            }
          } catch (error) {
            console.error('Erro ao processar código de barras:', error);
          }
          // Limpa o input após a leitura
          (e.target as HTMLInputElement).value = '';
        }
      }
    };

    // Adiciona um input invisível para capturar os dados do leitor
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);
    input.focus();
    
    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      document.body.removeChild(input);
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
