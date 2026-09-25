// Script simples para atualizar a data do catálogo de produtos
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'src', 'data', 'products-maxima.json');

try {
  const products = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const now = new Date().toISOString();
  
  // Atualiza a data de todos os produtos
  const updatedProducts = products.map(product => ({
    ...product,
    updatedAt: now
  }));
  
  fs.writeFileSync(dataFile, JSON.stringify(updatedProducts, null, 2));
  console.log(`✅ Data do catálogo atualizada para: ${new Date(now).toLocaleString('pt-BR')}`);
  console.log(`📦 Total de produtos atualizados: ${updatedProducts.length}`);
} catch (error) {
  console.error('❌ Erro ao atualizar catálogo:', error.message);
  process.exit(1);
}