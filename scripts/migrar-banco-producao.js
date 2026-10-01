const { PrismaClient } = require('@prisma/client');

async function migrarBancoProducao() {
  console.log('🚀 [PRODUÇÃO] Migrando banco de PRODUÇÃO especificamente...');
  
  let prisma;
  
  try {
    // IMPORTANTE: Usar a URL de PRODUÇÃO do Vercel
    console.log('📋 [PRODUÇÃO] Verificando variáveis de ambiente...');
    
    // Verificar se temos a URL de produção
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ [PRODUÇÃO] DATABASE_URL não encontrada!');
      console.log('💡 [PRODUÇÃO] Configure a variável DATABASE_URL com a URL do banco de PRODUÇÃO');
      console.log('💡 [PRODUÇÃO] Exemplo: DATABASE_URL="postgresql://user:pass@host/db" node scripts/migrar-banco-producao.js');
      return false;
    }
    
    console.log('📡 [PRODUÇÃO] URL do banco:', databaseUrl.substring(0, 30) + '...');
    
    // Verificar se é realmente o banco de produção
    if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
      console.error('❌ [PRODUÇÃO] ATENÇÃO: Esta URL parece ser de desenvolvimento!');
      console.log('💡 [PRODUÇÃO] Certifique-se de usar a URL do banco de PRODUÇÃO do Vercel');
      return false;
    }
    
    console.log('📡 [PRODUÇÃO] Conectando ao banco de PRODUÇÃO...');
    
    // Criar cliente Prisma para produção
    let finalUrl = databaseUrl;
    
    // Se for Prisma Accelerate, converter para conexão direta
    if (databaseUrl.startsWith('prisma://')) {
      console.log('🔄 [PRODUÇÃO] Detectado Prisma Accelerate, convertendo para conexão direta...');
      // Nota: Você pode precisar da URL direta do banco aqui
      console.log('⚠️ [PRODUÇÃO] Para Prisma Accelerate, você precisa da URL direta do banco');
      console.log('💡 [PRODUÇÃO] Verifique no painel do Neon/Supabase a URL de conexão direta');
    }
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: finalUrl
        }
      }
    });
    
    // Testar conexão
    await prisma.$connect();
    console.log('✅ [PRODUÇÃO] Conectado ao banco de PRODUÇÃO com sucesso!');
    
    // Verificar se já foi migrado
    console.log('🔍 [PRODUÇÃO] Verificando se migração já foi feita...');
    try {
      const teste = await prisma.motorista.findFirst({
        select: { tipo: true }
      });
      console.log('✅ [PRODUÇÃO] Campo "tipo" já existe! Migração já foi feita.');
      return true;
    } catch (error) {
      if (error.message.includes('column') && error.message.includes('tipo')) {
        console.log('🔄 [PRODUÇÃO] Campo "tipo" não existe. Iniciando migração...');
      } else {
        throw error;
      }
    }
    
    // EXECUTAR MIGRAÇÃO PASSO A PASSO
    
    // 1. Criar enum TipoPessoa
    console.log('🔧 [PRODUÇÃO] 1/6 - Criando enum TipoPessoa...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoPessoa') THEN
            CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
            RAISE NOTICE 'Enum TipoPessoa criado!';
          END IF;
        END $$;
      `);
      console.log('✅ [PRODUÇÃO] Enum TipoPessoa OK');
    } catch (error) {
      console.log('⚠️ [PRODUÇÃO] Enum TipoPessoa:', error.message);
    }
    
    // 2. Adicionar campo tipo
    console.log('🔧 [PRODUÇÃO] 2/6 - Adicionando campo tipo...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Motorista' AND column_name = 'tipo'
          ) THEN
            ALTER TABLE "Motorista" ADD COLUMN "tipo" "TipoPessoa" NOT NULL DEFAULT 'MOTORISTA';
            RAISE NOTICE 'Campo tipo adicionado!';
          END IF;
        END $$;
      `);
      console.log('✅ [PRODUÇÃO] Campo tipo OK');
    } catch (error) {
      console.log('⚠️ [PRODUÇÃO] Campo tipo:', error.message);
    }
    
    // 3. Tornar CNH opcional
    console.log('🔧 [PRODUÇÃO] 3/6 - Tornando CNH opcional...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Motorista" ALTER COLUMN "cnh" DROP NOT NULL;`);
      console.log('✅ [PRODUÇÃO] CNH opcional OK');
    } catch (error) {
      console.log('⚠️ [PRODUÇÃO] CNH opcional:', error.message);
    }
    
    // 4. Adicionar ACCERT ao enum
    console.log('🔧 [PRODUÇÃO] 4/6 - Adicionando ACCERT...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'Transportadora' AND e.enumlabel = 'ACCERT'
          ) THEN
            ALTER TYPE "Transportadora" ADD VALUE 'ACCERT';
            RAISE NOTICE 'ACCERT adicionado!';
          END IF;
        END $$;
      `);
      console.log('✅ [PRODUÇÃO] ACCERT OK');
    } catch (error) {
      console.log('⚠️ [PRODUÇÃO] ACCERT:', error.message);
    }
    
    // 5. Adicionar RETIRA_CLIENTE ao enum
    console.log('🔧 [PRODUÇÃO] 5/6 - Adicionando RETIRA_CLIENTE...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'Transportadora' AND e.enumlabel = 'RETIRA_CLIENTE'
          ) THEN
            ALTER TYPE "Transportadora" ADD VALUE 'RETIRA_CLIENTE';
            RAISE NOTICE 'RETIRA_CLIENTE adicionado!';
          END IF;
        END $$;
      `);
      console.log('✅ [PRODUÇÃO] RETIRA_CLIENTE OK');
    } catch (error) {
      console.log('⚠️ [PRODUÇÃO] RETIRA_CLIENTE:', error.message);
    }
    
    // 6. Migrar dados ACERT → ACCERT
    console.log('🔧 [PRODUÇÃO] 6/6 - Migrando dados ACERT → ACCERT...');
    try {
      await prisma.$executeRawUnsafe(`UPDATE "Motorista" SET "transportadoraId" = 'ACCERT' WHERE "transportadoraId" = 'ACERT';`);
      await prisma.$executeRawUnsafe(`UPDATE "ControleCarga" SET "transportadora" = 'ACCERT' WHERE "transportadora" = 'ACERT';`);
      console.log('✅ [PRODUÇÃO] Dados migrados OK');
    } catch (error) {
      console.log('⚠️ [PRODUÇÃO] Migração de dados:', error.message);
    }
    
    // TESTE FINAL
    console.log('🧪 [PRODUÇÃO] Testando migração...');
    try {
      const motoristas = await prisma.motorista.findMany({
        select: { id: true, nome: true, tipo: true },
        take: 3
      });
      
      console.log('✅ [PRODUÇÃO] MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log(`📊 [PRODUÇÃO] ${motoristas.length} registros encontrados com campo "tipo"`);
      
      motoristas.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.nome} (${m.tipo})`);
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ [PRODUÇÃO] Teste final falhou:', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('💥 [PRODUÇÃO] Erro durante migração:', error);
    return false;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('📡 [PRODUÇÃO] Desconectado do banco');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrarBancoProducao()
    .then((sucesso) => {
      if (sucesso) {
        console.log('\n🎉 BANCO DE PRODUÇÃO MIGRADO COM SUCESSO!');
        console.log('🚀 Agora você pode fazer deploy que vai funcionar!');
        process.exit(0);
      } else {
        console.log('\n❌ MIGRAÇÃO DO BANCO DE PRODUÇÃO FALHOU!');
        console.log('💡 Verifique a URL do banco e tente novamente');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 ERRO NA MIGRAÇÃO:', error);
      process.exit(1);
    });
}

module.exports = { migrarBancoProducao };
