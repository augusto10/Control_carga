const { PrismaClient } = require('@prisma/client');
const { compare } = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Conectando ao banco de dados...');
    
    // Buscar o usuário admin
    const admin = await prisma.$queryRaw`
      SELECT id, nome, email, senha, tipo, ativo, "dataCriacao" 
      FROM "Usuario" 
      WHERE email = 'admin@controlecarga.com';
    `;
    
    if (!admin || admin.length === 0) {
      console.log('Usuário admin não encontrado');
      return;
    }
    
    const user = admin[0];
    console.log('\nDetalhes do usuário admin:');
    console.table([{
      id: user.id,
      email: user.email,
      tipo: user.tipo,
      ativo: user.ativo,
      senha_hash: user.senha.substring(0, 10) + '...',
      tamanho_hash: user.senha.length
    }]);
    
    // Verificar a senha
    const senhaFornecida = 'admin123'; // Senha padrão
    console.log('\nVerificando senha...');
    console.log('Senha fornecida:', senhaFornecida);
    console.log('Hash no banco:', user.senha);
    
    const senhaValida = await compare(senhaFornecida, user.senha);
    console.log('Senha válida?', senhaValida);
    
    if (!senhaValida) {
      console.log('\n⚠️ A senha não corresponde ao hash armazenado.');
      console.log('Isso pode acontecer se o hash não foi gerado corretamente.');
      
      // Sugerir recriar o usuário admin
      console.log('\nTentando recriar o usuário admin...');
      await recreateAdminUser(prisma);
    } else {
      console.log('\n✅ Login deve estar funcionando com as credenciais:');
      console.log('Email: admin@controlecarga.com');
      console.log('Senha: admin123');
    }
    
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function recreateAdminUser(prisma) {
  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.$queryRaw`
      UPDATE "Usuario" 
      SET senha = ${hashedPassword}
      WHERE email = 'admin@controlecarga.com';
    `;
    
    console.log('✅ Senha do usuário admin atualizada com sucesso!');
    console.log('Tente fazer login novamente com:');
    console.log('Email: admin@controlecarga.com');
    console.log('Senha: admin123');
  } catch (error) {
    console.error('Erro ao recriar usuário admin:', error);
  }
}

main().catch(console.error);
