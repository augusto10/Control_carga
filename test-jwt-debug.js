const jwt = require('jsonwebtoken');

// Test JWT configuration
console.log('=== JWT DEBUG TEST ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET configurado:', !!process.env.JWT_SECRET);

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';
console.log('JWT_SECRET usado:', JWT_SECRET.substring(0, 10) + '...');

// Test creating and verifying a token
try {
  const payload = { id: '123', email: 'test@example.com', tipo: 'admin' };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  console.log('Token criado:', token.substring(0, 50) + '...');
  
  // Verify immediately
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verificado com sucesso:', decoded);
} catch (error) {
  console.error('Erro no teste JWT:', error.message);
}

// Test with different secret
try {
  const payload = { id: '123', email: 'test@example.com', tipo: 'admin' };
  const token = jwt.sign(payload, 'different_secret', { expiresIn: '7d' });
  console.log('Token criado com secret diferente...');
  
  // Try to verify with wrong secret
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verificado (não deveria acontecer):', decoded);
} catch (error) {
  console.error('Erro esperado (secret diferente):', error.message);
}
