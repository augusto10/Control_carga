import { PrismaClient } from '@prisma/client';

async function checkAdminUser() {
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.usuario.findUnique({
      where: { email: 'admin@controlecarga.com' },
      select: { id: true, nome: true, email: true, tipo: true, ativo: true, dataCriacao: true }
    });
    
    if (user) {
      console.log('Usuário admin encontrado:');
      console.log(user);
    } else {
      console.log('Usuário admin não encontrado');
    }
    
  } catch (error) {
    console.error('Erro ao verificar usuário admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();
