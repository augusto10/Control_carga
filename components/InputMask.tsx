import React, { useState, useEffect } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

interface InputMaskProps extends Omit<TextFieldProps, 'onChange' | 'value'> {
  mask: 'cpf' | 'telefone' | 'cnh';
  value: string;
  onChange: (value: string) => void;
}

const InputMask: React.FC<InputMaskProps> = ({ mask, value, onChange, ...props }) => {
  const [displayValue, setDisplayValue] = useState('');

  // Função para remover formatação
  const removeFormatting = (text: string): string => {
    return text.replace(/\D/g, '');
  };

  // Função para aplicar máscara de CPF
  const applyCpfMask = (text: string): string => {
    const numbers = removeFormatting(text);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  // Função para aplicar máscara de telefone
  const applyTelefoneMask = (text: string): string => {
    const numbers = removeFormatting(text);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Função para aplicar máscara de CNH
  const applyCnhMask = (text: string): string => {
    const numbers = removeFormatting(text);
    return numbers.slice(0, 11); // CNH tem 11 dígitos
  };

  // Aplicar máscara baseada no tipo
  const applyMask = (text: string): string => {
    switch (mask) {
      case 'cpf':
        return applyCpfMask(text);
      case 'telefone':
        return applyTelefoneMask(text);
      case 'cnh':
        return applyCnhMask(text);
      default:
        return text;
    }
  };

  // Atualizar display value quando value prop mudar
  useEffect(() => {
    setDisplayValue(applyMask(value));
  }, [value, mask]);

  // Handler para mudanças no input
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const maskedValue = applyMask(inputValue);
    const cleanValue = removeFormatting(inputValue);
    
    setDisplayValue(maskedValue);
    onChange(cleanValue); // Sempre retorna valor limpo para o parent
  };

  // Configurações específicas por tipo de máscara
  const getMaskConfig = () => {
    switch (mask) {
      case 'cpf':
        return {
          placeholder: '000.000.000-00',
          inputProps: { maxLength: 14 }
        };
      case 'telefone':
        return {
          placeholder: '(11) 99999-9999',
          inputProps: { maxLength: 15 }
        };
      case 'cnh':
        return {
          placeholder: '00000000000',
          inputProps: { maxLength: 11 }
        };
      default:
        return {};
    }
  };

  const maskConfig = getMaskConfig();

  return (
    <TextField
      {...props}
      value={displayValue}
      onChange={handleChange}
      placeholder={maskConfig.placeholder}
      inputProps={{
        ...props.inputProps,
        ...maskConfig.inputProps
      }}
    />
  );
};

export default InputMask;
