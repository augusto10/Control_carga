import assert from 'node:assert/strict';
import { dadosPdfCompletos, normalizarNotaPdf, temDadosCompletosNotaPdf, validarNotasPdf } from '../lib/controles/pdf-dados';

const nota = { id: 'n1', numeroNota: '123', codigo: 'MANUAL-123', volumes: '3' };
let externa: unknown = { valor: 'R$ 1.234,56', TOTAL_PESO: '12,50', cliente: { nome: 'Cliente de teste', cnpj: '12345678000199' }, DATA_EMISSAO: '2026-11-17T12:00:00Z' };
let falhar = false;
let forcarFallback = false;
let ultimaSerie = '';
let notasCompletas: unknown[] = [];
const prismaPath = require.resolve('../lib/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { __esModule: true, default: {
  controleCarga: { findUnique: async () => ({ id: 'c1', finalizado: true, notas: [nota] }) },
} } } as any;
const servicePath = require.resolve('../services/api-externa');
const buscar = async () => { if (falhar) throw new Error('Falha temporária'); return externa; };
require.cache[servicePath] = { id: servicePath, filename: servicePath, loaded: true, exports: { apiExternaService: {
  buscarNotaFiscalPorChave: async () => forcarFallback ? null : buscar(),
  buscarNotaFiscalPorNumeroSerie: async (_numero: string, serie: string) => { ultimaSerie = serie; return buscar(); },
  listarNotasFiscaisCompletas: async () => ({ data: notasCompletas, total: notasCompletas.length }),
} } } as any;
const handler = require('../pages/api/controles/[id]/pdf-dados').default;
async function request() {
  let status = 200;
  let body: any;
  const res: any = { status(value: number) { status = value; return res; }, json(value: any) { body = value; return res; } };
  await handler({ method: 'GET', query: { id: 'c1' } }, res);
  assert.equal(status, 200);
  return body;
}
async function main() {
  const previousUsername = process.env.API_EXTERNA_USERNAME;
  const previousPassword = process.env.API_EXTERNA_PASSWORD;
  process.env.API_EXTERNA_USERNAME = 'fixture';
  process.env.API_EXTERNA_PASSWORD = 'fixture';
  try {
    const dados = await request();
    assert.equal(dados.notas[0].razaoSocial, 'Cliente de teste', 'PDF deve recuperar cliente.nome');
    assert.equal(dados.notas[0].cnpj, '12345678000199');
    assert.equal(dados.notas[0].valorPedido, 1234.56, 'valores brasileiros devem virar números para os totais');
    assert.equal(dados.notas[0].pesoBruto, 12.5);
    assert.equal(dados.notas[0].dataEmissao, '2026-11-17T12:00:00Z');
    assert.equal(dados.notas[0].volumes, '3');
    assert.equal(dados.notas[0]._pdfEnriquecida, true);
    assert.equal(dadosPdfCompletos(dados), true);
    assert.doesNotThrow(() => validarNotasPdf(dados.notas));
    assert.throws(() => validarNotasPdf([nota]), /notas 123/, 'PDF não deve ser emitido sem dados da nota');
    assert.equal(dadosPdfCompletos({ notas: [{ ...nota, _pdfEnriquecida: true }] }), false, 'marcador antigo não autoriza guardar uma nota incompleta');
    assert.equal(temDadosCompletosNotaPdf(normalizarNotaPdf(nota, {
      VALOR_TOTAL: '2.500,75', PESO_LIQUIDO: '35,2', NOME_RAZAO_SOCIAL: 'Cliente ERP', CNPJ_CPF: '12345678000199', DATA_EMISSAO: '2026-11-17',
    })), true);
    nota.codigo = '35' + '2611' + '12345678000199' + '55' + '002' + '000000123' + '1' + '12345678' + '0';
    forcarFallback = true;
    assert.equal((await request()).notas[0]._pdfEnriquecida, true, 'consulta por número deve recuperar uma chave não encontrada');
    assert.equal(ultimaSerie, '2', 'a série deve vir da chave da NF-e');
    nota.numeroNota = '113127';
    nota.codigo = 'MANUAL-113127';
    forcarFallback = false;
    externa = null;
    notasCompletas = [{
      nota_fiscal: {
        NUMERO_NOTA: '000113127',
        VALOR_TOTAL_NOTA: '2.500,75',
        PESO_TOTAL: '35,2',
        CNPJ_CPF: '12345678000199',
        DATA_EMISSAO: '2026-11-17',
      },
      pedido: { NOME_RAZAO_SOCIAL: 'Cliente encontrado na listagem' },
    }];
    const recuperada = await request();
    assert.equal(recuperada.notas[0].razaoSocial, 'Cliente encontrado na listagem');
    assert.equal(recuperada.notas[0].valorPedido, 2500.75);
    assert.equal(recuperada.notas[0]._pdfEnriquecida, true, 'fallback da listagem deve recuperar nota quando consulta direta não encontra');
    assert.doesNotThrow(() => validarNotasPdf(recuperada.notas));

    notasCompletas = [];
    assert.notEqual((await request()).notas[0]._pdfEnriquecida, true, 'nota não encontrada deve permitir outra tentativa');
    falhar = true;
    assert.notEqual((await request()).notas[0]._pdfEnriquecida, true, 'falha temporária não pode ser marcada como consulta completa');
    console.log('PDF: dados do cliente, valores, peso, emissão e novas tentativas verificados.');
  } finally {
    if (previousUsername === undefined) delete process.env.API_EXTERNA_USERNAME; else process.env.API_EXTERNA_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.API_EXTERNA_PASSWORD; else process.env.API_EXTERNA_PASSWORD = previousPassword;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
