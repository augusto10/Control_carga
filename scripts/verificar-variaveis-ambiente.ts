console.log('=== Variáveis de Ambiente ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'NÃO CONFIGURADO');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');

// Lista todas as variáveis de ambiente (apenas nomes)
console.log('\n=== Todas as variáveis de ambiente ===');
Object.keys(process.env).forEach(key => {
  console.log(`- ${key}`);
});
