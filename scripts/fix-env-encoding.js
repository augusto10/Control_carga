const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const buffer = fs.readFileSync(envPath);

// Check for UTF-16 LE BOM (FF FE) or just check for null bytes
let content;
if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
  content = buffer.toString('utf16le');
} else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
  content = buffer.toString('utf16be');
} else {
  // Try to detect if it's UTF-16 by looking for null bytes
  const hasNulls = buffer.some(b => b === 0);
  if (hasNulls) {
    content = buffer.toString('utf16le');
  } else {
    content = buffer.toString('utf8');
  }
}

// Remove BOM if present
content = content.replace(/^\uFEFF/, '');

// Clean up any remaining null characters or weirdness
content = content.replace(/\0/g, '');

console.log('Cleaned content:');
console.log(content);

fs.writeFileSync(envPath, content, 'utf8');
console.log('.env file converted to UTF-8 successfully.');
