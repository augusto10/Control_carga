#!/usr/bin/env node
/**
 * Script para adicionar campo 'tipo' na tabela Motorista em produção
 * Executa a migration SQL de forma segura
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function addTipoMotorista() {
  console.log('🚀 Iniciando migration: Adicionar campo tipo na tabela Motorista...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'sql', 'add-tipo-motorista.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL carregado:', sqlPath);
    console.log('📝 Conteúdo:\n', sqlContent.substring(0, 200) + '...\n');
    
    // Executar a migration
    console.log('⚙️ Executando migration...');
    
    // Dividir em comandos individuais (remover comentários e linhas vazias)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd.toLowerCase().startsWith('select')) {
        // Para SELECTs, mostrar resultado
        console.log(`\n📊 Executando query ${i + 1}/${commands.length}...`);
        const result = await prisma.$queryRawUnsafe(cmd);
        console.log('Resultado:', JSON.stringify(result, null, 2));
      } else {
        // Para outros comandos, apenas executar
        console.log(`\n⚙️ Executando comando ${i + 1}/${commands.length}...`);
        await prisma.$executeRawUnsafe(cmd);
        console.log('✅ Comando executado com sucesso');
      }
    }
    
    console.log('\n🎉 Migration concluída com sucesso!');
    
    // Verificar resultado final
    console.log('\n📊 Verificando resultado final...');
    const motoristas = await prisma.motorista.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        transportadoraId: true
      },
      take: 5
    });
    
    console.log('\n✅ Primeiros 5 motoristas com campo tipo:');
    motoristas.forEach((m, i) => {
      console.log(`${i + 1}. ${m.nome} - Tipo: ${m.tipo} - Transportadora: ${m.transportadoraId}`);
    });
    
    const total = await prisma.motorista.count();
    console.log(`\n📈 Total de registros na tabela Motorista: ${total}`);
    
  } catch (error) {
    console.error('\n❌ Erro na migration:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  addTipoMotorista()
    .then(() => {
      console.log('\n✅ Script finalizado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script finalizado com erro:', error.message);
      process.exit(1);
    });
}

module.exports = { addTipoMotorista };
