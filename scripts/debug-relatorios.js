const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRelatorios() {
  try {
    console.log('🔍 Investigando dados para relatórios...\n');

    // 1. Verificar total de controles no banco
    const totalControles = await prisma.controleCarga.count();
    console.log(`📊 Total de controles no banco: ${totalControles}`);

    if (totalControles === 0) {
      console.log('❌ Não há controles no banco de dados!');
      return;
    }

    // 2. Verificar datas dos controles
    const controles = await prisma.controleCarga.findMany({
      select: {
        id: true,
        motorista: true,
        transportadora: true,
        dataCriacao: true,
        finalizado: true
      },
      orderBy: {
        dataCriacao: 'desc'
      },
      take: 10
    });

    console.log('\n📅 Últimos 10 controles criados:');
    controles.forEach((controle, index) => {
      console.log(`${index + 1}. ${controle.motorista} (${controle.transportadora}) - ${controle.dataCriacao.toISOString().split('T')[0]} - ${controle.finalizado ? 'Finalizado' : 'Pendente'}`);
    });

    // 3. Verificar range de datas
    const primeiroControle = await prisma.controleCarga.findFirst({
      orderBy: { dataCriacao: 'asc' },
      select: { dataCriacao: true }
    });

    const ultimoControle = await prisma.controleCarga.findFirst({
      orderBy: { dataCriacao: 'desc' },
      select: { dataCriacao: true }
    });

    console.log(`\n📆 Range de datas dos controles:`);
    console.log(`   Primeiro: ${primeiroControle?.dataCriacao.toISOString().split('T')[0]}`);
    console.log(`   Último: ${ultimoControle?.dataCriacao.toISOString().split('T')[0]}`);

    // 4. Testar filtro atual (setembro 2025)
    const dataInicio = new Date('2025-09-01');
    const dataFim = new Date('2025-09-30');
    dataFim.setHours(23, 59, 59, 999);

    const controlesSetembro = await prisma.controleCarga.count({
      where: {
        dataCriacao: {
          gte: dataInicio,
          lte: dataFim
        }
      }
    });

    console.log(`\n🗓️ Controles em setembro/2025: ${controlesSetembro}`);

    // 5. Verificar controles por mês/ano
    const controlesAgrupados = await prisma.$queryRaw`
      SELECT 
        EXTRACT(YEAR FROM "dataCriacao") as ano,
        EXTRACT(MONTH FROM "dataCriacao") as mes,
        COUNT(*) as total
      FROM "ControleCarga" 
      GROUP BY EXTRACT(YEAR FROM "dataCriacao"), EXTRACT(MONTH FROM "dataCriacao")
      ORDER BY ano DESC, mes DESC
      LIMIT 12
    `;

    console.log('\n📈 Controles por mês/ano:');
    controlesAgrupados.forEach(item => {
      const mes = String(item.mes).padStart(2, '0');
      console.log(`   ${mes}/${item.ano}: ${item.total} controles`);
    });

  } catch (error) {
    console.error('❌ Erro ao investigar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRelatorios();
