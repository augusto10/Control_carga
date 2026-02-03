import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function executarMigracaoProducao() {
  console.log('🚀 [MIGRAÇÃO] Iniciando migração segura para produção...');

  try {
    // Verificar conexão
    await prisma.$connect();
    console.log('✅ [MIGRAÇÃO] Conexão com banco estabelecida');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, 'migration-producao-segura.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ [MIGRAÇÃO] Script SQL carregado');

    // Dividir o SQL em statements individuais
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔄 [MIGRAÇÃO] Executando ${statements.length} statements...`);

    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.toUpperCase().includes('SELECT')) {
        // Para SELECT, usar queryRaw
        try {
          const result = await prisma.$queryRawUnsafe(stmt);
          console.log(`✅ [MIGRAÇÃO] Statement ${i + 1} executado (SELECT):`, result);
        } catch (error) {
          console.log(`⚠️ [MIGRAÇÃO] Statement ${i + 1} falhou (SELECT, pode ser normal):`, error instanceof Error ? error.message : String(error));
        }
      } else {
        // Para outros comandos, usar executeRaw
        await prisma.$executeRawUnsafe(stmt);
        console.log(`✅ [MIGRAÇÃO] Statement ${i + 1} executado`);
      }
    }

    console.log('✅ [MIGRAÇÃO] Migração executada com sucesso!');

    // Verificar estado final
    console.log('🔍 [MIGRAÇÃO] Verificando estado final...');

    // Contar motoristas por tipo
    const motoristas = await prisma.$queryRaw`
      SELECT tipo, COUNT(*) as quantidade
      FROM "Motorista"
      GROUP BY tipo
    `;
    console.log('📊 [MIGRAÇÃO] Motoristas por tipo:', motoristas);

    // Verificar transportadoras
    const transportadoras = await prisma.$queryRaw`
      SELECT transportadora, COUNT(*) as quantidade
      FROM "ControleCarga"
      GROUP BY transportadora
    `;
    console.log('📊 [MIGRAÇÃO] Controles por transportadora:', transportadoras);

    // Verificar se ainda existe ACERT
    const acertCheck = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "Motorista" WHERE "transportadoraId" = 'ACERT') as motoristas_acert,
        (SELECT COUNT(*) FROM "ControleCarga" WHERE "transportadora" = 'ACERT') as controles_acert
    `;
    console.log('🔍 [MIGRAÇÃO] Verificação ACERT:', acertCheck);

    console.log('🎉 [MIGRAÇÃO] Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ [MIGRAÇÃO] Erro durante migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarMigracaoProducao()
    .then(() => {
      console.log('✅ Script concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script falhou:', error);
      process.exit(1);
    });
}

export { executarMigracaoProducao };
