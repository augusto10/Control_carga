// Testar se o modelo PalletAjuste está disponível
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testPalletModel() {
  try {
    console.log('🔍 Testando modelo PalletAjuste...');
    
    // Verificar se o modelo existe
    if (prisma.palletAjuste) {
      console.log('✅ Modelo PalletAjuste encontrado no Prisma Client!');
      
      // Tentar contar registros
      try {
        const count = await prisma.palletAjuste.count();
        console.log(`📊 Total de ajustes: ${count}`);
        
        // Se não há registros, tentar criar um de teste
        if (count === 0) {
          console.log('🧪 Criando registro de teste...');
          
          // Buscar um usuário admin para usar como usuarioId
          const adminUser = await prisma.usuario.findFirst({
            where: { tipo: 'ADMIN' }
          });
          
          if (adminUser) {
            const testAjuste = await prisma.palletAjuste.create({
              data: {
                id: require('crypto').randomUUID(),
                motorista: 'Teste Sistema',
                transportadora: 'ACCERT',
                quantidade: 1,
                observacao: 'Registro de teste - verificação do modelo',
                usuarioId: adminUser.id
              }
            });
            
            console.log('✅ Registro de teste criado:', testAjuste.id);
          } else {
            console.log('❌ Nenhum usuário ADMIN encontrado para teste');
          }
        }
        
      } catch (createError) {
        console.error('❌ Erro ao trabalhar com PalletAjuste:', createError);
        console.error('Código:', createError.code);
        console.error('Mensagem:', createError.message);
      }
      
    } else {
      console.log('❌ Modelo PalletAjuste NÃO encontrado no Prisma Client');
      console.log('💡 Execute: npx prisma generate');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPalletModel();
