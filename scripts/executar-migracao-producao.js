const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function executarMigracao() {
  console.log('🚀 [MIGRAÇÃO] Iniciando migração urgente para produção...');
  
  let prisma;
  
  try {
    // Conectar ao banco usando a URL de produção
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não configurada!');
    }
    
    console.log('📡 [MIGRAÇÃO] Conectando ao banco de produção...');
    
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
    console.log('✅ [MIGRAÇÃO] Conectado ao banco com sucesso!');
    
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, 'MIGRAR_PRODUCAO_URGENTE.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 [MIGRAÇÃO] Executando script SQL...');
    
    // Executar SQL bruto
    await prisma.$executeRawUnsafe(sqlContent);
    
    console.log('✅ [MIGRAÇÃO] Script SQL executado com sucesso!');
    
    // Verificar se a migração funcionou
    console.log('🔍 [MIGRAÇÃO] Verificando resultados...');
    
    // Testar se campo tipo existe
    try {
      const motoristas = await prisma.motorista.findMany({
        select: { id: true, nome: true, tipo: true },
        take: 1
      });
      
      console.log('✅ [MIGRAÇÃO] Campo "tipo" funcionando!');
      
      if (motoristas.length > 0) {
        console.log(`✅ [MIGRAÇÃO] Exemplo: ${motoristas[0].nome} (${motoristas[0].tipo})`);
      }
    } catch (error) {
      console.error('❌ [MIGRAÇÃO] Campo "tipo" ainda não funciona:', error.message);
      throw error;
    }
    
    // Testar enum Transportadora
    try {
      const controles = await prisma.controleCarga.findMany({
        where: { transportadora: 'ACCERT' },
        take: 1
      });
      
      console.log('✅ [MIGRAÇÃO] Enum Transportadora funcionando!');
    } catch (error) {
      console.error('❌ [MIGRAÇÃO] Enum Transportadora com problema:', error.message);
      throw error;
    }
    
    console.log('🎉 [MIGRAÇÃO] Migração concluída com sucesso!');
    console.log('🚀 [MIGRAÇÃO] Aplicação deve funcionar normalmente agora!');
    
  } catch (error) {
    console.error('💥 [MIGRAÇÃO] Erro durante migração:', error);
    
    if (error.message.includes('does not exist')) {
      console.log('💡 [MIGRAÇÃO] Dica: Execute o SQL manualmente no painel do banco');
    }
    
    throw error;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('📡 [MIGRAÇÃO] Desconectado do banco');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarMigracao()
    .then(() => {
      console.log('✅ Migração finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migração falhou:', error);
      process.exit(1);
    });
}

module.exports = { executarMigracao };
