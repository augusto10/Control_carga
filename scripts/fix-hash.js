const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAdminPassword() {
  const email = 'admin@controlecarga.com';
  const senha = 'admin123';
  
  try {
    console.log('Gerando novo hash para a senha...');
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(senha, salt);
    
    console.log('Novo hash gerado:', hash);
    
    console.log('Atualizando banco de dados...');
    const updatedUser = await prisma.usuario.update({
      where: { email },
      data: { senha: hash },
    });
    
    console.log('Senha atualizada com sucesso!');
    console.log('Usuário atualizado:', {
      id: updatedUser.id,
      email: updatedUser.email,
      tipo: updatedUser.tipo,
    });
    
  } catch (error) {
    console.error('Erro ao atualizar a senha:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPassword();
