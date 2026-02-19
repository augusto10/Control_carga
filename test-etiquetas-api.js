const axios = require('axios');

// Configurações
const API_BASE = 'http://localhost:3000';

// Função para fazer login e obter token
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@controlecarga.com',
      senha: '12345678'
    }, {
      withCredentials: true
    });

    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      return setCookie.join('; ');
    }
    return null;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return null;
  }
}

// Função para testar criação de lote de etiquetas
async function testCriarLote(cookie) {
  try {
    console.log('📦 Testando criação de lote de etiquetas...');

    const loteData = {
      codigoBarras: '33121112345678901234567890123456789012',
      numeroNota: '123456',
      cliente: 'Empresa Teste Ltda',
      transportadora: 'ACCERT',
      numeroPedido: 'PED-001',
      volumes: 3,
      observacoes: 'Teste de etiquetas'
    };

    const response = await axios.post(`${API_BASE}/api/etiquetas/lotes`, loteData, {
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });

    console.log('✅ Lote criado com sucesso:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar lote:', error.response?.data || error.message);
    return null;
  }
}

// Função para testar busca de lotes
async function testBuscarLotes(cookie) {
  try {
    console.log('📋 Testando busca de lotes...');

    const response = await axios.get(`${API_BASE}/api/etiquetas/lotes`, {
      headers: {
        'Cookie': cookie
      },
      withCredentials: true
    });

    console.log('✅ Lotes encontrados:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar lotes:', error.response?.data || error.message);
    return null;
  }
}

// Função principal
async function main() {
  console.log('🧪 Iniciando testes da API de Etiquetas\n');

  // 1. Login
  const cookie = await login();
  if (!cookie) {
    console.error('❌ Não foi possível fazer login. Abortando testes.');
    return;
  }

  // 2. Criar lote
  const lote = await testCriarLote(cookie);
  if (!lote) {
    console.error('❌ Não foi possível criar lote. Abortando testes.');
    return;
  }

  // 3. Buscar lotes
  const lotes = await testBuscarLotes(cookie);

  console.log('\n🎉 Todos os testes passaram!');
  console.log('📊 Resumo:');
  console.log(`   • Lote criado: ${lote.id}`);
  console.log(`   • Volumes criados: ${lote.volumesEtiquetas?.length || 0}`);
  console.log(`   • Total de lotes do usuário: ${lotes?.length || 0}`);
}

// Executar testes
main().catch(console.error);
