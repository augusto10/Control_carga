const fetch = require('node-fetch');

async function testApiRelatorios() {
  try {
    console.log('🧪 Testando APIs de relatórios...\n');

    // Simular um cookie de autenticação (você pode pegar um real do navegador)
    const baseUrl = 'http://localhost:3000';
    
    // Teste 1: API de relatório de pallets
    console.log('📊 Testando API de relatório de pallets...');
    const urlPallets = `${baseUrl}/api/relatorios/pallets?dataInicio=2025-09-01&dataFim=2025-09-30`;
    console.log(`URL: ${urlPallets}`);
    
    try {
      const responsePallets = await fetch(urlPallets, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Nota: Em um teste real, você precisaria do cookie de autenticação
        }
      });
      
      console.log(`Status: ${responsePallets.status}`);
      
      if (responsePallets.status === 401) {
        console.log('❌ Não autenticado - precisa fazer login primeiro');
      } else if (responsePallets.ok) {
        const data = await responsePallets.json();
        console.log(`✅ Dados encontrados: ${data.dados?.length || 0} registros`);
        console.log(`   Transportadoras: ${data.resumoTransportadoras?.length || 0}`);
      } else {
        console.log(`❌ Erro: ${responsePallets.status}`);
      }
    } catch (error) {
      console.log(`❌ Erro na requisição: ${error.message}`);
    }

    console.log('\n📈 Testando API de relatório de controles...');
    const urlControles = `${baseUrl}/api/relatorios/controles-carga?dataInicio=2025-09-01&dataFim=2025-09-30`;
    console.log(`URL: ${urlControles}`);
    
    try {
      const responseControles = await fetch(urlControles, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`Status: ${responseControles.status}`);
      
      if (responseControles.status === 401) {
        console.log('❌ Não autenticado - precisa fazer login primeiro');
      } else if (responseControles.ok) {
        const data = await responseControles.json();
        console.log(`✅ Controles encontrados: ${data.dados?.length || 0}`);
        console.log(`   Total controles: ${data.totais?.totalControles || 0}`);
        console.log(`   Finalizados: ${data.totais?.controlesFinalizados || 0}`);
        console.log(`   Pendentes: ${data.totais?.controlesPendentes || 0}`);
      } else {
        console.log(`❌ Erro: ${responseControles.status}`);
      }
    } catch (error) {
      console.log(`❌ Erro na requisição: ${error.message}`);
    }

    console.log('\n💡 Para testar completamente, acesse o navegador e faça login no sistema.');
    console.log('   Depois vá em Relatórios > Relatório de Pallets ou Controles de Carga');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testApiRelatorios();
