const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateLogoGRF() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'templates', 'logo oficial.png');
    const grfPath = path.join(process.cwd(), 'public', 'templates', 'LOGO_OFICIAL.GRF');

    if (!fs.existsSync(logoPath)) {
      throw new Error('Arquivo public/templates/logo oficial.png nao encontrado');
    }

    const width = 92;
    const height = 40;
    const { data, info } = await sharp(logoPath)
      .resize({ width, height, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: '#ffffff' })
      .grayscale()
      .threshold(145)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bytesPerRow = Math.ceil(info.width / 8);
    const rows = [];

    for (let y = 0; y < info.height; y += 1) {
      const row = [];
      for (let xByte = 0; xByte < bytesPerRow; xByte += 1) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit += 1) {
          const x = (xByte * 8) + bit;
          const pixel = x < info.width ? data[(y * info.width) + x] : 255;
          if (pixel < 128) byte |= 1 << (7 - bit);
        }
        row.push(byte.toString(16).toUpperCase().padStart(2, '0'));
      }
      rows.push(row.join(''));
    }

    const totalBytes = bytesPerRow * info.height;
    const grf = `~DGR:LOGO_OFICIAL.GRF,${String(totalBytes).padStart(5, '0')},${String(bytesPerRow).padStart(3, '0')},\n${rows.join(',\n')}\n`;

    fs.writeFileSync(grfPath, grf, 'utf8');
    console.log(`[Logo] Arquivo GRF criado em: ${grfPath}`);
    return true;
  } catch (error) {
    console.error('[Logo] Erro ao criar GRF:', error);
    return false;
  }
}

function printConversionInstructions() {
  console.log('\n=== LOGO ZEBRA ===');
  console.log('1. Atualize public/templates/logo oficial.png');
  console.log('2. Execute: node utils/logo-generator.js');
  console.log('3. O arquivo public/templates/LOGO_OFICIAL.GRF sera recriado automaticamente');
  console.log('\n=== DIMENSOES UTILIZADAS ===');
  console.log('- Largura final: 92 px');
  console.log('- Altura final: 40 px');
  console.log('- Formato: monocromatico (threshold)');
  console.log('\n=========================================\n');
}

if (require.main === module) {
  generateLogoGRF().then(() => {
    printConversionInstructions();
  });
}

module.exports = { generateLogoGRF, printConversionInstructions };
