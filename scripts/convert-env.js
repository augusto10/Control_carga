
const fs = require('fs');
const path = require('path');

function convertToUtf8() {
  const envPath = path.resolve(__dirname, '../.env');
  const buffer = fs.readFileSync(envPath);
  
  let content;
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    console.log('Detected UTF-16 LE BOM. Converting to UTF-8...');
    content = buffer.toString('utf16le');
  } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    console.log('Detected UTF-16 BE BOM. Converting to UTF-8...');
    content = buffer.toString('utf16be');
  } else {
    console.log('No UTF-16 BOM detected. Assuming UTF-8 or similar.');
    return;
  }
  
  // Clean null characters just in case
  content = content.replace(/\0/g, '');
  
  // Write back as UTF-8
  fs.writeFileSync(envPath, content, 'utf8');
  console.log('Successfully converted .env to UTF-8.');
}

convertToUtf8();
