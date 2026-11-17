import assert from 'node:assert/strict';
import { useStore } from '../store/store';

async function main() {
  const originalFetch = globalThis.fetch;
  const originalState = useStore.getState();
  const controle = { id: 'controle-1', finalizado: false, notas: [{ id: 'nota-1' }] };
  const outroControle = { id: 'controle-2', finalizado: false, notas: [] };
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  try {
    useStore.setState({ controles: [controle, outroControle] as any });
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      if (init?.method !== 'PUT') throw new Error('A listagem está temporariamente indisponível');
      return new Response(JSON.stringify({ ...controle, finalizado: true }), { status: 200 });
    };
    await useStore.getState().finalizarControle(controle.id);
    assert.equal(requests.length, 1, 'finalizar não deve depender de recarregar a listagem');
    assert.equal(requests[0].url, '/api/controles/controle-1');
    assert.deepEqual(JSON.parse(String(requests[0].init?.body)), { finalizado: true });
    assert.equal(useStore.getState().controles[0].finalizado, true);
    assert.deepEqual(useStore.getState().controles[0].notas, controle.notas);
    assert.equal(useStore.getState().controles[1].id, outroControle.id);

    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Sem permissão para finalizar' }), { status: 403 });
    await assert.rejects(useStore.getState().finalizarControle(outroControle.id), /Sem permissão/);
    assert.equal(useStore.getState().controles[1].finalizado, false);
    console.log('Finalização atualiza o controle sem depender da listagem e preserva erros da API.');
  } finally {
    globalThis.fetch = originalFetch;
    useStore.setState(originalState);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
