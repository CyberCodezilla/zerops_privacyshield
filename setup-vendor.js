const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'node_modules', 'onnxruntime-web', 'dist');
const dstDir = path.join(__dirname, 'public', 'vendor', 'ort');
const extDstDir = path.join(__dirname, 'apps', 'extension', 'vendor');

if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
if (!fs.existsSync(extDstDir)) fs.mkdirSync(extDstDir, { recursive: true });

const files = [
  'ort.all.min.js',
  'ort.min.js',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs'
];

files.forEach(file => {
  const src = path.join(srcDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dstDir, file));
    fs.copyFileSync(src, path.join(extDstDir, file));
  }
});

console.log('ORT vendor files populated successfully.');
