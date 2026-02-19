const bcrypt = require('bcryptjs');

// Senha que queremos testar
const senha = 'admin123';

// Hash que está no banco de dados
const hashNoBanco = '$2b$10$XFDq3wW5Wt6x5X5X5X5X5OQ9X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5';

console.log('Testando bcrypt...');
console.log('Senha:', senha);
console.log('Hash no banco:', hashNoBanco);

// Verificar se o hash é válido
const hashValido = bcrypt.getRounds(hashNoBanco);
console.log('Hash é válido?', hashValido === 0 ? 'Sim' : 'Não');

// Gerar um novo hash para a senha
const salt = bcrypt.genSaltSync(10);
const novoHash = bcrypt.hashSync(senha, salt);

console.log('Novo hash gerado:', novoHash);

// Comparar a senha com o hash do banco
console.log('Comparando senha com hash do banco...');
const resultado = bcrypt.compareSync(senha, hashNoBanco);
console.log('Resultado da comparação:', resultado);

// Comparar a senha com o novo hash
console.log('Comparando senha com novo hash...');
const resultadoNovoHash = bcrypt.compareSync(senha, novoHash);
console.log('Resultado da comparação com novo hash:', resultadoNovoHash);
