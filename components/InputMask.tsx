import React from 'react';
import ReactInputMask from 'react-input-mask';
import { TextField, TextFieldProps } from '@mui/material';
import { Input } from './ui/Input';

interface InputMaskProps {
  mask: string | 'cpf' | 'telefone' | 'cnpj';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  label?: string;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

const masks = {
  cpf: '999.999.999-99',
  cnpj: '99.999.999/9999-99',
  telefone: '(99) 99999-9999',
};

const InputMask: React.FC<InputMaskProps> = ({ 
  mask, 
  value, 
  onChange, 
  ...props 
}) => {
  const maskString = masks[mask as keyof typeof masks] || mask;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Se tiver label ou error, assume que é para usar o TextField do MUI
  if (props.label || props.error || props.helperText || props.fullWidth) {
    return (
      <ReactInputMask
        mask={maskString}
        value={value}
        onChange={handleChange}
        disabled={props.disabled}
      >
        {(inputProps: any) => (
          <TextField
            {...inputProps}
            {...(props as TextFieldProps)}
            variant="outlined"
          />
        )}
      </ReactInputMask>
    );
  }

  return (
    <ReactInputMask
      mask={maskString}
      value={value}
      onChange={handleChange}
      disabled={props.disabled}
    >
      {(inputProps: any) => (
        <Input 
          {...inputProps} 
          {...props}
        />
      )}
    </ReactInputMask>
  );
};

export default InputMask;
