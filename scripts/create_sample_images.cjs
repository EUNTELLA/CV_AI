const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG writer in pure Node.js
function createPNG(width, height, getPixelRGB) {
  // Each scanline: 1 byte filter type (0) + width * 3 bytes (RGB)
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixelRGB(x, y);
      const pixelOffset = rowOffset + 1 + x * 3;
      rawData[pixelOffset] = Math.min(255, Math.max(0, Math.round(r)));
      rawData[pixelOffset + 1] = Math.min(255, Math.max(0, Math.round(g)));
      rawData[pixelOffset + 2] = Math.min(255, Math.max(0, Math.round(b)));
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 2; // color type 2 (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

const outDir = path.join(__dirname, '..', 'public', 'samples');
fs.mkdirSync(outDir, { recursive: true });

const W = 224, H = 224;

// 1. Blocked: Scooter parked directly across yellow tactile paving
const blockedPNG = createPNG(W, H, (x, y) => {
  // Base yellow tactile paving on sidewalk
  const isYellowZone = (y > 35 && y < 190 && x > 25 && x < 200);
  let r = 135 + ((x * 7 + y * 13) % 15);
  let g = 135 + ((x * 7 + y * 13) % 15);
  let b = 135 + ((x * 7 + y * 13) % 15);

  if (isYellowZone) {
    // Tactile dot grid
    const dotX = (x - 25) % 24;
    const dotY = (y - 35) % 24;
    const isDot = (dotX - 12) ** 2 + (dotY - 12) ** 2 < 36;
    if (isDot) {
      r = 255; g = 225; b = 15;
    } else {
      r = 238; g = 205; b = 28;
    }
  }

  // Scooter stem and footboard across the center
  const isScooterStem = (x >= 106 && x <= 118 && y >= 30 && y <= 180);
  const isFootboard = (x >= 85 && x <= 139 && y >= 145 && y <= 175);
  const isWheel = ((x - 112) ** 2 + (y - 180) ** 2 < 120);

  if (isScooterStem || isFootboard || isWheel) {
    r = 25; g = 30; b = 35; // Matte dark scooter chassis
  }

  return [r, g, b];
});

// 2. Near: Scooter parked 10cm alongside yellow tactile paving
const nearPNG = createPNG(W, H, (x, y) => {
  // Yellow tactile stripe on the left (x < 65)
  const isYellowZone = (x < 65);
  let r = 138 + ((x * 5 + y * 11) % 12);
  let g = 138 + ((x * 5 + y * 11) % 12);
  let b = 138 + ((x * 5 + y * 11) % 12);

  if (isYellowZone) {
    const isStripe = (x % 16 < 8);
    r = isStripe ? 250 : 235;
    g = isStripe ? 220 : 200;
    b = 25;
  }

  // Scooter parked on the right side (x: 130 ~ 170)
  const isScooterStem = (x >= 140 && x <= 152 && y >= 40 && y <= 180);
  const isFootboard = (x >= 120 && x <= 172 && y >= 148 && y <= 176);
  const isWheel = ((x - 146) ** 2 + (y - 180) ** 2 < 110);

  if (isScooterStem || isFootboard || isWheel) {
    r = 30; g = 35; b = 40;
  }

  return [r, g, b];
});

// 3. Safe: Scooter parked neatly in designated parking bay (white border on dark asphalt, no yellow)
const safePNG = createPNG(W, H, (x, y) => {
  // Dark sidewalk asphalt
  let r = 115 + ((x * 3 + y * 5) % 10);
  let g = 115 + ((x * 3 + y * 5) % 10);
  let b = 120 + ((x * 3 + y * 5) % 10);

  // White scooter parking bay rectangle border
  const isBorder = (x >= 25 && x <= 199 && (y >= 40 && y <= 46 || y >= 195 && y <= 201)) ||
                   (y >= 40 && y <= 201 && (x >= 25 && x <= 31 || x >= 193 && x <= 199));
  if (isBorder) {
    r = 245; g = 245; b = 250;
  }

  // Scooter centered in the parking box
  const isScooterStem = (x >= 106 && x <= 118 && y >= 40 && y <= 175);
  const isFootboard = (x >= 85 && x <= 139 && y >= 140 && y <= 170);
  const isWheel = ((x - 112) ** 2 + (y - 175) ** 2 < 120);

  if (isScooterStem || isFootboard || isWheel) {
    r = 20; g = 25; b = 30;
  }

  return [r, g, b];
});

// 4. Unclear: Dark ambient, blurry angle, needs retake
const unclearPNG = createPNG(W, H, (x, y) => {
  // Dim evening lighting, low contrast
  let r = 60 + Math.sin(x * 0.05) * 15;
  let g = 65 + Math.sin(y * 0.05) * 15;
  let b = 70;

  // Distant or partial scooter shape
  if (x > 130 && x < 155 && y > 100 && y < 190) {
    r = 45; g = 48; b = 52;
  }

  return [r, g, b];
});

fs.writeFileSync(path.join(outDir, 'blocked.png'), blockedPNG);
fs.writeFileSync(path.join(outDir, 'near.png'), nearPNG);
fs.writeFileSync(path.join(outDir, 'safe.png'), safePNG);
fs.writeFileSync(path.join(outDir, 'unclear.png'), unclearPNG);

console.log('Successfully generated sample PNG images in', outDir);
