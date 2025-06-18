import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

async function updateAdminPassword() {
  const prisma = new PrismaClient();
  
  try {
    const email = 'admin@controlecarga.com';
    const newPassword = 'adm123';
    
    console.log(`Atualizando senha para o usuário: ${email}`);
    
    // Gera o hash da nova senha
    const hashedPassword = await hash(newPassword, 10);
    
    // Atualiza a senha no banco de dados
    const updatedUser = await prisma.usuario.update({
      where: { email },
      data: { senha: hashedPassword },
    });
    
    console.log('Senha atualizada com sucesso!');
    console.log('Detalhes do usuário:', {
      id: updatedUser.id,
      nome: updatedUser.nome,
      email: updatedUser.email,
      tipo: updatedUser.tipo,
    });
    
  } catch (error) {
    console.error('Erro ao atualizar a senha:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();
