// Test script to check solicitations
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkSolicitations() {
  try {
    console.log('🔍 Checking solicitations...');

    const solicitations = await prisma.solicitacaoMaterial.findMany({
      select: {
        id: true,
        status: true,
        solicitante: { select: { nome: true } },
        itens: { select: { id: true, quantidade: true } }
      },
      take: 5
    });

    console.log(`Found ${solicitations.length} solicitations:`);
    solicitations.forEach(s => {
      console.log(`ID: ${s.id}, Status: ${s.status}, Solicitante: ${s.solicitante?.nome}, Itens: ${s.itens.length}`);
    });

    // Check specific solicitation
    const specificId = '173320e8-a589-4248-8554-64c59935fc3a';
    const specific = await prisma.solicitacaoMaterial.findUnique({
      where: { id: specificId },
      include: {
        itens: {
          include: {
            material: true
          }
        }
      }
    });

    if (specific) {
      console.log(`\nSpecific solicitation ${specificId}:`);
      console.log(`Status: ${specific.status}`);
      console.log(`Itens: ${specific.itens.length}`);
      specific.itens.forEach((item, i) => {
        console.log(`Item ${i+1}: ${item.material?.nome}, Qty: ${item.quantidade}, Stock: ${item.material?.quantidadeEstoque}`);
      });
    } else {
      console.log(`\nSolicitation ${specificId} not found`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSolicitations();
