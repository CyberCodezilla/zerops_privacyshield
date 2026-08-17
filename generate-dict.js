const fs = require('fs');
const path = require('path');

// Generate complete dictionary with ASCII, punctuation, Devanagari (Hindi/Marathi), and common symbols
function generateDict() {
  const chars = [];
  
  // 1. Standard Digits & ASCII Letters
  for (let c = 32; c <= 126; c++) {
    chars.push(String.fromCharCode(c));
  }
  
  // 2. Common Currency & Financial Symbols
  const symbols = ['₹', '€', '$', '£', '¥', '¢', '©', '®', '™', '°', '±', '×', '÷', 'µ', '—', '–', '“', '”', '‘', '’', '•', '…', '‰', '№'];
  symbols.forEach(s => chars.push(s));
  
  // 3. Devanagari characters (Hindi / Marathi) \u0900 to \u097F
  for (let code = 0x0900; code <= 0x097F; code++) {
    chars.push(String.fromCharCode(code));
  }

  const content = chars.join('\n');
  const target1 = path.join(__dirname, 'public', 'models', 'ppocr_keys_v1.txt');
  const targetDir2 = path.join(__dirname, 'apps', 'extension', 'models');
  if (!fs.existsSync(targetDir2)) fs.mkdirSync(targetDir2, { recursive: true });
  const target2 = path.join(targetDir2, 'ppocr_keys_v1.txt');

  fs.writeFileSync(target1, content, 'utf8');
  fs.writeFileSync(target2, content, 'utf8');
  console.log(`Generated PP-OCR keys dictionary with ${chars.length} characters.`);
}

generateDict();
