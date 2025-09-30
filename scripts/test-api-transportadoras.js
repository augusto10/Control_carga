const http = require('http');

function testApiTransportadoras() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testando API /api/transportadoras...\n');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/transportadoras',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log(`📊 Status: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            const transportadoras = JSON.parse(data);
            console.log(`✅ API respondeu com ${transportadoras.length} transportadoras:\n`);
            
            transportadoras.forEach((transp, index) => {
              console.log(`${index + 1}. ID: "${transp.id}" | Nome: "${transp.nome}" | Descrição: "${transp.descricao}"`);
            });

            // Verificar se ACCERT e RETIRA_CLIENTE estão presentes
            const temAccert = transportadoras.find(t => t.id === 'ACCERT');
            const temRetiraCliente = transportadoras.find(t => t.id === 'RETIRA_CLIENTE');

            console.log('\n🔍 Verificações específicas:');
            console.log(`   ACCERT: ${temAccert ? '✅ Encontrado' : '❌ Não encontrado'}`);
            console.log(`   RETIRA_CLIENTE: ${temRetiraCliente ? '✅ Encontrado' : '❌ Não encontrado'}`);

            if (temAccert) {
              console.log(`   ACCERT - Descrição: "${temAccert.descricao}"`);
            }
            if (temRetiraCliente) {
              console.log(`   RETIRA_CLIENTE - Descrição: "${temRetiraCliente.descricao}"`);
            }

            console.log('\n🎯 Resultado:');
            if (temAccert && temRetiraCliente) {
              console.log('✅ API está correta! ACCERT e RETIRA_CLIENTE estão disponíveis.');
            } else {
              console.log('❌ API ainda tem problemas.');
            }

          } else {
            console.error(`❌ Erro na API: ${res.statusCode}`);
            console.error('Resposta:', data);
          }
          
          resolve();
        } catch (error) {
          console.error('❌ Erro ao processar resposta:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
      reject(error);
    });

    req.end();
  });
}

testApiTransportadoras().catch(console.error);
