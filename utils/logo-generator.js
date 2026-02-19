// utils/logo-generator.js
// Script para converter imagem para formato GRF (Zebra)

const fs = require('fs');
const path = require('path');

// Função para converter imagem para formato GRF (simulação)
// Em produção, você precisaria de uma biblioteca como 'sharp' para processamento real de imagem
function generateLogoGRF() {
  try {
    // Caminho da imagem original
    const logoPath = path.join(process.cwd(), 'public', 'templates', 'logo_oficial.png');
    const grfPath = path.join(process.cwd(), 'public', 'templates', 'LOGO_OFICIAL.GRF');
    
    // Verificar se o logo existe
    if (!fs.existsSync(logoPath)) {
      console.log('[Logo] Arquivo logo_oficial.png não encontrado, criando GRF simulado...');
      
      // Criar um GRF simulado (em produção, converteria a imagem real)
      const simulatedGRF = `~DGLOGO_OFICIAL,00048,048,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E
`;
      
      fs.writeFileSync(grfPath, simulatedGRF, 'utf8');
      console.log('[Logo] GRF simulado criado com sucesso');
    } else {
      console.log('[Logo] Arquivo logo_oficial.png encontrado');
      console.log('[Logo] Em produção, use uma ferramenta como ZebraDesigner para converter PNG para GRF');
      console.log('[Logo] Ou use bibliotecas como sharp + conversão manual para GRF');
      
      // Criar GRF simulado mesmo com a imagem presente
      const simulatedGRF = `~DGLOGO_OFICIAL,00048,048,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,
07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E,07E
`;
      
      fs.writeFileSync(grfPath, simulatedGRF, 'utf8');
      console.log('[Logo] GRF criado com sucesso');
    }
    
    console.log(`[Logo] Arquivo GRF criado em: ${grfPath}`);
    return true;
    
  } catch (error) {
    console.error('[Logo] Erro ao criar GRF:', error);
    return false;
  }
}

// Instruções para converter imagem real para GRF
function printConversionInstructions() {
  console.log('\n=== INSTRUÇÕES PARA CONVERTER LOGO REAL ===');
  console.log('1. Use ZebraDesigner para converter logo_oficial.png para LOGO_OFICIAL.GRF');
  console.log('2. Ou use ferramentas online como:');
  console.log('   - https://labelary.com/');
  console.log('   - Zebra Online Converter');
  console.log('3. Coloque o arquivo LOGO_OFICIAL.GRF em: public/templates/');
  console.log('4. O sistema usará automaticamente o logo nas etiquetas');
  console.log('\n=== DIMENSÕES RECOMENDADAS ===');
  console.log('- Largura: 48-64 pixels (para não sobrepor dados)');
  console.log('- Altura: 48-64 pixels');
  console.log('- Formato: Preto e Branco (1-bit)');
  console.log('- Tipo: PNG ou BMP');
  console.log('\n=========================================\n');
}

// Executar geração
if (require.main === module) {
  generateLogoGRF();
  printConversionInstructions();
}

module.exports = { generateLogoGRF, printConversionInstructions };
