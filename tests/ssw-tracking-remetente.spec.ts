import assert from 'node:assert/strict';
import { trackingBySender } from '../services/sswClient';
import { fetchMergedTracking } from '../services/sswTracking';
import { sswTrackingRepository } from '../services/sswTrackingRepository';

const chave = '43261112345678000199550010000000011000000011';
const originalFetch = globalThis.fetch;
const originalRead = sswTrackingRepository.read;
const originalSave = sswTrackingRepository.save;

async function run() {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), body: JSON.parse(String(options?.body)) });
    return new Response(JSON.stringify({ success: true, message: 'Documento localizado com sucesso', tracking: [{ ocorrencia: 'ENTREGA REALIZADA' }] }), { status: 200 });
  };
  sswTrackingRepository.read = async () => null;
  sswTrackingRepository.save = async () => undefined;
  try {
    const response = await trackingBySender(chave);
    assert.equal(requests[0]?.url, 'https://ssw.inf.br/api/tracking');
    assert.deepEqual(requests[0]?.body, { cnpj: '12345678000199', chave_nfe: chave, tipo_doc: 'E' });
    assert.equal(Array.isArray(response.tracking) && response.tracking.length, 1);
    const result = await fetchMergedTracking({ chave, numeroNota: '1' });
    assert.equal(result.found, true);
    assert.equal(result.delivered, true);
    assert.equal(result.source, 'tracking');
    assert.equal(result.occurrences.length, 1);
    assert.equal(requests.length, 2);
    await assert.rejects(() => trackingBySender('123'), /chave/i);
  } finally {
    globalThis.fetch = originalFetch;
    sswTrackingRepository.read = originalRead;
    sswTrackingRepository.save = originalSave;
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
