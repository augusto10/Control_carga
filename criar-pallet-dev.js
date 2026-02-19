// Script para criar tabela PalletAjuste no banco de desenvolvimento
// Usando o mesmo SQL que foi usado em produção
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function criarTabelaPalletDev() {
  try {
    console.log('🔨 Criando tabela PalletAjuste no banco de desenvolvimento...');
    console.log('📋 Usando o mesmo SQL que foi executado em produção');
    
    // SQL exato do arquivo MANUAL_SQL_PRODUCTION.sql
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "PalletAjuste" (
        id uuid PRIMARY KEY,
        "dataCriacao" timestamptz NOT NULL DEFAULT now(),
        "dataRecebimento" timestamptz NOT NULL DEFAULT now(),
        motorista text NULL,
        transportadora text NULL,
        quantidade integer NOT NULL,
        observacao text NULL,
        "usuarioId" text NOT NULL,
        CONSTRAINT fk_pallet_ajuste_usuario FOREIGN KEY ("usuarioId") REFERENCES "Usuario"(id) ON DELETE RESTRICT
      );
    `;
    
    console.log('📝 Executando SQL para criar tabela...');
    await prisma.$executeRawUnsafe(createTableSQL);
    console.log('✅ Tabela PalletAjuste criada com sucesso!');
    
    // Criar índices para performance
    console.log('📊 Criando índices...');
    
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_data ON "PalletAjuste" ("dataRecebimento");`,
      `CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_transportadora ON "PalletAjuste" (transportadora);`,
      `CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_usuario ON "PalletAjuste" ("usuarioId");`
    ];
    
    for (const indexSQL of createIndexes) {
      await prisma.$executeRawUnsafe(indexSQL);
    }
    
    console.log('✅ Índices criados com sucesso!');
    
    // Verificar se a tabela foi criada
    console.log('🔍 Verificando estrutura da tabela...');
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'PalletAjuste' 
      ORDER BY ordinal_position;
    `;
    
    console.log('📊 Estrutura da tabela PalletAjuste:');
    console.table(columns);
    
    // Testar se o modelo Prisma funciona
    console.log('🧪 Testando modelo Prisma...');
    const count = await prisma.palletAjuste.count();
    console.log(`✅ Modelo Prisma funcionando! Total de registros: ${count}`);
    
    // Inserir um registro de teste se não houver nenhum
    if (count === 0) {
      console.log('📝 Inserindo registro de teste...');
      
      // Buscar um usuário admin
      const admin = await prisma.usuario.findFirst({
        where: { tipo: 'ADMIN' }
      });
      
      if (admin) {
        const testId = require('crypto').randomUUID();
        
        const teste = await prisma.palletAjuste.create({
          data: {
            id: testId,
            motorista: 'Sistema de Teste',
            transportadora: 'ACCERT',
            quantidade: 1,
            observacao: 'Registro de teste - tabela criada no desenvolvimento',
            usuarioId: admin.id
          }
        });
        
        console.log(`✅ Registro de teste criado: ${teste.id}`);
      } else {
        console.log('⚠️ Nenhum usuário ADMIN encontrado para teste');
      }
    }
    
    console.log('');
    console.log('🎉 SUCESSO! Tabela PalletAjuste criada no banco de desenvolvimento!');
    console.log('✅ Agora a funcionalidade de ajustes de pallets deve funcionar localmente');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Teste a funcionalidade na página de relatórios de pallets');
    console.log('2. Clique no botão "Ajustes de Pallets"');
    console.log('3. Registre uma devolução avulsa de teste');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️ A tabela já existe - isso é normal');
      
      // Mesmo assim, vamos testar se funciona
      try {
        const count = await prisma.palletAjuste.count();
        console.log(`✅ Tabela funcionando! Total de registros: ${count}`);
      } catch (testError) {
        console.error('❌ Erro ao testar tabela existente:', testError);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

criarTabelaPalletDev();
