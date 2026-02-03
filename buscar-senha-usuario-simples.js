// Script simples para buscar senha do usuário admin@esplendor.com
const { PrismaClient } = require('@prisma/client');
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

async function main() {
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    const email = 'admin@esplendor.com';
    console.log(`🚀 Buscando senha do usuário: ${email}\n`);
    
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
      }
    });
    
    if (usuario) {
      console.log('✅ USUÁRIO ENCONTRADO:');
      console.log('=====================');
      console.log(`ID: ${usuario.id}`);
      console.log(`Nome: ${usuario.nome}`);
      console.log(`Email: ${usuario.email}`);
      console.log(`Senha: ${usuario.senha}`);
      console.log(`Tipo: ${usuario.tipo}`);
      console.log(`Ativo: ${usuario.ativo}`);
      console.log(`Data de criação: ${usuario.dataCriacao}`);
      console.log(`Último acesso: ${usuario.ultimoAcesso || 'Nunca acessou'}`);
      console.log('=====================');
    } else {
      console.log(`\n⚠️ Usuário ${email} não encontrado no banco de dados.`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error.message);
    if (error.code) {
      console.error('Código do erro:', error.code);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 Conexão com banco encerrada');
  }
}

// Executar
main();