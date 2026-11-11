import { timingSafeEqual } from 'crypto';
import type { NextApiRequest } from 'next';

export function agenteBiometriaAutorizado(req: NextApiRequest) {
  return validarTokenAgenteBiometria(req.headers.authorization);
}

export function validarTokenAgenteBiometria(authorization: string | undefined) {
  const esperado = process.env.BIOMETRIA_AGENT_TOKEN;
  const recebido = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!esperado || !recebido) return false;
  const esperadoBuffer = Buffer.from(esperado);
  const recebidoBuffer = Buffer.from(recebido);
  return (
    esperadoBuffer.length === recebidoBuffer.length &&
    timingSafeEqual(esperadoBuffer, recebidoBuffer)
  );
}
