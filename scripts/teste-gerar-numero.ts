import { gerarProximoNumeroManifesto } from '../lib/gerarNumeroManifesto';

async function testarGeracaoNumero() {
  try {
    console.log('Testando geração de número de manifesto para ACERT...');
    const numeroACERT = await gerarProximoNumeroManifesto('ACERT');
    console.log('Próximo número para ACERT:', numeroACERT);

    console.log('\nTestando geração de número de manifesto para EXPRESSO_GOIAS...');
    const numeroExpresso = await gerarProximoNumeroManifesto('EXPRESSO_GOIAS');
    console.log('Próximo número para EXPRESSO_GOIAS:', numeroExpresso);
  } catch (error) {
    console.error('Erro ao testar geração de número de manifesto:', error);
  } finally {
    process.exit(0);
  }
}

testarGeracaoNumero();
