import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function adicionarVLOGProducao() {
  console.log('🚀 [VLOG] Iniciando adição de VLOG ao banco de produção...');
  
  try {
    // Verificar conexão
    await prisma.$connect();
    console.log('✅ [VLOG] Conexão com banco estabelecida');
    
    // Adicionar VLOG ao enum Transportadora
    console.log('🔄 [VLOG] Adicionando VLOG ao enum Transportadora...');
    
    const resultado = await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = 'VLOG' 
              AND enumtypid = (
                  SELECT oid FROM pg_type WHERE typname = 'Transportadora'
              )
          ) THEN
              ALTER TYPE "Transportadora" ADD VALUE 'VLOG';
              RAISE NOTICE 'Valor VLOG adicionado ao enum Transportadora com sucesso!';
          ELSE
              RAISE NOTICE 'Valor VLOG já existe no enum Transportadora.';
          END IF;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE NOTICE 'Erro ao adicionar valor ao enum: %', SQLERRM;
      END $$;
    `);
    
    console.log('✅ [VLOG] VLOG adicionado ao enum com sucesso!');
    
    // Verificar valores atuais do enum
    console.log('🔍 [VLOG] Verificando valores atuais do enum Transportadora...');
    
    const transportadoras = await prisma.$queryRawUnsafe(`
      SELECT enumlabel as transportadora 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ORDER BY enumsortorder
    `);
    
    console.log('📊 [VLOG] Transportadoras disponíveis:');
    (transportadoras as any[]).forEach((t: any) => {
      console.log(`  - ${t.transportadora}`);
    });
    
    // Contar controles por transportadora
    console.log('🔍 [VLOG] Verificando distribuição de controles...');
    
    const controlesPorTransportadora = await prisma.$queryRawUnsafe(`
      SELECT transportadora, COUNT(*) as quantidade 
      FROM "ControleCarga" 
      GROUP BY transportadora
      ORDER BY quantidade DESC
    `);
    
    console.log('📊 [VLOG] Controles por transportadora:');
    (controlesPorTransportadora as any[]).forEach((c: any) => {
      console.log(`  - ${c.transportadora}: ${c.quantidade} controle(s)`);
    });
    
    console.log('🎉 [VLOG] VLOG adicionado com sucesso ao banco de produção!');
    console.log('✨ A transportadora VLOG agora está disponível para uso');
    
  } catch (error) {
    console.error('❌ [VLOG] Erro ao adicionar VLOG:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  adicionarVLOGProducao()
    .then(() => {
      console.log('✅ Script concluído com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script falhou:', error);
      process.exit(1);
    });
}

export { adicionarVLOGProducao };
