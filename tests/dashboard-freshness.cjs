const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');

function load(file, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => dependencies[name], ...globals });
  return exports;
}

const freshness = load('lib/dashboard-freshness.ts');
const sample = (time, total = 10, day = '2026-09-10') => ({
  generatedAt: time,
  filtros: { dataInicio: day, dataFim: day },
  total,
});
const earlier = sample('2026-09-10T12:00:00Z');
const later = sample('2026-09-10T12:05:00Z', 8);

test('rejects older/equal/invalid responses, accepts newer data even when counts decrease', () => {
  assert.equal(freshness.canReplaceDashboard(later, earlier), false);
  assert.equal(freshness.canReplaceDashboard(later, { ...later, total: 99 }), false);
  assert.equal(freshness.canReplaceDashboard(later, sample('invalid')), false);
  assert.equal(freshness.canReplaceDashboard(earlier, later), true);
  assert.equal(freshness.canReplaceDashboard(null, earlier), true);
});

test('compares absolute dates across offsets and permits intentional period changes', () => {
  assert.equal(freshness.canReplaceDashboard(later, sample('2026-09-10T09:04:00-03:00')), false);
  assert.equal(freshness.canReplaceDashboard(later, sample('2026-09-10T09:06:00-03:00')), true);
  assert.equal(freshness.canReplaceDashboard(later, sample('2026-09-09T12:00:00Z', 20, '2026-09-09')), true);
});

function setup() {
  let rendered = null;
  const storage = new Map();
  const react = {
    useState: initial => [initial, value => { rendered = value; }],
    useRef: value => ({ current: value }),
    useCallback: callback => callback,
  };
  const hook = load('hooks/useCurrentDashboard.ts', {
    react, '@/lib/dashboard-freshness': freshness,
  }, { window: { localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  } } });
  const [, accept] = hook.useCurrentDashboard(null, 'cards');
  return { accept, storage, rendered: () => rendered };
}

test('late snapshot cannot overwrite displayed data or persisted cache', () => {
  const state = setup();
  state.accept(later);
  state.accept(earlier);
  assert.equal(state.rendered(), later);
  assert.equal(JSON.parse(state.storage.get('cards')).total, 8);
});

test('a partial detail update is preserved against another copy of the same snapshot', () => {
  const state = setup();
  state.accept(later);
  state.accept(current => ({ ...current, total: 7 }));
  state.accept(later);
  assert.equal(state.rendered().total, 7);
  assert.equal(state.rendered().generatedAt, later.generatedAt);
});

test('uses newer cache saved by another screen without overwriting it', () => {
  const state = setup();
  state.storage.set('cards', JSON.stringify(later));
  state.accept(earlier);
  assert.equal(state.rendered().total, 8);
  assert.equal(JSON.parse(state.storage.get('cards')).generatedAt, later.generatedAt);
});
