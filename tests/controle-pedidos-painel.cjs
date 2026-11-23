const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, dependencies, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => dependencies[name] || require(name), ...globals });
  return exports;
}

function setup(responses, timers = {}) {
  // Run the page's loading callback without a browser; network replies are controlled.
  const values = [];
  let cursor = 0;
  let refresh;
  const useState = initial => {
    const index = cursor++;
    if (!(index in values)) values[index] = initial;
    return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
  };
  const react = {
    ...React, useState,
    useRef: value => {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: value };
      return values[index];
    },
    useEffect: () => {},
    useCallback: fn => { refresh = fn; return fn; },
  };
  const storage = new Map();
  const dashboardHook = load('hooks/useCurrentDashboard.ts', {
    react,
    '@/lib/dashboard-freshness': load('lib/dashboard-freshness.ts', {}),
  }, { window: { localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  } } });
  const page = load('pages/paineis/controle-pedidos.tsx', {
    react,
    '@/hooks/useCurrentDashboard': dashboardHook,
    '@/lib/rota-prazo-entrega': { prazoDaRotaForaDoPrazo: () => true },
    '@/components/dashboard/ExpedicaoCards': { ExpedicaoCards: () => null },
    '@/lib/control-pedidos-share-access': load('lib/control-pedidos-share-access.ts', {}, { process, Buffer }),
  }, {
    process, URLSearchParams, AbortController, setTimeout, clearTimeout, ...timers,
    fetch: async (_url, options) => {
      assert.ok(responses.length, 'unexpected request');
      const response = responses.shift();
      const reply = await Promise.race([
        response,
        new Promise((_, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })),
      ]);
      return { ok: reply.status === 200, status: reply.status, json: async () => reply.data };
    },
  });
  const render = () => { cursor = 0; return renderToStaticMarkup(page.default()); };
  render();
  const cards = () => {
    cursor = 0;
    const find = element => {
      if (!element || typeof element !== 'object') return null;
      if (element.props?.pendencias) return element.props;
      return React.Children.toArray(element.props?.children).map(find).find(Boolean);
    };
    return find(page.default());
  };
  return { refresh: () => refresh(), render, cards, getServerSideProps: page.getServerSideProps };
}

const snapshot = (extra = {}) => ({
  generatedAt: '2026-11-23T12:00:00Z',
  indicadores: [{ codigo: 'PEDIDO_NOVO', total: 5, pedidos: [] }],
  ...extra,
});

test('missing products and alerts are released before a slow SSW lookup finishes', async () => {
  let finishSsw;
  const ssw = new Promise(resolve => { finishSsw = resolve; });
  const page = setup([
    { status: 200, data: snapshot() },
    { status: 200, data: snapshot({ indicadores: [
      { codigo: 'PENDENCIAS', total: 1, pedidos: [{ pedidoId: 101, totalItensPendentes: 2 }] },
      { codigo: 'ALERTAS_NAO_SEPARADOS', total: 1, pedidos: [{ pedidoId: 102 }] },
      { codigo: 'ALERTAS_NAO_ENTREGUES', total: 1, pedidos: [{ pedidoId: 103, chaveNfe: '123' }] },
    ] }) },
    ssw,
  ]);
  const loading = page.refresh();
  try {
    await new Promise(resolve => setImmediate(resolve));
    const cards = page.cards();
    assert.equal(cards.loadingSecondary, false, 'SSW must not block missing products or other alerts');
    assert.equal(cards.pendencias.total, 1);
    assert.equal(cards.alertas.naoSeparado, 1);
    assert.equal(cards.alertas.naoEntregueConsultando, true);
  } finally {
    finishSsw({ status: 200, data: { ssw: { delivered: true } } });
    await loading;
  }
  assert.equal(page.cards().alertas.naoEntregue, 0);
  assert.equal(page.cards().alertas.naoEntregueConsultando, false);
});

test('shows an API failure instead of silently displaying zero counts', async () => {
  const page = setup([{ status: 503, data: { error: 'Servico externo indisponivel' } }]);
  await page.refresh();
  const html = page.render();
  assert.match(html, /role="alert"/);
  assert.match(html, /Servico externo indisponivel/);
});

test('a stalled SSW request times out and keeps orders without confirmed delivery', async () => {
  let expire;
  const page = setup([
    { status: 200, data: snapshot() },
    { status: 200, data: snapshot({ indicadores: [
      { codigo: 'ALERTAS_NAO_ENTREGUES', total: 1, pedidos: [{ pedidoId: 103, chaveNfe: '123' }] },
    ] }) },
    new Promise(() => {}),
  ], { setTimeout: callback => { expire = callback; return 1; }, clearTimeout: () => {} });
  const loading = page.refresh();
  await new Promise(resolve => setImmediate(resolve));
  expire();
  await loading;
  assert.equal(page.cards().loadingSecondary, false);
  assert.equal(page.cards().alertas.naoEntregue, 1);
  assert.equal(page.cards().alertas.naoEntregueConsultando, false);
  assert.match(page.render(), /role="alert"/);
});

test('shows a warning when displaying a stale server snapshot', async () => {
  const page = setup([
    { status: 200, data: snapshot({ stale: true }) },
    { status: 200, data: snapshot() },
  ]);
  await page.refresh();
  assert.match(page.render(), /role="alert"/);
});

test('reports an empty alerts fallback while keeping the main cards', async () => {
  const page = setup([
    { status: 200, data: snapshot() },
    { status: 200, data: snapshot({ indicadores: [], warning: 'Alertas indisponiveis' }) },
  ]);
  await page.refresh();
  const html = page.render();
  assert.match(html, /role="alert"/);
  assert.match(html, /Alertas indisponiveis/);
  assert.match(html, /CONTROLE DE ENTREGAS/);
});

test('does not show an error after successful loading', async () => {
  const page = setup([{ status: 200, data: snapshot() }, { status: 200, data: snapshot() }]);
  await page.refresh();
  assert.doesNotMatch(page.render(), /role="alert"/);
});

test('shared-link access works without a user session and rejects an invalid link', async () => {
  const previous = process.env.CONTROL_PEDIDOS_SHARE_TOKEN;
  process.env.CONTROL_PEDIDOS_SHARE_TOKEN = 'test-private-sharing-token';
  try {
    const page = setup([]);
    const headers = {};
    const request = (query, cookies = {}) => page.getServerSideProps({
      req: { cookies }, res: { setHeader: (key, value) => { headers[key] = value; } }, query,
    });
    const valid = await request({ token: 'test-private-sharing-token' });
    assert.equal(valid.redirect.destination, '/paineis/controle-pedidos');
    assert.match(headers['Set-Cookie'], /controle_pedidos_share=test-private-sharing-token/);
    const cookieAccess = await request({}, { controle_pedidos_share: 'test-private-sharing-token' });
    assert.ok(cookieAccess.props);
    assert.equal((await request({ token: 'invalid' })).notFound, true);
    delete process.env.CONTROL_PEDIDOS_SHARE_TOKEN;
    assert.equal((await request({})).notFound, true);
  } finally {
    if (previous === undefined) delete process.env.CONTROL_PEDIDOS_SHARE_TOKEN;
    else process.env.CONTROL_PEDIDOS_SHARE_TOKEN = previous;
  }
});
