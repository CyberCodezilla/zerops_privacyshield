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

// Copy Transformers.js vendor files
const tfSrcDir = path.join(__dirname, 'node_modules', '@xenova', 'transformers', 'dist');
const tfDstDir = path.join(__dirname, 'public', 'vendor', 'transformers');
const tfExtDstDir = path.join(__dirname, 'apps', 'extension', 'vendor', 'transformers');

if (!fs.existsSync(tfDstDir)) fs.mkdirSync(tfDstDir, { recursive: true });
if (!fs.existsSync(tfExtDstDir)) fs.mkdirSync(tfExtDstDir, { recursive: true });

if (fs.existsSync(tfSrcDir)) {
  const tfFiles = fs.readdirSync(tfSrcDir);
  tfFiles.forEach(file => {
    if (!file.endsWith('.map')) {
      const src = path.join(tfSrcDir, file);
      fs.copyFileSync(src, path.join(tfDstDir, file));
      fs.copyFileSync(src, path.join(tfExtDstDir, file));
    }
  });
}

console.log('ORT and Transformers vendor files populated successfully.');
