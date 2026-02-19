const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Carregar variáveis do .env.local
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex !== -1) {
        const key = trimmed.substring(0, equalsIndex).trim();
        let value = trimmed.substring(equalsIndex + 1).trim();
        // Remover aspas
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  });
  console.log('✅ Variáveis carregadas do .env.local');
} catch (error) {
  console.log('⚠️ Erro ao carregar .env.local:', error.message);
}

const prisma = new PrismaClient();

async function testarCorrecao() {
  console.log('🧪 TESTE DE CORREÇÃO DE SENHA');
  console.log('=' .repeat(40));
  
  // Testar com o usuário admin
  const email = 'admin@esplendor.com';
  
  console.log(`\n🔍 Buscando usuário: ${email}`);
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { nome: true, email: true, senha: true, tipo: true }
  });
  
  if (!usuario) {
    console.log('❌ Usuário não encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Usuário encontrado: ${usuario.nome} (${usuario.tipo})`);
  console.log(`📧 Email: ${usuario.email}`);
  console.log(`🔐 Hash atual: ${usuario.senha.substring(0, 30)}...`);
  
  // Testar senha conhecida
  const senhaTeste = 'admin123';
  console.log(`\n🔐 Testando senha "${senhaTeste}"...`);
  
  const senhaCorreta = await bcrypt.compare(senhaTeste, usuario.senha);
  console.log(`Resultado: ${senhaCorreta ? '✅ CORRETA' : '❌ INCORRETA'}`);
  
  if (!senhaCorreta) {
    console.log('\n⚠️ A senha não corresponde. Gerando novo hash...');
    const novaSenha = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const novoHash = await bcrypt.hash(novaSenha, salt);
    
    console.log(`Novo hash gerado: ${novoHash.substring(0, 30)}...`);
    
    // Atualizar no banco
    await prisma.usuario.update({
      where: { email },
      data: { senha: novoHash }
    });
    
    console.log('\n🎉 Senha atualizada no banco de dados!');
    console.log(`Usuário: ${usuario.email}`);
    console.log(`Nova senha: ${novaSenha}`);
  } else {
    console.log('\nℹ️ A senha atual está correta.');
    console.log('Para alterar a senha, use o script "corrigir-senha-usuario.js"');
  }
  
  await prisma.$disconnect();
  console.log('\n🔚 Teste concluído.');
}

testarCorrecao().catch(error => {
  console.error('❌ Erro no teste:', error);
  process.exit(1);
});