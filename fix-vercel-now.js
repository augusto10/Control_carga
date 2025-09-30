// Script para executar correção via API do Vercel
// Execute: node fix-vercel-now.js

const https = require('https');

const VERCEL_URLS = [
  'https://gestao-logistica-qowhmdy0m-esplendor-projetos-projects.vercel.app',
  'https://gestao-logistica-git-feature-assinaturas-melhoradas-esplendor-projetos-projects.vercel.app'
];

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(url + '/api/admin/fix-database', options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function fixDatabase() {
  console.log('🔧 Iniciando correção do banco via API do Vercel...\n');

  for (const baseUrl of VERCEL_URLS) {
    console.log(`🌐 Tentando: ${baseUrl}`);
    
    try {
      const result = await makeRequest(baseUrl);
      
      console.log(`📊 Status: ${result.status}`);
      
      if (result.status === 200 && result.data.steps) {
        console.log('\n✅ SUCESSO! Correção executada:');
        console.log('📋 Log:');
        result.data.steps.forEach(step => console.log(step));
        
        if (result.data.errors && result.data.errors.length > 0) {
          console.log('\n🚨 Erros encontrados:');
          result.data.errors.forEach(error => console.log(error));
        }
        
        if (result.data.success) {
          console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
          console.log('\n📋 Próximos passos:');
          console.log('1. Aguarde 2-3 minutos para cache atualizar');
          console.log('2. Teste as APIs que estavam com erro 500');
          console.log('3. Verifique os logs do Vercel');
        }
        
        return;
      } else {
        console.log(`❌ Erro: ${JSON.stringify(result.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ Erro de conexão: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('❌ Não foi possível executar a correção em nenhuma URL');
  console.log('\n🔧 Alternativas:');
  console.log('1. Aguarde mais alguns minutos para o deploy completar');
  console.log('2. Tente acessar manualmente: /admin/fix-database');
  console.log('3. Execute o script local: node scripts/fix-production-vercel.js');
}

fixDatabase().catch(console.error);
