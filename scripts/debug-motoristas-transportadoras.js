const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugMotoristasTransportadoras() {
  console.log('🔍 Verificando como estão sendo salvos os motoristas...\n');

  try {
    // 1. Verificar enum de transportadoras no banco
    console.log('1️⃣ ENUM TRANSPORTADORAS NO BANCO:');
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel as transportadora 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ORDER BY enumsortorder
    `;
    console.table(enumValues);

    // 2. Verificar motoristas existentes e suas transportadoras
    console.log('\n2️⃣ MOTORISTAS CADASTRADOS:');
    const motoristas = await prisma.motorista.findMany({
      select: {
        id: true,
        nome: true,
        cpf: true,
        transportadoraId: true,
        dataCriacao: true
      },
      orderBy: { dataCriacao: 'desc' },
      take: 10 // Últimos 10 motoristas
    });
    
    if (motoristas.length > 0) {
      console.table(motoristas.map(m => ({
        nome: m.nome,
        cpf: m.cpf,
        transportadora: m.transportadoraId,
        data: m.dataCriacao.toISOString().split('T')[0]
      })));
    } else {
      console.log('Nenhum motorista encontrado.');
    }

    // 3. Contar motoristas por transportadora
    console.log('\n3️⃣ CONTAGEM POR TRANSPORTADORA:');
    const contagem = await prisma.$queryRaw`
      SELECT "transportadoraId" as transportadora, COUNT(*) as quantidade
      FROM "Motorista"
      GROUP BY "transportadoraId"
      ORDER BY quantidade DESC
    `;
    console.table(contagem);

    // 4. Verificar se RETIRA_VENDEDOR existe no enum
    console.log('\n4️⃣ VERIFICAÇÃO ESPECÍFICA - RETIRA_VENDEDOR:');
    const retiraVendedorExists = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'RETIRA_VENDEDOR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ) as existe
    `;
    console.log('RETIRA_VENDEDOR existe no enum:', retiraVendedorExists[0].existe);

    // 5. Tentar inserir um motorista teste com RETIRA_VENDEDOR
    console.log('\n5️⃣ TESTE DE INSERÇÃO COM RETIRA_VENDEDOR:');
    try {
      const testeMotorista = await prisma.motorista.create({
        data: {
          nome: 'TESTE RETIRA VENDEDOR',
          telefone: '11999999999',
          cpf: '00000000000',
          cnh: '12345678901',
          transportadoraId: 'RETIRA_VENDEDOR'
        }
      });
      console.log('✅ Inserção com Prisma funcionou:', testeMotorista.transportadoraId);
      
      // Deletar o teste
      await prisma.motorista.delete({ where: { id: testeMotorista.id } });
      console.log('🗑️ Motorista teste removido');
      
    } catch (error) {
      console.log('❌ Erro ao inserir com Prisma:', error.message);
      
      // Tentar com raw SQL
      try {
        await prisma.$executeRaw`
          INSERT INTO "Motorista" (id, "dataCriacao", nome, telefone, cpf, cnh, "transportadoraId")
          VALUES (gen_random_uuid(), NOW(), 'TESTE RAW SQL', '11888888888', '11111111111', '98765432109', 'RETIRA_VENDEDOR'::text::"Transportadora")
        `;
        console.log('✅ Inserção com raw SQL funcionou');
        
        // Deletar o teste
        await prisma.$executeRaw`DELETE FROM "Motorista" WHERE cpf = '11111111111'`;
        console.log('🗑️ Motorista teste raw SQL removido');
        
      } catch (rawError) {
        console.log('❌ Erro ao inserir com raw SQL:', rawError.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMotoristasTransportadoras();
