// .env.local 에 있는 NEXT_PUBLIC_FIREBASE_* 값을 읽어서
// public/firebase-messaging-sw.template.js 의 자리표시자를 채운 뒤 public/firebase-messaging-sw.js 로 저장한다.
// 서비스워커는 브라우저에서 곧바로 정적 파일로 로드되기 때문에 Next.js의 process.env 치환을 받을 수 없어서
// 빌드/개발 시작 전에 이 스크립트로 값을 직접 박아 넣는다.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env.local');
const TEMPLATE_PATH = path.join(ROOT, 'public', 'firebase-messaging-sw.template.js');
const OUTPUT_PATH = path.join(ROOT, 'public', 'firebase-messaging-sw.js');

const KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    env[key] = value;
  });
  return env;
}

const env = { ...parseEnvFile(ENV_PATH), ...process.env };
let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

KEYS.forEach((key) => {
  const value = env[key] || '';
  template = template.split(`__${key}__`).join(value);
});

fs.writeFileSync(OUTPUT_PATH, template);

const missing = KEYS.filter((key) => !env[key]);
if (missing.length) {
  console.warn(
    `[eyes-alarm] .env.local 에 다음 값이 비어 있어 firebase-messaging-sw.js 가 완전하지 않습니다: ${missing.join(', ')}`
  );
} else {
  console.log('[eyes-alarm] firebase-messaging-sw.js 생성 완료');
}
