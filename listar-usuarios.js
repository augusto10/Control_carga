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
    console.log('📋 Listando todos os usuários do sistema...\n');
    
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
      },
      orderBy: {
        dataCriacao: 'desc'
      }
    });
    
    console.log(`✅ Total de usuários: ${usuarios.length}\n`);
    
    if (usuarios.length > 0) {
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│                                LISTA DE USUÁRIOS                             │');
      console.log('├────────────────┬──────────────────────────────┬────────────┬──────┬──────────┤');
      console.log('│ Nome           │ Email                        │ Tipo       │ Ativo│ Últ.Acesso');
      console.log('├────────────────┼──────────────────────────────┼────────────┼──────┼──────────┤');
      
      usuarios.forEach(usuario => {
        const nome = usuario.nome.substring(0, 14).padEnd(14, ' ');
        const email = usuario.email.substring(0, 28).padEnd(28, ' ');
        const tipo = usuario.tipo.substring(0, 10).padEnd(10, ' ');
        const ativo = usuario.ativo ? '✅' : '❌';
        const ultimoAcesso = usuario.ultimoAcesso 
          ? new Date(usuario.ultimoAcesso).toLocaleDateString('pt-BR')
          : 'Nunca';
        
        console.log(`│ ${nome} │ ${email} │ ${tipo} │ ${ativo}  │ ${ultimoAcesso.padEnd(8, ' ')} │`);
      });
      
      console.log('└────────────────┴──────────────────────────────┴────────────┴──────┴──────────┘');
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 Conexão com banco encerrada');
  }
}

main();