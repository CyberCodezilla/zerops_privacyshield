const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Simple zip file builder in pure Node.js (no external deps)
function createZip(sourceDir, outputFile) {
  const files = [];

  function readDirRecursive(dir, base) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const relPath = path.join(base, file).replace(/\\/g, '/');
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        readDirRecursive(filePath, relPath);
      } else {
        files.push({ relPath, data: fs.readFileSync(filePath) });
      }
    });
  }

  readDirRecursive(sourceDir, '');

  const localHeaders = [];
  const cdHeaders = [];
  let offset = 0;

  files.forEach(f => {
    const nameBuffer = Buffer.from(f.relPath, 'utf8');
    const crc = crc32(f.data);
    const size = f.data.length;

    // Local file header
    const lh = Buffer.alloc(30 + nameBuffer.length);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4); // version needed
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(0, 8); // compression: 0 (store)
    lh.writeUInt16LE(0, 10); // time
    lh.writeUInt16LE(0, 12); // date
    lh.writeUInt32LE(crc, 14); // crc32
    lh.writeUInt32LE(size, 18); // compressed size
    lh.writeUInt32LE(size, 22); // uncompressed size
    lh.writeUInt16LE(nameBuffer.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBuffer.copy(lh, 30);

    localHeaders.push(lh);
    localHeaders.push(f.data);

    // Central directory header
    const cd = Buffer.alloc(46 + nameBuffer.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(nameBuffer.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt32LE(0, 36);
    cd.writeUInt32LE(offset, 42);
    nameBuffer.copy(cd, 46);

    cdHeaders.push(cd);
    offset += lh.length + f.data.length;
  });

  const cdBuffer = Buffer.concat(cdHeaders);
  const cdOffset = offset;
  const cdSize = cdBuffer.length;

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  const finalZip = Buffer.concat([...localHeaders, cdBuffer, eocd]);
  fs.writeFileSync(outputFile, finalZip);
  console.log(`Created ${outputFile} (${finalZip.length} bytes)`);
}

// CRC32 Helper
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const source = path.join(__dirname, 'apps', 'extension');
const target = path.join(__dirname, 'public', 'privacy-shield-extension.zip');
createZip(source, target);
