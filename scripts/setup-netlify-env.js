#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Carrega as variáveis de ambiente do arquivo .env
const envPath = path.resolve(__dirname, '../.env');
const envExamplePath = path.resolve(__dirname, '../.env.example');

// Verifica se o arquivo .env existe
if (!fs.existsSync(envPath)) {
  console.error('Erro: Arquivo .env não encontrado. Por favor, crie um arquivo .env baseado no .env.example');
  process.exit(1);
}

// Carrega as variáveis de ambiente
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

// Processa as variáveis de ambiente
envContent.split('\n').forEach(line => {
  // Ignora linhas vazias e comentários
  if (!line.trim() || line.startsWith('#')) return;
  
  // Extrai chave e valor
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim();
  
  // Remove aspas se existirem
  const cleanValue = value.replace(/^['"]|['"]$/g, '');
  
  envVars[key.trim()] = cleanValue;
});

// Configura as variáveis de ambiente necessárias para o Netlify
const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SITE_URL'
];

// Verifica se todas as variáveis necessárias estão definidas
const missingVars = requiredVars.filter(varName => !envVars[varName]);

if (missingVars.length > 0) {
  console.error('Erro: As seguintes variáveis de ambiente obrigatórias não estão definidas:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  process.exit(1);
}

console.log('✅ Todas as variáveis de ambiente necessárias estão definidas');

// Configura as variáveis de ambiente no Netlify
console.log('\nConfigurando variáveis de ambiente no Netlify...');

try {
  // Constrói o comando para configurar as variáveis de ambiente
  const envVarsCommand = Object.entries(envVars)
    .filter(([key]) => !key.startsWith('#')) // Filtra comentários
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`) // Formata corretamente
    .join(' ');

  // Executa o comando para configurar as variáveis de ambiente
  execSync(`netlify env:import ${envPath}`, { stdio: 'inherit' });
  
  console.log('✅ Variáveis de ambiente configuradas com sucesso no Netlify');
  
  // Mostra as variáveis configuradas
  console.log('\n📋 Variáveis de ambiente configuradas:');
  Object.entries(envVars).forEach(([key, value]) => {
    const isSensitive = key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password');
    console.log(`- ${key}: ${isSensitive ? '***' : value}`);
  });
  
  console.log('\n✅ Configuração concluída com sucesso!');
  
} catch (error) {
  console.error('❌ Erro ao configurar as variáveis de ambiente no Netlify:');
  console.error(error.message);
  process.exit(1);
}
