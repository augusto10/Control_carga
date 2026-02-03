#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');
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

// Interface para leitura de entrada
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function buscarUsuarioPorEmail(email) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        tipo: true,
        ativo: true,
        dataCriacao: true
      }
    });
    return usuario;
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error.message);
    return null;
  }
}

async function testarSenha(senha, hash) {
  try {
    return await bcrypt.compare(senha, hash);
  } catch (error) {
    console.error('❌ Erro ao comparar senha:', error.message);
    return false;
  }
}

async function alterarSenha(email, novaSenha) {
  try {
    const salt = await bcrypt.genSalt(10);
    const novoHash = await bcrypt.hash(novaSenha, salt);
    
    const usuarioAtualizado = await prisma.usuario.update({
      where: { email },
      data: { senha: novoHash }
    });
    
    return { success: true, hash: novoHash, usuario: usuarioAtualizado };
  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔧 CORRIGIR SENHA DE USUÁRIO');
  console.log('=' .repeat(50));
  
  // 1. Solicitar email do usuário
  const email = await question('\n📧 Digite o email do usuário: ');
  
  if (!email) {
    console.log('❌ Email não fornecido. Encerrando...');
    rl.close();
    await prisma.$disconnect();
    return;
  }
  
  // 2. Buscar usuário
  console.log(`\n🔍 Buscando usuário: ${email}`);
  const usuario = await buscarUsuarioPorEmail(email);
  
  if (!usuario) {
    console.log(`❌ Usuário com email "${email}" não encontrado.`);
    rl.close();
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n✅ USUÁRIO ENCONTRADO:');
  console.log(`   Nome: ${usuario.nome}`);
  console.log(`   Email: ${usuario.email}`);
  console.log(`   Tipo: ${usuario.tipo}`);
  console.log(`   Ativo: ${usuario.ativo ? 'Sim' : 'Não'}`);
  console.log(`   Hash da senha: ${usuario.senha.substring(0, 30)}...`);
  
  // 3. Testar senha atual
  console.log('\n🔐 TESTE DE SENHA ATUAL');
  const senhaAtual = await question('   Digite a senha atual para testar (ou pressione Enter para pular): ');
  
  if (senhaAtual) {
    const senhaCorreta = await testarSenha(senhaAtual, usuario.senha);
    console.log(`   Resultado: ${senhaCorreta ? '✅ SENHA CORRETA' : '❌ SENHA INCORRETA'}`);
    
    if (senhaCorreta) {
      console.log('\nℹ️ A senha atual está correta. O problema pode estar em outro lugar.');
      const continuar = await question('   Deseja alterar a senha mesmo assim? (s/n): ');
      
      if (continuar.toLowerCase() !== 's') {
        console.log('\n👋 Operação cancelada.');
        rl.close();
        await prisma.$disconnect();
        return;
      }
    }
  }
  
  // 4. Alterar senha
  console.log('\n🔄 ALTERAÇÃO DE SENHA');
  const novaSenha = await question('   Digite a nova senha: ');
  
  if (!novaSenha) {
    console.log('❌ Nova senha não fornecida. Encerrando...');
    rl.close();
    await prisma.$disconnect();
    return;
  }
  
  const confirmacao = await question(`   Confirmar alteração da senha para "${novaSenha}"? (s/n): `);
  
  if (confirmacao.toLowerCase() !== 's') {
    console.log('\n👋 Operação cancelada.');
    rl.close();
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n⏳ Alterando senha...');
  const resultado = await alterarSenha(email, novaSenha);
  
  if (resultado.success) {
    console.log('\n🎉 SENHA ALTERADA COM SUCESSO!');
    console.log(`   Email: ${email}`);
    console.log(`   Nova senha: ${novaSenha}`);
    console.log(`   Novo hash: ${resultado.hash.substring(0, 30)}...`);
    console.log('\n📋 RESUMO:');
    console.log(`   Usuário pode agora fazer login com:`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${novaSenha}`);
  } else {
    console.log('\n❌ ERRO AO ALTERAR SENHA:');
    console.log(`   ${resultado.error}`);
  }
  
  rl.close();
  await prisma.$disconnect();
}

// Tratamento de erros
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  rl.close();
  prisma.$disconnect().catch(() => {});
  process.exit(1);
});