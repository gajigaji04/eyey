// One-off icon generator: writes plain PNG bytes using only Node's built-in
// zlib (no image libraries). Run manually with `node scripts/generate-icons.cjs`
// whenever the icon design needs to change; the output PNGs are committed.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function lerp(a, b, t) {
  return [0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t);
}

function insideDrop(x, y, R) {
  // teardrop = circle bulb ∪ triangle point, in coords relative to icon center
  const bulbCx = 0, bulbCy = R * 0.35;
  const dx = x - bulbCx, dy = y - bulbCy;
  if (dx * dx + dy * dy <= R * R) return true;
  // triangle: apex above, shoulders where it meets the bulb
  const apex = [0, -R * 1.7];
  const left = [-R * 0.92, bulbCy - R * 0.1];
  const right = [R * 0.92, bulbCy - R * 0.1];
  return pointInTriangle([x, y], apex, left, right);
}

function sign(p1, p2, p3) {
  return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
}

function pointInTriangle(pt, v1, v2, v3) {
  const d1 = sign(pt, v1, v2);
  const d2 = sign(pt, v2, v3);
  const d3 = sign(pt, v3, v1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function renderIcon(size, { maskable }) {
  const SS = 4; // supersample factor for smooth edges
  const hi = size * SS;
  const cx = hi / 2, cy = hi / 2;
  const bgRadius = maskable ? hi * 0.5 : hi * 0.47;
  const dropR = maskable ? hi * 0.19 : hi * 0.22;
  const bgTop = [37, 99, 235, 255]; // #2563eb
  const bgBottom = [29, 78, 216, 255]; // #1d4ed8

  const big = Buffer.alloc(hi * hi * 4);
  for (let y = 0; y < hi; y++) {
    const bgColor = lerp(bgTop, bgBottom, y / hi);
    for (let x = 0; x < hi; x++) {
      const idx = (y * hi + x) * 4;
      const dx = x - cx, dy = y - cy;
      const inCircle = maskable || dx * dx + dy * dy <= bgRadius * bgRadius;
      let r = 0, g = 0, b = 0, a = 0;
      if (inCircle) {
        [r, g, b, a] = bgColor;
        if (insideDrop(dx, dy, dropR)) {
          r = 255; g = 255; b = 255; a = 255;
        }
      }
      big[idx] = r; big[idx + 1] = g; big[idx + 2] = b; big[idx + 3] = a;
    }
  }

  // downsample by averaging SSxSS blocks
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const idx = ((y * SS + sy) * hi + (x * SS + sx)) * 4;
          r += big[idx]; g += big[idx + 1]; b += big[idx + 2]; a += big[idx + 3];
        }
      }
      const n = SS * SS;
      const outIdx = (y * size + x) * 4;
      out[outIdx] = Math.round(r / n);
      out[outIdx + 1] = Math.round(g / n);
      out[outIdx + 2] = Math.round(b / n);
      out[outIdx + 3] = Math.round(a / n);
    }
  }
  return out;
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { size: 192, maskable: false, file: 'icon-192.png' },
  { size: 512, maskable: false, file: 'icon-512.png' },
  { size: 192, maskable: true, file: 'icon-192-maskable.png' },
  { size: 512, maskable: true, file: 'icon-512-maskable.png' },
];

for (const t of targets) {
  const rgba = renderIcon(t.size, { maskable: t.maskable });
  const png = encodePNG(t.size, t.size, rgba);
  fs.writeFileSync(path.join(outDir, t.file), png);
  console.log('wrote', t.file);
}
