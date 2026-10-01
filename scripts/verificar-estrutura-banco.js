require('dotenv').config({ path: '.env.production' });
const { PrismaClient } = require('@prisma/client');

async function verificarEstruturaBanco() {
  console.log('🔍 [VERIFICAÇÃO] Checando estrutura atual do banco');
  
  const databaseUrl = process.env.DATABASE_URL;
  let prisma;
  
  try {
    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } }
    });
    
    await prisma.$connect();
    console.log('✅ Conectado ao banco');
    
    // Verificar estrutura da tabela Motorista
    console.log('\n📋 Estrutura atual da tabela Motorista:');
    const colunas = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Motorista' 
      ORDER BY ordinal_position;
    `;
    
    console.log('Colunas encontradas:');
    let temTipo = false;
    let temAtivo = false;
    
    colunas.forEach(col => {
      const opcional = col.is_nullable === 'YES' ? '(opcional)' : '(obrigatório)';
      const padrao = col.column_default ? ` [padrão: ${col.column_default}]` : '';
      console.log(`   - ${col.column_name}: ${col.data_type} ${opcional}${padrao}`);
      
      if (col.column_name === 'tipo') temTipo = true;
      if (col.column_name === 'ativo') temAtivo = true;
    });
    
    console.log(`\n🎯 Campo "tipo" existe: ${temTipo ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`🎯 Campo "ativo" existe: ${temAtivo ? '✅ SIM' : '❌ NÃO'}`);
    
    // Verificar enums
    console.log('\n📋 Verificando enums:');
    
    // Enum TipoPessoa
    try {
      const tipoPessoa = await prisma.$queryRaw`
        SELECT 1 FROM pg_type WHERE typname = 'TipoPessoa';
      `;
      console.log(`🎯 Enum TipoPessoa existe: ${tipoPessoa.length > 0 ? '✅ SIM' : '❌ NÃO'}`);
    } catch (error) {
      console.log('❌ Erro ao verificar TipoPessoa:', error.message);
    }
    
    // Enum Transportadora
    try {
      const transportadoras = await prisma.$queryRaw`
        SELECT e.enumlabel as valor
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'Transportadora'
        ORDER BY e.enumlabel;
      `;
      
      const valores = transportadoras.map(t => t.valor);
      console.log('🎯 Valores do enum Transportadora:');
      valores.forEach(valor => {
        console.log(`   - ${valor}`);
      });
      
      const temRetiraCliente = valores.includes('RETIRA_CLIENTE');
      console.log(`🎯 RETIRA_CLIENTE existe: ${temRetiraCliente ? '✅ SIM' : '❌ NÃO'}`);
      
    } catch (error) {
      console.log('❌ Erro ao verificar Transportadora:', error.message);
    }
    
    // Contar dados
    console.log('\n📊 Dados existentes:');
    const totalMotoristas = await prisma.motorista.count();
    const totalControles = await prisma.controleCarga.count();
    
    console.log(`   - Motoristas: ${totalMotoristas}`);
    console.log(`   - Controles: ${totalControles}`);
    
    if (!temTipo) {
      console.log('\n🔧 PROBLEMA IDENTIFICADO:');
      console.log('❌ Campo "tipo" não foi criado no banco');
      console.log('💡 Possíveis causas:');
      console.log('   - Erro de permissões no Prisma Data Platform');
      console.log('   - DDL não executado corretamente');
      console.log('   - Necessário usar abordagem diferente');
      
      console.log('\n🎯 PRÓXIMOS PASSOS:');
      console.log('1. Tentar executar DDL novamente');
      console.log('2. Ou usar push do schema diretamente');
      console.log('3. Ou continuar com correções temporárias');
    }
    
  } catch (error) {
    console.log('💥 Erro:', error.message);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

verificarEstruturaBanco();
