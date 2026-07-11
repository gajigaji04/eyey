// 외부 이미지 라이브러리 없이, Node 내장 zlib만으로 PWA 아이콘 PNG를 직접 만든다.
// "물방울(안약) + 파란 배경" 모양의 아주 단순한 아이콘을 그린 뒤 raw PNG 바이트를 조립해서 저장한다.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BRAND = [0x2f, 0x7f, 0xf5]; // #2f7ff5
const WHITE = [0xff, 0xff, 0xff];

function createCanvas(size) {
  // RGBA 버퍼
  return new Uint8ClampedArray(size * size * 4);
}

function setPixel(buf, size, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

function fill(buf, size, color) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) setPixel(buf, size, x, y, color);
  }
}

/** 안티에일리어싱 없이 단순 원(디스크)을 그린다. */
function drawCircle(buf, size, cx, cy, r, color) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(buf, size, x, y, color);
    }
  }
}

/** 물방울 모양: 위쪽은 뾰족하고 아래쪽은 둥근 형태를, 원 + 삼각형 조합으로 근사한다. */
function drawDroplet(buf, size, cx, topY, height, color) {
  const bottomR = height * 0.32;
  const bottomCy = topY + height - bottomR;
  // 몸통(삼각형에 가까운 위쪽 부분)을 스캔라인으로 채운다.
  for (let y = topY; y < bottomCy; y++) {
    const t = (y - topY) / (bottomCy - topY); // 0(꼭대기) ~ 1(원과 만나는 지점)
    const halfWidth = bottomR * t;
    for (let x = Math.floor(cx - halfWidth); x <= Math.ceil(cx + halfWidth); x++) {
      setPixel(buf, size, x, y, color);
    }
  }
  drawCircle(buf, size, cx, bottomCy, bottomR, color);
}

function toPng(buf, size) {
  // 각 스캔라인 앞에 필터 타입 바이트(0)를 붙인 raw 데이터를 만든다.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < size * 4; x++) {
      raw[rowStart + 1 + x] = buf[y * size * 4 + x];
    }
  }

  const idat = zlib.deflateSync(raw);

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

let crcTable;
function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}
function crc32(buf) {
  if (!crcTable) crcTable = makeCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildIcon(size, { maskable }) {
  const buf = createCanvas(size);
  fill(buf, size, BRAND);

  // maskable 아이콘은 원형으로 잘려도 내용이 잘리지 않도록 중앙에 더 작게 그린다 (안전 영역 약 80%).
  const scale = maskable ? 0.62 : 0.86;
  const dropHeight = size * scale;
  const topY = (size - dropHeight) / 2;
  drawDroplet(buf, size, size / 2, topY, dropHeight, WHITE);

  return toPng(buf, size);
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
];

targets.forEach(({ name, size, maskable }) => {
  const png = buildIcon(size, { maskable });
  fs.writeFileSync(path.join(OUT_DIR, name), png);
  console.log(`[eyes-alarm] ${name} 생성 완료 (${size}x${size})`);
});
