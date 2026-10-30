import assert from 'node:assert/strict';
import { sign } from 'jsonwebtoken';
import {
  CONTROL_PEDIDOS_SHARE_COOKIE,
  createControlPedidosShareCookie,
  hasControlPedidosAccess,
  hasValidControlPedidosSession,
  isValidControlPedidosShareToken,
} from '../lib/control-pedidos-share-access';

const shareToken = 'a-long-private-link-token';
process.env.CONTROL_PEDIDOS_SHARE_TOKEN = shareToken;
process.env.JWT_SECRET = 'test-jwt-secret';

assert.equal(isValidControlPedidosShareToken(shareToken), true);
assert.equal(isValidControlPedidosShareToken(`${shareToken}x`), false);
assert.equal(isValidControlPedidosShareToken(shareToken, ''), false);

const sessionToken = sign({ sub: 'user-1' }, process.env.JWT_SECRET);
assert.equal(hasValidControlPedidosSession(sessionToken), true);
assert.equal(hasValidControlPedidosSession('invalid'), false);

assert.equal(hasControlPedidosAccess({ [CONTROL_PEDIDOS_SHARE_COOKIE]: shareToken }), true);
assert.equal(hasControlPedidosAccess({ auth_token: sessionToken }), true);
assert.equal(hasControlPedidosAccess({}), false);

const shareCookie = createControlPedidosShareCookie(shareToken, true);
assert.match(shareCookie, /HttpOnly/);
assert.match(shareCookie, /SameSite=Strict/);
assert.match(shareCookie, /Secure/);
assert.match(shareCookie, /Path=\//);

console.log('Acesso por link secreto do painel: verificacoes passaram.');
