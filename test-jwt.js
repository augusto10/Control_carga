// Testar geração de JWT
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

console.log('🔐 Testando geração de JWT...');
console.log('JWT_SECRET configurado:', JWT_SECRET ? 'SIM' : 'NÃO');

try {
  const tokenPayload = {
    id: 'test-id',
    email: 'test@test.com',
    nome: 'Teste',
    tipo: 'ADMIN',
  };
  
  console.log('📝 Payload:', tokenPayload);
  
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
  console.log('✅ Token gerado com sucesso!');
  console.log('Token (primeiros 50 chars):', token.substring(0, 50) + '...');
  
  // Testar verificação
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verificado com sucesso!');
  console.log('Decoded:', decoded);
  
} catch (error) {
  console.error('❌ Erro ao gerar/verificar JWT:', error);
}
