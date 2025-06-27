import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listarControles() {
  try {
    console.log('=== Listando Controles ===\n');
    
    // Testa a conexão com o banco de dados
    console.log('Testando conexão com o banco de dados...');
    await prisma.$connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso!\n');
    
    // Lista todos os controles ordenados por data de criação
    console.log('Buscando controles no banco de dados...');
    const controles = await prisma.controleCarga.findMany({
      orderBy: {
        dataCriacao: 'desc',
      },
      select: {
        id: true,
        numeroManifesto: true,
        transportadora: true,
        dataCriacao: true,
        motorista: true,
        _count: {
          select: { notas: true },
        },
      },
    });

    console.log(`Total de controles encontrados: ${controles.length}\n`);
    
    // Agrupa por transportadora
    const porTransportadora = controles.reduce((acc, controle) => {
      const transportadora = controle.transportadora;
      if (!acc[transportadora]) {
        acc[transportadora] = [];
      }
      acc[transportadora].push(controle);
      return acc;
    }, {} as Record<string, typeof controles>);

    // Exibe os resultados
    for (const [transportadora, lista] of Object.entries(porTransportadora)) {
      console.log(`\n=== ${transportadora} (${lista.length} controles) ===`);
      
      // Ordena por número de manifesto (convertendo para número)
      const ordenados = [...lista].sort((a, b) => {
        const numA = a.numeroManifesto ? parseInt(a.numeroManifesto, 10) || 0 : 0;
        const numB = b.numeroManifesto ? parseInt(b.numeroManifesto, 10) || 0 : 0;
        return numA - numB;
      });
      
      for (const controle of ordenados) {
        console.log(`- ID: ${controle.id}`);
        console.log(`  Número: ${controle.numeroManifesto || '(não definido)'}`);
        console.log(`  Data: ${controle.dataCriacao.toISOString()}`);
        console.log(`  Motorista: ${controle.motorista}`);
        console.log(`  Notas vinculadas: ${controle._count.notas}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('Erro ao listar controles:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

listarControles();
