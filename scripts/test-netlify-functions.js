#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

// Configurações
const PORT = 8888;
const HOST = 'localhost';
const NETLIFY_FUNCTIONS_DIR = path.resolve(__dirname, '../netlify/functions');
const ENV_FILE = path.resolve(__dirname, '../.env');

// Carrega as variáveis de ambiente
if (fs.existsSync(ENV_FILE)) {
  const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  envContent.split('\n').forEach(line => {
    if (!line.trim() || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    process.env[key.trim()] = value;
  });
}

// Lista de funções para testar
const functionsToTest = [
  {
    name: 'login',
    path: '/api/auth/login',
    method: 'POST',
    body: {
      email: 'admin@example.com',
      senha: 'senha123'
    },
    headers: {
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'me',
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN_HERE' // Será substituído pelo token retornado pelo login
    }
  }
];

// Função para testar uma função do Netlify
async function testFunction(func, token = null) {
  console.log(`\n🔍 Testando função: ${func.name}`);
  
  // Substitui o token se fornecido
  const headers = { ...func.headers };
  if (token && headers.Authorization) {
    headers.Authorization = headers.Authorization.replace('YOUR_TOKEN_HERE', token);
  }
  
  // Prepara o corpo da requisição
  let body = null;
  if (func.body && typeof func.body === 'object') {
    body = JSON.stringify(func.body);
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  
  try {
    // Faz a requisição para a função local
    const response = await fetch(`http://${HOST}:${PORT}${func.path}`, {
      method: func.method,
      headers,
      body,
    });
    
    const responseData = await response.json().catch(() => ({}));
    
    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    console.log('📦 Resposta:', JSON.stringify(responseData, null, 2));
    
    // Retorna o token de autenticação se for uma resposta de login
    if (func.name === 'login' && responseData.token) {
      return responseData.token;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Erro ao testar a função ${func.name}:`, error.message);
    return null;
  }
}

// Inicia o servidor Netlify Functions local
console.log('🚀 Iniciando servidor Netlify Functions local...');

// Verifica se o netlify-cli está instalado
try {
  execSync('netlify --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ O Netlify CLI não está instalado. Instale com: npm install -g netlify-cli');
  process.exit(1);
}

// Inicia o servidor em segundo plano
const netlifyProcess = execSync(
  `netlify dev --dir=.next --functions=netlify/functions --port=${PORT}`,
  { stdio: 'inherit', shell: true, detached: true }
);

// Aguarda o servidor iniciar
console.log(`⏳ Aguardando o servidor iniciar em http://${HOST}:${PORT}...`);
setTimeout(async () => {
  try {
    console.log('\n🔧 Iniciando testes das funções...');
    
    let authToken = null;
    
    // Testa cada função
    for (const func of functionsToTest) {
      const token = await testFunction(func, authToken);
      if (token) {
        authToken = token;
        console.log(`🔑 Token de autenticação obtido: ${token.substring(0, 20)}...`);
      }
    }
    
    console.log('\n✅ Todos os testes foram concluídos!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    // Encerra o processo do Netlify
    process.kill(-netlifyProcess.pid, 'SIGTERM');
    process.exit(0);
  }
}, 5000);

// Manipula o encerramento do script
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando...');
  process.kill(-netlifyProcess.pid, 'SIGTERM');
  process.exit(0);
});
