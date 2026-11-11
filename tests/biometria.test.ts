import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';
import {
  criptografarTemplateBiometrico,
  descriptografarTemplateBiometrico,
  validarTemplateBiometrico,
} from '@/lib/biometria';
import { validarTokenAgenteBiometria } from '@/lib/biometria-agent-auth';

process.env.BIOMETRIA_ENCRYPTION_KEY = randomBytes(32).toString('hex');
process.env.BIOMETRIA_AGENT_TOKEN = randomBytes(32).toString('hex');

const template = randomBytes(400).toString('base64');
const encrypted = criptografarTemplateBiometrico(template);

assert.ok(encrypted.startsWith('enc:v1:'));
assert.notEqual(encrypted, template);
assert.equal(descriptografarTemplateBiometrico(encrypted), template);
assert.equal(descriptografarTemplateBiometrico(template), template);
assert.equal(validarTemplateBiometrico(template), true);
assert.equal(validarTemplateBiometrico(Buffer.alloc(399).toString('base64')), false);
const modifiedTemplate = `${encrypted.slice(0, -1)}${encrypted.endsWith('A') ? 'B' : 'A'}`;
assert.throws(() => descriptografarTemplateBiometrico(modifiedTemplate));

assert.equal(validarTokenAgenteBiometria(`Bearer ${process.env.BIOMETRIA_AGENT_TOKEN}`), true);
assert.equal(validarTokenAgenteBiometria('Bearer token-incorreto'), false);
assert.equal(validarTokenAgenteBiometria(undefined), false);

console.log('Biometria: validação, criptografia e autenticação verificadas.');
