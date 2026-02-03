// Script para buscar senha do usuário admin@esplendor.com
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Carregar variáveis do .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^"|"$/g, '');
      process.env[key] = value;
    }
  });
  console.log('✅ Variáveis carregadas do .env.local');
} else {
  console.log('⚠️ Arquivo .env.local não encontrado');
}

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function buscarSenhaUsuario(email) {
  try {
    console.log(`🔍 Buscando usuário com email: ${email}`);
    
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
        foto: true
      }
    });
    
    if (usuario) {
      console.log('✅ Usuário encontrado:');
      console.log({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        senha: usuario.senha,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        dataCriacao: usuario.dataCriacao,
        ultimoAcesso: usuario.ultimoAcesso,
        possuiFoto: !!usuario.foto
      });
      return usuario;
    } else {
      console.log('❌ Usuário não encontrado');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    throw error;
  }
}

async function main() {
  try {
    const email = 'admin@esplendor.com';
    console.log(`🚀 Buscando senha do usuário: ${email}\n`);
    
    const usuario = await buscarSenhaUsuario(email);
    
    if (usuario) {
      console.log('\n📋 RESUMO:');
      console.log(`Email: ${usuario.email}`);
      console.log(`Senha: ${usuario.senha}`);
      console.log(`Nome: ${usuario.nome}`);
      console.log(`Tipo: ${usuario.tipo}`);
      console.log(`Ativo: ${usuario.ativo}`);
    } else {
      console.log(`\n⚠️ Usuário ${email} não encontrado no banco de dados.`);
    }
    
  } catch (error) {
    console.error('❌ Erro no processo:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 Conexão com banco encerrada');
  }
}

// Executar se rodado diretamente
if (require.main === module) {
  main();
}

module.exports = { buscarSenhaUsuario };