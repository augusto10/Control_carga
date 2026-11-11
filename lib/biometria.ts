import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const PREFIXO_TEMPLATE = 'enc:v1:';
const TAMANHO_TEMPLATE = 400;

function obterChave() {
  const valor = process.env.BIOMETRIA_ENCRYPTION_KEY;
  if (!valor || !/^[0-9a-f]{64}$/i.test(valor)) {
    throw new Error('BIOMETRIA_ENCRYPTION_KEY deve conter 64 caracteres hexadecimais.');
  }
  return Buffer.from(valor, 'hex');
}

export function validarTemplateBiometrico(template: unknown): template is string {
  if (typeof template !== 'string') return false;
  const bytes = Buffer.from(template, 'base64');
  return bytes.length === TAMANHO_TEMPLATE && bytes.toString('base64') === template;
}

export function criptografarTemplateBiometrico(template: string) {
  if (!validarTemplateBiometrico(template)) {
    throw new Error('Template biométrico inválido.');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', obterChave(), iv);
  const encrypted = Buffer.concat([cipher.update(template, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIXO_TEMPLATE}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function descriptografarTemplateBiometrico(value: string) {
  if (!value.startsWith(PREFIXO_TEMPLATE)) {
    if (validarTemplateBiometrico(value)) return value;
    throw new Error('Template biométrico armazenado em formato inválido.');
  }

  const [ivBase64, tagBase64, encryptedBase64] = value.slice(PREFIXO_TEMPLATE.length).split(':');
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error('Template biométrico criptografado está inválido.');
  }

  const decipher = createDecipheriv('aes-256-gcm', obterChave(), Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  if (!validarTemplateBiometrico(decrypted)) {
    throw new Error('Template biométrico descriptografado está inválido.');
  }
  return decrypted;
}
