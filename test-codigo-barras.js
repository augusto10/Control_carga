// Teste da lógica de extração do número da nota
function testarExtracaoNumero(codigoLido) {
  console.log('Código lido completo:', codigoLido);
  console.log('Tamanho do código:', codigoLido.length);
  console.log('Tipo do código:', typeof codigoLido);
  
  let numeroExtraido = '';
  
  // Extração automática do número da nota para diferentes tipos de código
  if (/^\d{44}$/.test(codigoLido)) {
    // DANFE: número da nota geralmente nos dígitos 26 a 34 (índice 25 a 34)
    numeroExtraido = codigoLido.substring(25, 34);
    console.log('DANFE detectado - Número extraído:', numeroExtraido);
  } else if (/^\d+$/.test(codigoLido)) {
    // Código totalmente numérico
    if (codigoLido.length >= 9) {
      // Se tem 9 ou mais dígitos, pega os últimos 9
      numeroExtraido = codigoLido.slice(-9);
      console.log('Código numérico longo - Número extraído:', numeroExtraido);
    } else {
      // Se tem menos de 9 dígitos, usa o código inteiro
      numeroExtraido = codigoLido;
      console.log('Código numérico curto - Usando código completo:', numeroExtraido);
    }
  } else {
    // Para códigos alfanuméricos ou outros formatos
    // Tenta extrair apenas os números do código
    const numerosEncontrados = codigoLido.match(/\d+/g);
    if (numerosEncontrados && numerosEncontrados.length > 0) {
      // Pega a maior sequência de números encontrada
      numeroExtraido = numerosEncontrados.reduce((maior, atual) => 
        atual.length > maior.length ? atual : maior
      );
      console.log('Código alfanumérico - Números encontrados:', numerosEncontrados);
      console.log('Maior sequência numérica:', numeroExtraido);
    } else {
      // Se não encontrou números, usa o código completo
      numeroExtraido = codigoLido;
      console.log('Nenhum número encontrado - Usando código completo:', numeroExtraido);
    }
  }
  
  console.log('Número final a ser definido:', numeroExtraido);
  console.log('---');
  return numeroExtraido;
}

// Testes com diferentes tipos de código
console.log('=== TESTE 1: DANFE (44 dígitos) ===');
testarExtracaoNumero('35200714200166000196550010000000046176781677');

console.log('=== TESTE 2: Código numérico longo ===');
testarExtracaoNumero('1234567890123456789');

console.log('=== TESTE 3: Código numérico curto ===');
testarExtracaoNumero('12345678');

console.log('=== TESTE 4: Código alfanumérico ===');
testarExtracaoNumero('ABC123456789DEF');

console.log('=== TESTE 5: Código com hífen ===');
testarExtracaoNumero('NF-123456789');

console.log('=== TESTE 6: Código sem números ===');
testarExtracaoNumero('ABCDEFGH');
