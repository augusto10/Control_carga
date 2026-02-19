import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function corrigirSequenciaUnica() {
  try {
    console.log('=== Iniciando correção para sequência única ===');
    
    // Busca todos os controles ordenados por data de criação
    const controles = await prisma.controleCarga.findMany({
      orderBy: {
        dataCriacao: 'asc', // Ordem cronológica
      },
      select: {
        id: true,
        dataCriacao: true,
        transportadora: true,
        motorista: true,
        numeroManifesto: true,
      },
    });

    console.log(`Total de controles encontrados: ${controles.length}\n`);

    // Exibe a situação atual
    console.log('=== Situação Atual ===');
    controles.forEach((controle, index) => {
      console.log(`${index + 1}. ID: ${controle.id}`);
      console.log(`   Data: ${controle.dataCriacao.toISOString()}`);
      console.log(`   Transportadora: ${controle.transportadora}`);
      console.log(`   Motorista: ${controle.motorista}`);
      console.log(`   Nº Atual: ${controle.numeroManifesto}\n`);
    });

    // Atualiza cada controle com número sequencial
    console.log('\n=== Iniciando Atualização ===');
    for (let i = 0; i < controles.length; i++) {
      const numeroSequencial = i + 1; // Começa do 1
      
      console.log(`Atualizando ${i+1}/${controles.length}:`);
      console.log(`- ID: ${controles[i].id}`);
      console.log(`- Data: ${controles[i].dataCriacao.toISOString()}`);
      console.log(`- Transportadora: ${controles[i].transportadora}`);
      console.log(`- Motorista: ${controles[i].motorista}`);
      console.log(`- Nº Atual: ${controles[i].numeroManifesto}`);
      console.log(`- Novo número: ${numeroSequencial}\n`);

      await prisma.controleCarga.update({
        where: { id: controles[i].id },
        data: { numeroManifesto: numeroSequencial.toString() },
      });
    }

    console.log('=== Correção concluída com sucesso! ===');
  } catch (error) {
    console.error('Erro durante a correção:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa a correção
corrigirSequenciaUnica()
  .catch(console.error)
  .finally(() => process.exit(0));
