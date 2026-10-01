const http = require('http');

function criarControle(dados) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(dados);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/controles',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testCriarControle() {
  console.log('🧪 Testando criação de controles...\n');

  // Teste 1: Controle com ACCERT
  console.log('1️⃣ Testando controle com ACCERT...');
  try {
    const controleAccert = await criarControle({
      motorista: 'João Silva',
      cpfMotorista: '12345678901',
      responsavel: 'Augusto',
      transportadora: 'ACCERT',
      qtdPalletsLevados: 10,
      qtdPalletsDevolvidos: 0,
      placaVeiculo: 'ABC-1234',
      observacao: 'Teste ACCERT',
      notasIds: []
    });

    console.log(`   Status: ${controleAccert.status}`);
    if (controleAccert.status === 201) {
      console.log('   ✅ Controle ACCERT criado com sucesso!');
      console.log(`   ID: ${controleAccert.data.id}`);
      console.log(`   Transportadora: ${controleAccert.data.transportadora}`);
    } else {
      console.log('   ❌ Erro ao criar controle ACCERT:');
      console.log('   ', controleAccert.data);
    }
  } catch (error) {
    console.log('   ❌ Erro na requisição ACCERT:', error.message);
  }

  console.log('');

  // Teste 2: Controle com RETIRA_CLIENTE
  console.log('2️⃣ Testando controle com RETIRA_CLIENTE...');
  try {
    const controleRetiraCliente = await criarControle({
      motorista: 'Empresa ABC Ltda',
      cpfMotorista: '67890123456',
      responsavel: 'Augusto',
      transportadora: 'RETIRA_CLIENTE',
      qtdPalletsLevados: 5,
      qtdPalletsDevolvidos: 0,
      placaVeiculo: 'XYZ-5678',
      observacao: 'Teste RETIRA_CLIENTE',
      notasIds: []
    });

    console.log(`   Status: ${controleRetiraCliente.status}`);
    if (controleRetiraCliente.status === 201) {
      console.log('   ✅ Controle RETIRA_CLIENTE criado com sucesso!');
      console.log(`   ID: ${controleRetiraCliente.data.id}`);
      console.log(`   Transportadora: ${controleRetiraCliente.data.transportadora}`);
    } else {
      console.log('   ❌ Erro ao criar controle RETIRA_CLIENTE:');
      console.log('   ', controleRetiraCliente.data);
    }
  } catch (error) {
    console.log('   ❌ Erro na requisição RETIRA_CLIENTE:', error.message);
  }

  console.log('');

  // Teste 3: Controle com transportadora inválida (deve usar ACCERT como padrão)
  console.log('3️⃣ Testando controle com transportadora inválida...');
  try {
    const controleInvalido = await criarControle({
      motorista: 'Teste Inválido',
      cpfMotorista: '99999999999',
      responsavel: 'Augusto',
      transportadora: 'TRANSPORTADORA_INEXISTENTE',
      qtdPalletsLevados: 1,
      qtdPalletsDevolvidos: 0,
      placaVeiculo: 'INV-9999',
      observacao: 'Teste transportadora inválida',
      notasIds: []
    });

    console.log(`   Status: ${controleInvalido.status}`);
    if (controleInvalido.status === 201) {
      console.log('   ✅ Controle criado (deve usar ACCERT como padrão)');
      console.log(`   ID: ${controleInvalido.data.id}`);
      console.log(`   Transportadora: ${controleInvalido.data.transportadora}`);
    } else {
      console.log('   ❌ Erro ao criar controle inválido:');
      console.log('   ', controleInvalido.data);
    }
  } catch (error) {
    console.log('   ❌ Erro na requisição inválida:', error.message);
  }

  console.log('\n🎉 Teste concluído!');
}

testCriarControle().catch(console.error);
