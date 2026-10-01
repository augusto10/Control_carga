const jwt = require('jsonwebtoken');

// Teste do JWT
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

console.log('🔍 Testando JWT...');
console.log('JWT_SECRET definido:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET valor (primeiros 10 chars):', (JWT_SECRET || '').substring(0, 10) + '...');

// Teste de assinatura
try {
  const payload = { userId: 'test', email: 'test@example.com' };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  console.log('✅ Token gerado com sucesso');

  // Teste de verificação
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verificado com sucesso');
  console.log('Payload decodificado:', decoded);
} catch (error) {
  console.error('❌ Erro no JWT:', error.message);
}
