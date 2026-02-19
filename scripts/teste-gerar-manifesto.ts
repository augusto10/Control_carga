import { gerarProximoNumeroManifesto } from '../lib/gerarNumeroManifesto';

async function testarGeracaoManifesto() {
  try {
    console.log('=== Teste de Geração de Números de Manifesto ===\n');
    
    // Teste para ACERT
    console.log('Testando geração para ACERT:');
    for (let i = 0; i < 3; i++) {
      console.log(`  [${i+1}/3] Gerando próximo número para ACERT...`);
      const numero = await gerarProximoNumeroManifesto('ACERT');
      console.log(`  ${i + 1}. Próximo número: ${numero}`);
    }
    
    console.log('\nTestando geração para EXPRESSO_GOIAS:');
    // Teste para EXPRESSO_GOIAS
    for (let i = 0; i < 3; i++) {
      const numero = await gerarProximoNumeroManifesto('EXPRESSO_GOIAS');
      console.log(`  ${i + 1}. Próximo número: ${numero}`);
    }
    
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    process.exit(0);
  }
}

testarGeracaoManifesto();
