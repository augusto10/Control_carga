import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const rotasPrazosData = [
  // ACCERT
  { codigo: 'AGUAS CLARAS BR-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'BRASILIA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'ESTRUTURAL-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'GUARA 1 DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'GUARA 2 DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'TAGUATINGA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'VICENTE PIRES-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'BRAZLANDIA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'ASA NORTE-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'ASA SUL-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'CRUZEIRO-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'LAGO SUL-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'NUCLEO BANDEIRANTE-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'PARK WAY-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'PLANO PILOTO-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'SÃO SEBASTIÃO-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'SUDOESTE-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'ACCERT' },
  { codigo: 'AGUAS LINDAS-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'ENTORNO', transportadora: 'ACCERT' },
  { codigo: 'SÃO JOÃO DA ALIANÇA-GO', uf: 'BR-GO', prazo: 'D+3', regiao: 'ENTORNO', transportadora: 'ACCERT' },

  // DTAFRA
  { codigo: 'PLANALTINA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'DTAFRA' },
  { codigo: 'FORMOSA-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'ENTORNO', transportadora: 'DTAFRA' },
  { codigo: 'PLANALTINA-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'ENTORNO', transportadora: 'DTAFRA' },

  // EXPRESSO GO
  { codigo: 'ITAPOA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'JARDIM BOTANICO-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'PARANOA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'VARJÃO-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'SOBRADINHO-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'CEILANDIA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'CEILANDIA NORTE-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'CEILANDIA SUL-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'SAMAMBAIA NORTE-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'SAMAMBAIA SUL-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'GAMA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'PONTE ALTA GAMA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'RIACHO FUNDO 1-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'RIACHO FUNDO 2-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'SANTA MARIA-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'RECANTO DAS EMAS-DF', uf: 'BR-DF', prazo: 'D+1', regiao: 'CAPITAL', transportadora: 'EXPRESSO GO' },
  { codigo: 'CIDADE OCIDENTAL-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'ENTORNO', transportadora: 'EXPRESSO GO' },
  { codigo: 'NOVO GAMA-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'ENTORNO', transportadora: 'EXPRESSO GO' },
  { codigo: 'VALPARAISO-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'ENTORNO', transportadora: 'EXPRESSO GO' },

  // ZANUELO
  { codigo: 'PADRE BERNADO-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'INTERIOR', transportadora: 'ZANUELO' },
  { codigo: 'COCALZINHO-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'INTERIOR', transportadora: 'ZANUELO' },
  { codigo: 'CRISTALINA-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'INTERIOR', transportadora: 'ZANUELO' },
  { codigo: 'LUZIANIA-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'INTERIOR', transportadora: 'ZANUELO' },
  { codigo: 'SANTO ANTONIO DO DESCOBERTO-GO', uf: 'BR-GO', prazo: 'D+2', regiao: 'INTERIOR', transportadora: 'ZANUELO' },
];

async function main() {
  console.log(`Iniciando seed de rotas e prazos de entrega (${rotasPrazosData.length} registros)...`);

  let inseridos = 0;
  let atualizados = 0;

  for (const item of rotasPrazosData) {
    const res = await prisma.rotaPrazoEntrega.upsert({
      where: {
        codigo_transportadora: {
          codigo: item.codigo,
          transportadora: item.transportadora,
        },
      },
      update: {
        uf: item.uf,
        prazo: item.prazo,
        regiao: item.regiao,
        ativo: true,
      },
      create: {
        codigo: item.codigo,
        uf: item.uf,
        prazo: item.prazo,
        regiao: item.regiao,
        transportadora: item.transportadora,
        ativo: true,
      },
    });

    if (res.dataCriacao.getTime() === res.dataAtualizacao.getTime()) {
      inseridos++;
    } else {
      atualizados++;
    }
  }

  console.log(`✅ Seed concluído! Inseridos/Atualizados: ${rotasPrazosData.length}`);
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
