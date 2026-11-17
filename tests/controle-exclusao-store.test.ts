import assert from 'node:assert/strict';
import { useStore } from '../store/store';

async function main() {
  const originalFetch = globalThis.fetch;
  const originalState = useStore.getState();
  try {
    const state = useStore.getState() as typeof originalState & { excluirControle?: (id: string) => Promise<void> };
    assert.equal(typeof state.excluirControle, 'function', 'o store deve excluir sem depender de recarregar o histórico');
    useStore.setState({
      controles: [{ id: 'c1', finalizado: true }, { id: 'c2', finalizado: false }] as any,
      notas: [{ id: 'n1', controleId: 'c1', controle: { id: 'c1' } }, { id: 'n2', controleId: 'c2' }] as any,
    });
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls += 1;
      assert.equal(String(url), '/api/controles/c1');
      assert.equal(init?.method, 'DELETE', 'não deve consultar a listagem após excluir');
      assert.equal(init?.credentials, 'include');
      return new Response(null, { status: 204 });
    };
    await state.excluirControle!('c1');
    assert.equal(calls, 1);
    assert.deepEqual(useStore.getState().controles.map((controle) => controle.id), ['c2']);
    assert.equal(useStore.getState().notas[0].controleId, null);
    assert.equal(useStore.getState().notas[0].controle, null);
    assert.equal(useStore.getState().notas[1].controleId, 'c2');
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Somente ADMIN pode excluir controles' }), { status: 403 });
    await assert.rejects(state.excluirControle!('c2'), /Somente ADMIN/);
    assert.equal(useStore.getState().controles[0].id, 'c2', 'falha na exclusão mantém o controle na tela');
    console.log('Exclusão atualiza a lista sem recarregar, preserva notas e mantém dados em caso de erro.');
  } finally {
    globalThis.fetch = originalFetch;
    useStore.setState(originalState);
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
