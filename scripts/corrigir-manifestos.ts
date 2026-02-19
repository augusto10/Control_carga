import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ControleCorrigir {
  id: string;
  numeroManifesto: string | null;
  transportadora: string;
  dataCriacao: Date;
}

async function corrigirManifestos() {
  try {
    console.log('=== Iniciando correção de números de manifesto ===\n');
    
    // Testa a conexão com o banco de dados
    console.log('Testando conexão com o banco de dados...');
    await prisma.$connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso!\n');
    
    console.log('Buscando todos os controles...');
    // Busca todos os controles ordenados por data de criação
    const controles = await prisma.controleCarga.findMany({
      orderBy: {
        dataCriacao: 'asc', // Ordena do mais antigo para o mais novo
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
      console.log('Nenhum controle encontrado no banco de dados.');
      return;
    }
    
    // Agrupa por transportadora
    const porTransportadora = controles.reduce<Record<string, ControleCorrigir[]>>((acc, controle) => {
      const transportadora = controle.transportadora;
      if (!acc[transportadora]) {
        acc[transportadora] = [];
      }
      acc[transportadora].push(controle);
      return acc;
    }, {});

    // Para cada transportadora, atribui números sequenciais
    for (const [transportadora, lista] of Object.entries(porTransportadora)) {
      console.log(`\n=== Corrigindo ${transportadora} (${lista.length} controles) ===`);
      
      // Filtra apenas os que precisam de correção
      const paraAtualizar = lista.filter((c: ControleCorrigir) => {
        const num = c.numeroManifesto ? parseInt(c.numeroManifesto, 10) : null;
        return !num || num < 1 || num > 1000000;
      });
      
      if (paraAtualizar.length === 0) {
        console.log(`Nenhum controle de ${transportadora} precisa de correção.`);
        continue;
      }
      
      console.log(`${paraAtualizar.length} controles precisam de correção.`);
      
      // Encontra o maior número atual para esta transportadora
      const numerosExistentes = lista
        .map((c: ControleCorrigir) => c.numeroManifesto ? parseInt(c.numeroManifesto, 10) : 0)
        .filter((n: number) => n > 0 && n < 1000000);
      
      let proximoNumero = numerosExistentes.length > 0 
        ? Math.max(...numerosExistentes) + 1 
        : 1;
      
      // Atualiza os registros que precisam de correção
      for (const controle of paraAtualizar) {
        console.log(`Atualizando controle ${controle.id} (${controle.dataCriacao.toISOString()}) para número ${proximoNumero}`);
        
        await prisma.controleCarga.update({
          where: { id: controle.id },
          data: { numeroManifesto: proximoNumero.toString() },
        });
        
        proximoNumero++;
      }
      
      console.log(`Correção concluída para ${transportadora}. Próximo número: ${proximoNumero}`);
    }
    
    console.log('\n=== Correção concluída com sucesso! ===');
  } catch (error) {
    console.error('Erro durante a correção:', error);
    throw error; // Propaga o erro para ser capturado pelo catch externo
  } finally {
    await prisma.$disconnect();
  }
}

// Executa a correção
corrigirManifestos()
  .catch(console.error)
  .finally(() => process.exit(0));
