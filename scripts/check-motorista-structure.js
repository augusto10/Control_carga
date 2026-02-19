const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMotoristaStructure() {
  console.log('🔍 Verificando estrutura da tabela Motorista...\n');

  try {
    // 1. Verificar estrutura da tabela
    console.log('1️⃣ ESTRUTURA DA TABELA MOTORISTA:');
    const tableStructure = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'Motorista'
      ORDER BY ordinal_position
    `;
    console.table(tableStructure);

    // 2. Verificar constraints da tabela
    console.log('\n2️⃣ CONSTRAINTS DA TABELA:');
    const constraints = await prisma.$queryRaw`
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'Motorista'
    `;
    console.table(constraints);

    // 3. Verificar enum atual
    console.log('\n3️⃣ VALORES DO ENUM TRANSPORTADORA:');
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel as valor, enumsortorder as ordem
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ORDER BY enumsortorder
    `;
    console.table(enumValues);

    // 4. Verificar se podemos adicionar ao enum
    console.log('\n4️⃣ TENTATIVA DE ADICIONAR AO ENUM:');
    try {
      await prisma.$executeRaw`
        ALTER TYPE "Transportadora" ADD VALUE 'RETIRA_VENDEDOR'
      `;
      console.log('✅ RETIRA_VENDEDOR adicionado com sucesso!');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ RETIRA_VENDEDOR já existe no enum');
      } else if (error.message.includes('must be owner')) {
        console.log('❌ Sem permissão para alterar enum (precisa ser owner/admin)');
        console.log('💡 Solução: Execute o SQL como administrador do banco');
      } else {
        console.log('❌ Erro ao adicionar:', error.message);
      }
    }

    // 5. Verificar novamente o enum após tentativa
    console.log('\n5️⃣ ENUM APÓS TENTATIVA:');
    const enumValuesAfter = await prisma.$queryRaw`
      SELECT enumlabel as valor
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ORDER BY enumsortorder
    `;
    console.table(enumValuesAfter);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMotoristaStructure();
