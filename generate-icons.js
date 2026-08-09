const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function generatePNG(width, height, r, g, b, a) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw pixel data: scanlines with filter byte 0
  const lineSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * lineSize);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineSize;
    rawData[lineOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pxOffset = lineOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crcVal = crc32(buf.slice(4, 8 + len));
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

// CRC32 implementation
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    let b = buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    c = (c >>> 8) ^ table[(c ^ b) & 0xFF];
  }
  return (c ^ (-1)) >>> 0;
}

const table = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

const iconsDir = path.join(__dirname, 'apps', 'extension', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate Green Emerald PNG icons (#10b981 -> R:16, G:185, B:129, A:255)
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), generatePNG(16, 16, 16, 185, 129, 255));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), generatePNG(48, 48, 16, 185, 129, 255));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), generatePNG(128, 128, 16, 185, 129, 255));

console.log('Successfully generated icon16.png, icon48.png, icon128.png in apps/extension/icons/');
