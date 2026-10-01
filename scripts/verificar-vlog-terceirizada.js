const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarEVlogParaTerceirizada() {
  console.log('🔍 Verificando dados que podem precisar de correção...');

  try {
    // Verificar controles de carga com VLOG que podem estar salvos como TERCEIRIZADA
    console.log('\n📋 Verificando ControlesCarga...');
    
    // Buscar todos os controles para análise
    const todosControles = await prisma.controleCarga.findMany({
      where: {
        transportadora: 'TERCEIRIZADA'
      },
      select: {
        id: true,
        motorista: true,
        transportadora: true,
        dataCriacao: true,
        responsavel: true
      },
      orderBy: {
        dataCriacao: 'desc'
      },
      take: 20 // Limitar para não sobrecarregar
    });

    console.log(`Encontrados ${todosControles.length} controles com transportadora TERCEIRIZADA (últimos 20):`);
    
    todosControles.forEach(controle => {
      console.log(`  - ID: ${controle.id.substring(0, 8)}... | Motorista: ${controle.motorista} | Data: ${controle.dataCriacao.toLocaleDateString('pt-BR')} | Responsável: ${controle.responsavel}`);
    });

    // Verificar motoristas com VLOG que podem estar salvos como TERCEIRIZADA
    console.log('\n👤 Verificando Motoristas...');
    
    const todosMotoristas = await prisma.motorista.findMany({
      where: {
        transportadoraId: 'TERCEIRIZADA'
      },
      select: {
        id: true,
        nome: true,
        transportadoraId: true,
        dataCriacao: true
      },
      orderBy: {
        dataCriacao: 'desc'
      },
      take: 20
    });

    console.log(`Encontrados ${todosMotoristas.length} motoristas com transportadora TERCEIRIZADA (últimos 20):`);
    
    todosMotoristas.forEach(motorista => {
      console.log(`  - ID: ${motorista.id.substring(0, 8)}... | Nome: ${motorista.nome} | Data: ${motorista.dataCriacao.toLocaleDateString('pt-BR')}`);
    });

    // Verificar ajustes de pallets
    console.log('\n📦 Verificando Ajustes de Pallets...');
    
    try {
      const todosAjustes = await prisma.$queryRaw`
        SELECT id, motorista, transportadora, quantidade, dataRecebimento 
        FROM "PalletAjuste" 
        WHERE transportadora = 'TERCEIRIZADA'
        ORDER BY dataRecebimento DESC
        LIMIT 20
      `;

      console.log(`Encontrados ${todosAjustes.length} ajustes com transportadora TERCEIRIZADA (últimos 20):`);
      
      todosAjustes.forEach(ajuste => {
        console.log(`  - ID: ${ajuste.id.substring(0, 8)}... | Motorista: ${ajuste.motorista || 'N/A'} | Qtde: ${ajuste.quantidade} | Data: ${new Date(ajuste.dataRecebimento).toLocaleDateString('pt-BR')}`);
      });
    } catch (e) {
      console.log('⚠️ Tabela de ajustes de pallets não encontrada ou indisponível');
    }

    console.log('\n✅ Verificação concluída!');
    console.log('\n💡 Se você encontrar registros que deveriam ser VLOG mas estão como TERCEIRIZADA,');
    console.log('   precisará atualizá-los manualmente no banco de dados.');
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarEVlogParaTerceirizada();
