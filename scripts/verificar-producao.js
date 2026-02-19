const https = require('https');

const baseUrl = 'https://gestao-logistica-3ziqm0vha-esplendor-projetos-projects.vercel.app';

function testarUrl(url, descricao) {
  return new Promise((resolve) => {
    console.log(`🔍 Testando: ${descricao}`);
    
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${descricao}: Status ${res.statusCode} - OK`);
          
          // Tentar parsear JSON se possível
          try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
              console.log(`   📊 Retornou ${json.length} itens`);
            } else if (json.error) {
              console.log(`   ⚠️ Erro na resposta: ${json.error}`);
            } else {
              console.log(`   📄 Resposta JSON válida`);
            }
          } catch (e) {
            console.log(`   📄 Resposta HTML (${data.length} chars)`);
          }
          
          resolve({ success: true, status: res.statusCode, data });
        } else {
          console.log(`❌ ${descricao}: Status ${res.statusCode} - ERRO`);
          console.log(`   📄 Resposta: ${data.substring(0, 200)}...`);
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`💥 ${descricao}: Erro de conexão - ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(10000, () => {
      console.log(`⏰ ${descricao}: Timeout após 10s`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function verificarProducao() {
  console.log('🚀 Verificando aplicação em produção...\n');
  
  const testes = [
    {
      url: `${baseUrl}/api/transportadoras`,
      descricao: 'API Transportadoras (pública)'
    },
    {
      url: `${baseUrl}/login`,
      descricao: 'Página de Login'
    },
    {
      url: `${baseUrl}/`,
      descricao: 'Página Inicial'
    }
  ];
  
  let sucessos = 0;
  let falhas = 0;
  
  for (const teste of testes) {
    const resultado = await testarUrl(teste.url, teste.descricao);
    
    if (resultado.success) {
      sucessos++;
    } else {
      falhas++;
    }
    
    console.log(''); // Linha em branco
  }
  
  console.log('📊 RESUMO DOS TESTES:');
  console.log(`   ✅ Sucessos: ${sucessos}`);
  console.log(`   ❌ Falhas: ${falhas}`);
  
  if (falhas === 0) {
    console.log('\n🎉 APLICAÇÃO FUNCIONANDO PERFEITAMENTE!');
    console.log('🚀 Todas as APIs estão respondendo corretamente!');
  } else {
    console.log('\n⚠️ ALGUNS PROBLEMAS DETECTADOS');
    console.log('💡 Verifique os logs do Vercel para mais detalhes');
  }
  
  console.log('\n🔗 Links para testar manualmente:');
  console.log(`   - Login: ${baseUrl}/login`);
  console.log(`   - Motoristas: ${baseUrl}/admin/motoristas`);
  console.log(`   - Criar Controle: ${baseUrl}/criar-controle`);
  console.log(`   - Logs Vercel: https://vercel.com/dashboard`);
}

verificarProducao().catch(console.error);
