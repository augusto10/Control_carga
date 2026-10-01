const { PrismaClient } = require('@prisma/client');

async function executarMigracao() {
  console.log('🚀 [MIGRAÇÃO V2] Iniciando migração individual por comando...');
  
  let prisma;
  
  try {
    // Conectar ao banco usando a URL de produção
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não configurada!');
    }
    
    console.log('📡 [MIGRAÇÃO V2] Conectando ao banco de produção...');
    
    // Criar cliente Prisma com URL direta (sem Accelerate)
    const directUrl = databaseUrl.replace('prisma://', 'postgresql://');
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: directUrl
        }
      }
    });
    
    // Testar conexão
    await prisma.$connect();
    console.log('✅ [MIGRAÇÃO V2] Conectado ao banco com sucesso!');
    
    // COMANDO 1: Verificar se enum TipoPessoa existe
    console.log('🔍 [MIGRAÇÃO V2] Verificando enum TipoPessoa...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoPessoa') THEN
            CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
            RAISE NOTICE 'Enum TipoPessoa criado!';
          ELSE
            RAISE NOTICE 'Enum TipoPessoa já existe!';
          END IF;
        END $$;
      `);
      console.log('✅ [MIGRAÇÃO V2] Enum TipoPessoa verificado');
    } catch (error) {
      console.log('⚠️ [MIGRAÇÃO V2] Erro no enum TipoPessoa:', error.message);
    }
    
    // COMANDO 2: Adicionar campo tipo se não existir
    console.log('🔍 [MIGRAÇÃO V2] Verificando campo tipo...');
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
          ELSE
            RAISE NOTICE 'Campo tipo já existe!';
          END IF;
        END $$;
      `);
      console.log('✅ [MIGRAÇÃO V2] Campo tipo verificado');
    } catch (error) {
      console.log('⚠️ [MIGRAÇÃO V2] Erro no campo tipo:', error.message);
    }
    
    // COMANDO 3: Tornar CNH opcional
    console.log('🔍 [MIGRAÇÃO V2] Tornando CNH opcional...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Motorista" ALTER COLUMN "cnh" DROP NOT NULL;
      `);
      console.log('✅ [MIGRAÇÃO V2] CNH tornado opcional');
    } catch (error) {
      console.log('⚠️ [MIGRAÇÃO V2] CNH já era opcional ou erro:', error.message);
    }
    
    // COMANDO 4: Adicionar ACCERT ao enum se não existir
    console.log('🔍 [MIGRAÇÃO V2] Adicionando ACCERT ao enum...');
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
          ELSE
            RAISE NOTICE 'ACCERT já existe!';
          END IF;
        END $$;
      `);
      console.log('✅ [MIGRAÇÃO V2] ACCERT verificado');
    } catch (error) {
      console.log('⚠️ [MIGRAÇÃO V2] Erro com ACCERT:', error.message);
    }
    
    // COMANDO 5: Adicionar RETIRA_CLIENTE ao enum se não existir
    console.log('🔍 [MIGRAÇÃO V2] Adicionando RETIRA_CLIENTE ao enum...');
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
          ELSE
            RAISE NOTICE 'RETIRA_CLIENTE já existe!';
          END IF;
        END $$;
      `);
      console.log('✅ [MIGRAÇÃO V2] RETIRA_CLIENTE verificado');
    } catch (error) {
      console.log('⚠️ [MIGRAÇÃO V2] Erro com RETIRA_CLIENTE:', error.message);
    }
    
    // COMANDO 6: Migrar dados ACERT → ACCERT
    console.log('🔍 [MIGRAÇÃO V2] Migrando dados ACERT → ACCERT...');
    try {
      const motoristasAtualizados = await prisma.$executeRawUnsafe(`
        UPDATE "Motorista" 
        SET "transportadoraId" = 'ACCERT' 
        WHERE "transportadoraId" = 'ACERT';
      `);
      
      const controlesAtualizados = await prisma.$executeRawUnsafe(`
        UPDATE "ControleCarga" 
        SET "transportadora" = 'ACCERT' 
        WHERE "transportadora" = 'ACERT';
      `);
      
      console.log('✅ [MIGRAÇÃO V2] Dados migrados ACERT');
    } catch (error) {
      console.log('⚠️ [MIGRAÇÃO V2] Erro na migração de dados:', error.message);
    }
    
    // VERIFICAÇÃO FINAL
    console.log('🔍 [MIGRAÇÃO V2] Verificação final...');
    
    // Testar se campo tipo funciona
    try {
      const motoristas = await prisma.motorista.findMany({
        select: { id: true, nome: true, tipo: true },
        take: 3
      });
      
      console.log('✅ [MIGRAÇÃO V2] Campo "tipo" funcionando!');
      console.log(`📊 [MIGRAÇÃO V2] Encontrados ${motoristas.length} motoristas`);
      
      if (motoristas.length > 0) {
        motoristas.forEach(m => {
          console.log(`   - ${m.nome} (${m.tipo})`);
        });
      }
    } catch (error) {
      console.error('❌ [MIGRAÇÃO V2] Campo "tipo" ainda não funciona:', error.message);
      throw error;
    }
    
    // Testar enum Transportadora
    try {
      const controles = await prisma.controleCarga.count();
      console.log(`✅ [MIGRAÇÃO V2] Enum Transportadora OK - ${controles} controles`);
    } catch (error) {
      console.error('❌ [MIGRAÇÃO V2] Enum Transportadora com problema:', error.message);
      throw error;
    }
    
    console.log('🎉 [MIGRAÇÃO V2] Migração concluída com sucesso!');
    console.log('🚀 [MIGRAÇÃO V2] Aplicação deve funcionar normalmente agora!');
    
  } catch (error) {
    console.error('💥 [MIGRAÇÃO V2] Erro durante migração:', error);
    throw error;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('📡 [MIGRAÇÃO V2] Desconectado do banco');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarMigracao()
    .then(() => {
      console.log('✅ Migração V2 finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migração V2 falhou:', error);
      process.exit(1);
    });
}

module.exports = { executarMigracao };
