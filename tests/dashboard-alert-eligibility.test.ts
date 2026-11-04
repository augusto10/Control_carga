import assert from 'node:assert/strict';
import { isPedidoElegivelPorDataDoAlerta } from '../lib/dashboard-alert-eligibility';

const hojeAntesDas16 = new Date('2026-11-04T15:59:00-03:00');
const hojeAs16 = new Date('2026-11-04T16:00:00-03:00');
const hojeDepoisDas16 = new Date('2026-11-04T16:01:00-03:00');
const agoraAntesDas16 = new Date('2026-11-04T15:30:00-03:00');
const agoraDepoisDas16 = new Date('2026-11-04T16:30:00-03:00');

assert.equal(isPedidoElegivelPorDataDoAlerta(hojeAntesDas16, agoraAntesDas16), true);
assert.equal(isPedidoElegivelPorDataDoAlerta(hojeAs16, agoraAntesDas16), false);
assert.equal(isPedidoElegivelPorDataDoAlerta(hojeDepoisDas16, agoraDepoisDas16), false);
assert.equal(isPedidoElegivelPorDataDoAlerta(hojeAntesDas16, agoraDepoisDas16), true);
assert.equal(
  isPedidoElegivelPorDataDoAlerta(new Date('2026-11-03T18:00:00-03:00'), agoraAntesDas16),
  true
);
assert.equal(
  isPedidoElegivelPorDataDoAlerta(new Date('2026-11-05T08:00:00-03:00'), agoraAntesDas16),
  false
);
assert.equal(isPedidoElegivelPorDataDoAlerta(null, agoraAntesDas16), true);

console.log('Regra de elegibilidade por data e corte das 16h: 7 verificacoes passaram.');
