import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function atualizarNumerosSequenciais() {
  try {
    console.log('=== Iniciando atualização de números sequenciais ===');
    
    // Busca todos os controles ordenados por data de criação
    const controles = await prisma.controleCarga.findMany({
      orderBy: {
        dataCriacao: 'asc',
      },
      select: {
        id: true,
        numeroManifesto: true,
        transportadora: true,
        dataCriacao: true,
      },
    });

    console.log(`Total de controles encontrados: ${controles.length}`);
    
    if (controles.length === 0) {
      console.log('Nenhum controle encontrado para atualização.');
      return;
    }

    // Filtra apenas os registros que precisam ser atualizados
    const paraAtualizar = controles.filter(controle => {
      // Verifica se o número atual é inválido
      const numAtual = controle.numeroManifesto ? parseInt(controle.numeroManifesto, 10) : null;
      return numAtual === null || isNaN(numAtual) || numAtual <= 0 || numAtual > 1000000;
    });

    console.log(`${paraAtualizar.length} controles precisam de atualização.`);

    // Atualiza os registros com números sequenciais
    for (let i = 0; i < paraAtualizar.length; i++) {
      const controle = paraAtualizar[i];
      const novoNumero = i + 1; // Começa do 1
      
      console.log(`Atualizando controle ${controle.id} (${controle.transportadora}) para número ${novoNumero}`);
      
      await prisma.controleCarga.update({
        where: { id: controle.id },
        data: { numeroManifesto: novoNumero.toString() },
      });
    }

    console.log('=== Atualização concluída com sucesso! ===');
  } catch (error) {
    console.error('Erro durante a atualização:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa a atualização
atualizarNumerosSequenciais()
  .catch(console.error)
  .finally(() => process.exit(0));
