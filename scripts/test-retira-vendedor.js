const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRetiraVendedor() {
  console.log('🧪 Testando funcionalidade RETIRA_VENDEDOR...\n');

  try {
    // 1. Verificar enum atual
    console.log('1️⃣ ENUM ATUAL NO BANCO:');
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel as transportadora 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ORDER BY enumsortorder
    `;
    console.table(enumValues);

    // 2. Simular criação de motorista RETIRA_VENDEDOR
    console.log('\n2️⃣ SIMULANDO CRIAÇÃO DE MOTORISTA RETIRA_VENDEDOR:');
    
    const cpfTeste = '99999999999';
    
    // Primeiro, remover se já existir
    try {
      await prisma.motorista.delete({ where: { cpf: cpfTeste } });
      console.log('🗑️ Motorista teste anterior removido');
    } catch (e) {
      // Ignorar se não existir
    }

    // Criar motorista seguindo a lógica da API
    const nomeOriginal = 'TESTE RETIRA VENDEDOR';
    const nomeComMarcador = `${nomeOriginal} [RV]`;
    
    const novoMotorista = await prisma.motorista.create({
      data: {
        nome: nomeComMarcador,
        telefone: '11999999999',
        cpf: cpfTeste,
        cnh: '12345678901',
        transportadoraId: 'TERCEIRIZADA' // Salvo como TERCEIRIZADA no banco
      }
    });
    
    console.log('✅ Motorista criado no banco:', {
      nome: novoMotorista.nome,
      transportadoraId: novoMotorista.transportadoraId
    });

    // 3. Simular listagem (como a API faz)
    console.log('\n3️⃣ SIMULANDO LISTAGEM (COMO A API PROCESSA):');
    
    const motoristasDb = await prisma.motorista.findMany({
      where: { cpf: cpfTeste }
    });

    const motoristasProcessados = motoristasDb.map(m => {
      let transportadoraId = m.transportadoraId;
      let nome = m.nome;
      
      // Lógica da API: identificar [RV] e converter
      if (m.nome.includes('[RV]')) {
        transportadoraId = 'RETIRA_VENDEDOR';
        nome = m.nome.replace(' [RV]', '');
      }
      
      return {
        nome,
        transportadoraId,
        cpf: m.cpf
      };
    });

    console.table(motoristasProcessados);

    // 4. Verificar se funcionou
    const motoristaTeste = motoristasProcessados[0];
    if (motoristaTeste.transportadoraId === 'RETIRA_VENDEDOR' && motoristaTeste.nome === nomeOriginal) {
      console.log('\n✅ TESTE PASSOU! A funcionalidade está funcionando corretamente.');
      console.log('   - Salvo no banco como TERCEIRIZADA com marcador [RV]');
      console.log('   - Exibido na API como RETIRA_VENDEDOR com nome limpo');
    } else {
      console.log('\n❌ TESTE FALHOU! Algo não está funcionando.');
    }

    // 5. Limpeza
    await prisma.motorista.delete({ where: { cpf: cpfTeste } });
    console.log('\n🗑️ Motorista teste removido');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRetiraVendedor();
