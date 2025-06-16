import { compare } from 'bcryptjs';

async function testLogin() {
  const senhaFornecida = 'admin123';
  const hashNoBanco = '$2b$10$XFDq3wW5Wt6x5X5X5X5X5OQ9X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5';
  
  console.log('Testando login...');
  console.log('Senha fornecida:', senhaFornecida);
  console.log('Hash no banco:', hashNoBanco);
  
  try {
    console.log('Iniciando comparação de senhas...');
    const senhaValida = await compare(senhaFornecida, hashNoBanco);
    console.log('Resultado da comparação:', senhaValida);
    
    if (senhaValida) {
      console.log('✅ Senha válida!');
    } else {
      console.log('❌ Senha inválida!');
    }
  } catch (error) {
    console.error('Erro ao comparar senhas:', error);
  }
}

testLogin();
