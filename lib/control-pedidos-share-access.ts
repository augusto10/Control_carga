import { timingSafeEqual } from 'node:crypto';
import { verify } from 'jsonwebtoken';
import { serialize } from 'cookie';

export const CONTROL_PEDIDOS_SHARE_COOKIE = 'controle_pedidos_share';
export const CONTROL_PEDIDOS_SHARE_TOKEN_ENV = 'CONTROL_PEDIDOS_SHARE_TOKEN';
const AUTH_COOKIE = 'auth_token';
const SHARE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function isValidControlPedidosShareToken(
  candidate: unknown,
  configuredToken = process.env[CONTROL_PEDIDOS_SHARE_TOKEN_ENV],
) {
  if (typeof candidate !== 'string' || !configuredToken) return false;

  const candidateBuffer = Buffer.from(candidate);
  const configuredBuffer = Buffer.from(configuredToken);
  return candidateBuffer.length === configuredBuffer.length
    && timingSafeEqual(candidateBuffer, configuredBuffer);
}

export function hasValidControlPedidosSession(token: unknown) {
  if (typeof token !== 'string' || !token) return false;

  try {
    verify(token, process.env.JWT_SECRET || 'seu_segredo_secreto');
    return true;
  } catch {
    return false;
  }
}

export function hasControlPedidosAccess(cookies: Record<string, string | undefined>) {
  return isValidControlPedidosShareToken(cookies[CONTROL_PEDIDOS_SHARE_COOKIE])
    || hasValidControlPedidosSession(cookies[AUTH_COOKIE]);
}

export function createControlPedidosShareCookie(token: string, isProduction = process.env.NODE_ENV === 'production') {
  return serialize(CONTROL_PEDIDOS_SHARE_COOKIE, token, {
    httpOnly: true,
    maxAge: SHARE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'strict',
    secure: isProduction,
  });
}
