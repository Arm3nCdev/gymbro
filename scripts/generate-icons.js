import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createPng(width, height, drawFn) {
  // CRC table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  // Header chunk (IHDR)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter 0
  ihdr[12] = 0; // no interlace

  // Scanlines (filter 0 + RGBA)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter byte: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = writeChunk('IHDR', ihdr);
  const idatChunk = writeChunk('IDAT', compressed);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

// GymBro Icon Drawing function
function drawGymBro(x, y, w, h, isMaskable = false) {
  // Normalize coordinates (-1 to 1)
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const scale = isMaskable ? 0.72 : 0.88; // safe zone for maskable

  // Background: Dark luxury neutral #0f0f10
  let r = 16, g = 16, b = 18, a = 255;

  // Add subtle gradient
  const distCenter = Math.sqrt(nx * nx + ny * ny);
  if (distCenter < 1.2) {
    const tint = Math.max(0, 1 - distCenter * 0.8);
    r += Math.round(15 * tint);
    g += Math.round(20 * tint);
    b += Math.round(20 * tint);
  }

  // Draw Gym Dumbbell rotated -45 deg
  const cos = Math.cos(-Math.PI / 4);
  const sin = Math.sin(-Math.PI / 4);
  const rx = (nx * cos - ny * sin) / scale;
  const ry = (nx * sin + ny * cos) / scale;

  // Central Bar: rx in [-0.55, 0.55], ry in [-0.07, 0.07]
  if (Math.abs(rx) <= 0.55 && Math.abs(ry) <= 0.07) {
    r = 240; g = 240; b = 240; // Silver steel
  }

  // Knurling details
  if (Math.abs(rx) <= 0.15 && Math.abs(ry) <= 0.07) {
    if (Math.floor(rx * 80) % 2 === 0) {
      r = 180; g = 180; b = 180;
    }
  }

  // Inner Collars
  if ((Math.abs(rx - 0.45) <= 0.03 || Math.abs(rx + 0.45) <= 0.03) && Math.abs(ry) <= 0.14) {
    r = 160; g = 160; b = 160;
  }

  // Plate 1 (Lime green #a3e635)
  if ((Math.abs(rx - 0.53) <= 0.05 || Math.abs(rx + 0.53) <= 0.05) && Math.abs(ry) <= 0.32) {
    r = 163; g = 230; b = 53; // Lime
  }

  // Plate 2 (Outer heavy plate - Lime green with dark edge)
  if ((Math.abs(rx - 0.65) <= 0.055 || Math.abs(rx + 0.65) <= 0.055) && Math.abs(ry) <= 0.45) {
    r = 140; g = 210; b = 40; // Lime 500
    // Edge highlight
    if (Math.abs(ry) > 0.42 || Math.abs(rx - 0.65) > 0.045 || Math.abs(rx + 0.65) > 0.045) {
      r = 190; g = 242; b = 100;
    }
  }

  // Outer lock collars
  if ((Math.abs(rx - 0.73) <= 0.02 || Math.abs(rx + 0.73) <= 0.02) && Math.abs(ry) <= 0.12) {
    r = 220; g = 220; b = 220;
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. pwa-192x192.png
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, (x, y, w, h) => drawGymBro(x, y, w, h, false)));
console.log('Created pwa-192x192.png');

// 2. pwa-512x512.png
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, (x, y, w, h) => drawGymBro(x, y, w, h, false)));
console.log('Created pwa-512x512.png');

// 3. pwa-maskable-512x512.png (with padding safe-zone)
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => drawGymBro(x, y, w, h, true)));
console.log('Created pwa-maskable-512x512.png');

// 4. apple-touch-icon.png (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, (x, y, w, h) => drawGymBro(x, y, w, h, false)));
console.log('Created apple-touch-icon.png');

// 5. favicon.ico / 64x64 png
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, (x, y, w, h) => drawGymBro(x, y, w, h, false)));
console.log('Created favicon.ico');
