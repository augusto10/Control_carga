const axios = require('axios');

async function testRelatoriosPages() {
  const baseURL = 'http://localhost:3000';

  console.log('🔍 Testando acesso às páginas de relatórios...\n');

  const pages = [
    '/relatorios',
    '/relatorios/pallets',
    '/relatorios/controles-carga',
    '/relatorios/pallets-motorista'
  ];

  for (const page of pages) {
    try {
      console.log(`🌐 Testando: ${page}`);
      const response = await axios.get(`${baseURL}${page}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200) {
        console.log(`✅ ${page}: Página carregou com sucesso`);
      } else {
        console.log(`❌ ${page}: Status ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${page}: Servidor não responde`);
      } else {
        console.log(`❌ ${page}: ${error.message}`);
      }
    }
    console.log('');
  }
}

testRelatoriosPages();
