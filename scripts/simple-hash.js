const bcrypt = require('bcryptjs');

const password = 'admin123';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Senha:', password);
console.log('Salt:', salt);
console.log('Hash:', hash);

// Verificar se a senha corresponde ao hash
const isValid = bcrypt.compareSync(password, hash);
console.log('A senha corresponde ao hash?', isValid);
