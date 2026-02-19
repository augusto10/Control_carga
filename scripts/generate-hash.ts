import { hash } from 'bcryptjs';

async function generateHash() {
  const password = 'admin123';
  const hashedPassword = await hash(password, 10);
  console.log('Senha:', password);
  console.log('Hash gerado:', hashedPassword);
}

generateHash().catch(console.error);
