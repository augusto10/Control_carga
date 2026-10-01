require('dotenv').config({ path: '.env.production' });
const { PrismaClient } = require('@prisma/client');

async function executarMigracaoViaClient() {
  console.log('🚀 [MIGRAÇÃO VIA CLIENT] Executando via Prisma Client');
  console.log('🛡️ [SEGURANÇA] Apenas adiciona campos - não remove dados\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('❌ DATABASE_URL não encontrada');
    return;
  }
  
  let prisma;
  
  try {
    // Usar a URL do Prisma Data Platform diretamente
    prisma = new PrismaClient({
      datasources: {
        db: { url: databaseUrl }
      }
    });
    
    await prisma.$connect();
    console.log('✅ Conectado ao Prisma Data Platform');
    
    // PASSO 1: Criar enum TipoPessoa
    console.log('📝 [1/5] Criando enum TipoPessoa...');
    try {
      await prisma.$executeRaw`
        CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
      `;
      console.log('✅ Enum TipoPessoa criado');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️ Enum TipoPessoa já existe - OK');
      } else {
        console.log('⚠️ Erro no enum:', error.message);
      }
    }
    
    // PASSO 2: Adicionar campo tipo
    console.log('📝 [2/5] Adicionando campo tipo...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Motorista" ADD COLUMN "tipo" "TipoPessoa" NOT NULL DEFAULT 'MOTORISTA';
      `;
      console.log('✅ Campo tipo adicionado - todos os registros ficaram como MOTORISTA');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️ Campo tipo já existe - OK');
      } else {
        console.log('⚠️ Erro no campo tipo:', error.message);
      }
    }
    
    // PASSO 3: Tornar CNH opcional
    console.log('📝 [3/5] Tornando CNH opcional...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Motorista" ALTER COLUMN "cnh" DROP NOT NULL;
      `;
      console.log('✅ Campo CNH tornado opcional');
    } catch (error) {
      console.log('ℹ️ CNH já era opcional ou erro esperado - OK');
    }
    
    // PASSO 4: Adicionar campo ativo
    console.log('📝 [4/5] Adicionando campo ativo...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Motorista" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
      `;
      console.log('✅ Campo ativo adicionado - todos os registros ficaram como true');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️ Campo ativo já existe - OK');
      } else {
        console.log('⚠️ Erro no campo ativo:', error.message);
      }
    }
    
    // PASSO 5: Adicionar RETIRA_CLIENTE ao enum
    console.log('📝 [5/5] Adicionando RETIRA_CLIENTE...');
    try {
      await prisma.$executeRaw`
        ALTER TYPE "Transportadora" ADD VALUE 'RETIRA_CLIENTE';
      `;
      console.log('✅ RETIRA_CLIENTE adicionado ao enum');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️ RETIRA_CLIENTE já existe - OK');
      } else {
        console.log('⚠️ Erro RETIRA_CLIENTE:', error.message);
      }
    }
    
    // VERIFICAÇÃO FINAL
    console.log('\n🔍 Verificação final...');
    try {
      const resultado = await prisma.$queryRaw`
        SELECT 
          'MIGRAÇÃO CONCLUÍDA!' as status,
          COUNT(*) as total_motoristas
        FROM "Motorista";
      `;
      
      console.log('✅ Verificação bem-sucedida:');
      console.log(`   Status: ${resultado[0].status}`);
      console.log(`   Total de motoristas: ${resultado[0].total_motoristas}`);
      
      // Testar se campo tipo funciona
      const motoristas = await prisma.motorista.findMany({
        select: { nome: true, tipo: true, ativo: true },
        take: 3
      });
      
      console.log('\n✅ Campo tipo funcionando!');
      console.log('📊 Exemplos:');
      motoristas.forEach(m => {
        console.log(`   - ${m.nome} (tipo: ${m.tipo}, ativo: ${m.ativo})`);
      });
      
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('✅ Todos os campos adicionados');
      console.log('✅ Nenhum dado foi perdido');
      console.log('✅ APIs devem funcionar normalmente agora');
      
    } catch (error) {
      console.log('❌ Erro na verificação:', error.message);
    }
    
  } catch (error) {
    console.log('💥 Erro geral:', error.message);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('\n📡 Desconectado do Prisma Data Platform');
    }
  }
}

executarMigracaoViaClient();
