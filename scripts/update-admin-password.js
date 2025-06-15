const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Conectando ao banco de dados...');
    
    // Gerar um novo hash para a senha
    const senha = 'admin123'; // Nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);
    
    console.log('Novo hash gerado:', hashedPassword);
    
    // Atualizar a senha do usuário admin
    const result = await prisma.$queryRaw`
      UPDATE "Usuario" 
      SET senha = ${hashedPassword}
      WHERE email = 'admin@controlecarga.com'
      RETURNING id, email, tipo;
    `;
    
    console.log('\n✅ Senha do usuário admin atualizada com sucesso!');
    console.log('Usuário atualizado:');
    console.table(result);
    
    console.log('\n🎉 Agora você pode fazer login com:');
    console.log('Email: admin@controlecarga.com');
    console.log('Senha: admin123');
    
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
