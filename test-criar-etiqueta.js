const axios = require('axios');

async function testarCriarEtiqueta() {
  console.log('🧪 Testando criação de etiqueta...\n');

  try {
    // Dados de teste
    const dadosEtiqueta = {
      codigoBarras: '123456789012345678901234567890123456789012',
      numeroNota: '12345',
      cliente: 'Cliente Teste',
      transportadora: 'ACCERT',
      numeroPedido: 'PED-001',
      volumes: 3,
      observacoes: 'Teste de criação de etiqueta'
    };

    console.log('📦 Dados da etiqueta:');
    console.log(JSON.stringify(dadosEtiqueta, null, 2));
    console.log('\n🔄 Enviando requisição para API...\n');

    const response = await axios.post('http://localhost:3000/api/etiquetas/lotes', dadosEtiqueta, {
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true // Aceita qualquer status
    });

    console.log(`📊 Status da resposta: ${response.status} ${response.statusText}\n`);

    const data = response.data;

    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Etiqueta criada com sucesso!');
      console.log('\n📋 Dados retornados:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.volumesEtiquetas) {
        console.log(`\n🏷️  Total de volumes criados: ${data.volumesEtiquetas.length}`);
        data.volumesEtiquetas.forEach((vol, idx) => {
          console.log(`   Volume ${idx + 1}: ${vol.codigoVolume} (${vol.indiceVolume}/${vol.totalVolumes})`);
        });
      }
    } else {
      console.log('❌ Erro ao criar etiqueta:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.requiredFields) {
        console.log('\n⚠️  Campos obrigatórios faltando:', data.requiredFields.join(', '));
      }
      
      if (data.transportadorasValidas) {
        console.log('\n📋 Transportadoras válidas:', data.transportadorasValidas.join(', '));
      }
    }

  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
    console.error('\nDetalhes:', error);
  }
}

// Executar teste
testarCriarEtiqueta();
