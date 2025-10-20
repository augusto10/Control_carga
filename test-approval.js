// Test script to approve solicitation
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testApproval() {
  try {
    console.log('🔍 Testing approval...');

    // Get admin user
    const admin = await prisma.usuario.findFirst({
      where: { tipo: 'ADMIN', ativo: true }
    });

    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }

    console.log(`Using admin: ${admin.nome} (${admin.id})`);

    // Create JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, tipo: admin.tipo },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    console.log('Token created');

    // Test the approval logic directly
    const solicitacaoId = '173320e8-a589-4248-8554-64c59935fc3a';

    const solicitacao = await prisma.solicitacaoMaterial.findUnique({
      where: { id: solicitacaoId },
      include: {
        itens: {
          include: {
            material: true
          }
        }
      }
    });

    if (!solicitacao) {
      console.log('❌ Solicitation not found');
      return;
    }

    console.log(`Approving solicitation: ${solicitacao.id}`);

    // Mock approval data
    const itensAprovados = solicitacao.itens.map(item => ({
      itemId: item.id,
      quantidadeAprovada: item.quantidade
    }));

    console.log('Approval data:', itensAprovados);

    // Test transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log('Starting transaction...');

      for (const itemAprovado of itensAprovados) {
        const item = solicitacao.itens.find(i => i.id === itemAprovado.itemId);

        if (!item) {
          throw new Error(`Item ${itemAprovado.itemId} not found`);
        }

        const quantidadeAprovada = itemAprovado.quantidadeAprovada || item.quantidade;

        // Get current stock
        const materialAtual = await tx.materialEstoque.findUnique({
          where: { id: item.materialId },
          select: { id: true, nome: true, quantidadeEstoque: true }
        });

        if (!materialAtual) {
          throw new Error(`Material ${item.materialId} not found`);
        }

        if (materialAtual.quantidadeEstoque < quantidadeAprovada) {
          throw new Error(`Insufficient stock for ${materialAtual.nome}. Available: ${materialAtual.quantidadeEstoque}, Requested: ${quantidadeAprovada}`);
        }

        console.log(`Approving ${materialAtual.nome}: ${quantidadeAprovada} units`);

        const quantidadeAntes = materialAtual.quantidadeEstoque;
        const quantidadeDepois = quantidadeAntes - quantidadeAprovada;

        // Update item
        await tx.itemSolicitacaoMaterial.update({
          where: { id: item.id },
          data: { quantidadeAprovada }
        });

        // Deduct stock
        await tx.materialEstoque.update({
          where: { id: item.materialId },
          data: {
            quantidadeEstoque: {
              decrement: quantidadeAprovada
            }
          }
        });

        // Create history
        await tx.historicoEstoque.create({
          data: {
            materialId: item.materialId,
            tipo: 'SAIDA',
            quantidade: quantidadeAprovada,
            quantidadeAntes,
            quantidadeDepois,
            usuarioId: admin.id,
            observacao: `Saída por aprovação da solicitação ${solicitacaoId}`,
            solicitacaoId: solicitacaoId
          }
        });
      }

      // Update solicitation
      const atualizada = await tx.solicitacaoMaterial.update({
        where: { id: solicitacaoId },
        data: {
          status: 'APROVADA',
          aprovadorId: admin.id,
          dataAprovacao: new Date()
        },
        include: {
          solicitante: { select: { id: true, nome: true, email: true } },
          aprovador: { select: { id: true, nome: true, email: true } },
          itens: { include: { material: true } }
        }
      });

      return atualizada;
    });

    console.log('✅ Approval successful!');
    console.log('Status:', result.status);
    console.log('Approved by:', result.aprovador?.nome);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testApproval();
