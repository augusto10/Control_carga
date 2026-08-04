import { BarcodeAnalysis, BarcodeFormat } from '@/types/labels';

function onlyAsciiPrintable(value: string) {
  return /^[\x20-\x7E]+$/.test(value);
}

function calculateEan13Checksum(base: string): number {
  const digits = base.split('').map(Number);
  const sum = digits.reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return (10 - (sum % 10)) % 10;
}

function calculateEan8Checksum(base: string): number {
  const digits = base.split('').map(Number);
  const sum = digits.reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 3 : 1);
  }, 0);

  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  return calculateEan13Checksum(value.slice(0, 12)) === Number(value[12]);
}

export function isValidEan8(value: string): boolean {
  if (!/^\d{8}$/.test(value)) return false;
  return calculateEan8Checksum(value.slice(0, 7)) === Number(value[7]);
}

export function detectBarcodeType(value: string): BarcodeFormat {
  if (isValidEan13(value)) return 'EAN13';
  if (isValidEan8(value)) return 'EAN8';
  if (value.length > 0 && onlyAsciiPrintable(value)) return 'CODE128';
  return 'UNSUPPORTED';
}

export function analyzeBarcode(value: string | null | undefined): BarcodeAnalysis {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return {
      isValid: false,
      type: 'UNSUPPORTED',
      normalizedValue,
      reason: 'Este produto não possui código de barras cadastrado.',
    };
  }

  if (/^\d{13}$/.test(normalizedValue) && !isValidEan13(normalizedValue)) {
    return {
      isValid: false,
      type: 'EAN13',
      normalizedValue,
      reason: 'Código de barras inválido. O dígito verificador do EAN-13 não confere.',
    };
  }

  if (/^\d{8}$/.test(normalizedValue) && !isValidEan8(normalizedValue)) {
    return {
      isValid: false,
      type: 'EAN8',
      normalizedValue,
      reason: 'Código de barras inválido. O dígito verificador do EAN-8 não confere.',
    };
  }

  const type = detectBarcodeType(normalizedValue);

  if (type === 'UNSUPPORTED') {
    return {
      isValid: false,
      type,
      normalizedValue,
      reason: 'Código de barras inválido.',
    };
  }

  return {
    isValid: true,
    type,
    normalizedValue,
  };
}
