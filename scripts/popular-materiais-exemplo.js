const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Populando materiais de exemplo...\n');

  const materiaisExemplo = [
    {
      nome: 'Fita Adesiva Transparente',
      descricao: 'Fita adesiva transparente 48mm x 50m',
      unidadeMedida: 'RL',
      quantidadeEstoque: 50,
      estoqueMinimo: 10,
      valor: 8.50
    },
    {
      nome: 'Stretch Film',
      descricao: 'Filme stretch para embalagem 500mm x 300m',
      unidadeMedida: 'RL',
      quantidadeEstoque: 30,
      estoqueMinimo: 5,
      valor: 45.00
    },
    {
      nome: 'Resma de Papel A4',
      descricao: 'Resma de papel sulfite A4 com 500 folhas',
      unidadeMedida: 'PCT',
      quantidadeEstoque: 100,
      estoqueMinimo: 20,
      valor: 25.90
    },
    {
      nome: 'Fita Gomada',
      descricao: 'Fita gomada kraft 48mm x 50m',
      unidadeMedida: 'RL',
      quantidadeEstoque: 40,
      estoqueMinimo: 8,
      valor: 12.00
    },
    {
      nome: 'Caneta Esferográfica Azul',
      descricao: 'Caneta esferográfica azul ponta média',
      unidadeMedida: 'UN',
      quantidadeEstoque: 200,
      estoqueMinimo: 50,
      valor: 1.50
    },
    {
      nome: 'Caneta Esferográfica Preta',
      descricao: 'Caneta esferográfica preta ponta média',
      unidadeMedida: 'UN',
      quantidadeEstoque: 200,
      estoqueMinimo: 50,
      valor: 1.50
    },
    {
      nome: 'Etiqueta Adesiva',
      descricao: 'Etiqueta adesiva branca 50x30mm',
      unidadeMedida: 'RL',
      quantidadeEstoque: 25,
      estoqueMinimo: 5,
      valor: 18.00
    },
    {
      nome: 'Caixa de Papelão Pequena',
      descricao: 'Caixa de papelão ondulado 30x20x15cm',
      unidadeMedida: 'UN',
      quantidadeEstoque: 150,
      estoqueMinimo: 30,
      valor: 2.50
    },
    {
      nome: 'Caixa de Papelão Média',
      descricao: 'Caixa de papelão ondulado 40x30x25cm',
      unidadeMedida: 'UN',
      quantidadeEstoque: 100,
      estoqueMinimo: 20,
      valor: 3.80
    },
    {
      nome: 'Caixa de Papelão Grande',
      descricao: 'Caixa de papelão ondulado 60x40x40cm',
      unidadeMedida: 'UN',
      quantidadeEstoque: 80,
      estoqueMinimo: 15,
      valor: 5.50
    },
    {
      nome: 'Plástico Bolha',
      descricao: 'Plástico bolha para proteção 1,20m x 100m',
      unidadeMedida: 'RL',
      quantidadeEstoque: 20,
      estoqueMinimo: 3,
      valor: 65.00
    },
    {
      nome: 'Fita Dupla Face',
      descricao: 'Fita adesiva dupla face 19mm x 30m',
      unidadeMedida: 'RL',
      quantidadeEstoque: 35,
      estoqueMinimo: 8,
      valor: 15.00
    },
    {
      nome: 'Grampeador',
      descricao: 'Grampeador de mesa capacidade 25 folhas',
      unidadeMedida: 'UN',
      quantidadeEstoque: 15,
      estoqueMinimo: 3,
      valor: 22.00
    },
    {
      nome: 'Grampos 26/6',
      descricao: 'Caixa de grampos 26/6 com 5000 unidades',
      unidadeMedida: 'CX',
      quantidadeEstoque: 50,
      estoqueMinimo: 10,
      valor: 8.00
    },
    {
      nome: 'Tesoura',
      descricao: 'Tesoura de escritório 21cm',
      unidadeMedida: 'UN',
      quantidadeEstoque: 20,
      estoqueMinimo: 5,
      valor: 12.50
    },
    {
      nome: 'Estilete',
      descricao: 'Estilete profissional com lâmina retrátil',
      unidadeMedida: 'UN',
      quantidadeEstoque: 30,
      estoqueMinimo: 8,
      valor: 8.90
    },
    {
      nome: 'Lâmina para Estilete',
      descricao: 'Caixa com 10 lâminas para estilete',
      unidadeMedida: 'CX',
      quantidadeEstoque: 25,
      estoqueMinimo: 5,
      valor: 6.50
    },
    {
      nome: 'Marcador Permanente Preto',
      descricao: 'Marcador permanente ponta grossa preto',
      unidadeMedida: 'UN',
      quantidadeEstoque: 60,
      estoqueMinimo: 15,
      valor: 4.50
    },
    {
      nome: 'Marcador Permanente Azul',
      descricao: 'Marcador permanente ponta grossa azul',
      unidadeMedida: 'UN',
      quantidadeEstoque: 40,
      estoqueMinimo: 10,
      valor: 4.50
    },
    {
      nome: 'Marcador Permanente Vermelho',
      descricao: 'Marcador permanente ponta grossa vermelho',
      unidadeMedida: 'UN',
      quantidadeEstoque: 40,
      estoqueMinimo: 10,
      valor: 4.50
    }
  ];

  let criados = 0;
  let erros = 0;

  for (const material of materiaisExemplo) {
    try {
      // Verificar se já existe
      const existe = await prisma.materialEstoque.findFirst({
        where: { nome: material.nome }
      });

      if (existe) {
        console.log(`⏭️  Material "${material.nome}" já existe, pulando...`);
        continue;
      }

      await prisma.materialEstoque.create({
        data: material
      });

      console.log(`✅ Material "${material.nome}" criado com sucesso!`);
      criados++;
    } catch (error) {
      console.error(`❌ Erro ao criar material "${material.nome}":`, error.message);
      erros++;
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`✅ Materiais criados: ${criados}`);
  console.log(`⏭️  Materiais já existentes: ${materiaisExemplo.length - criados - erros}`);
  console.log(`❌ Erros: ${erros}`);

  // Listar todos os materiais
  const todosMateriais = await prisma.materialEstoque.findMany({
    orderBy: { nome: 'asc' }
  });

  console.log(`\n📦 Total de materiais no sistema: ${todosMateriais.length}`);
  console.log('\n✅ Processo concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
