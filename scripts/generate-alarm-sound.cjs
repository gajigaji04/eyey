// One-off WAV generator: synthesizes a loud, attention-grabbing 3-beep alarm
// tone as raw PCM16 mono, using only Node built-ins (no audio libraries).
// Run with `node scripts/generate-alarm-sound.cjs` if the tone needs to change.
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const BEEP_FREQ_HZ = 1046.5; // C6 - clear, cuts through ambient noise
const BEEP_MS = 220;
const GAP_MS = 130;
const BEEP_COUNT = 3;
const AMPLITUDE = 0.85 * 32767;
const FADE_SAMPLES = Math.round(SAMPLE_RATE * 0.01); // 10ms fade in/out, avoids clicks

function synthesize() {
  const beepSamples = Math.round((SAMPLE_RATE * BEEP_MS) / 1000);
  const gapSamples = Math.round((SAMPLE_RATE * GAP_MS) / 1000);
  const totalSamples = BEEP_COUNT * beepSamples + (BEEP_COUNT - 1) * gapSamples;
  const samples = new Int16Array(totalSamples);

  let cursor = 0;
  for (let b = 0; b < BEEP_COUNT; b++) {
    for (let i = 0; i < beepSamples; i++) {
      const t = i / SAMPLE_RATE;
      let envelope = 1;
      if (i < FADE_SAMPLES) envelope = i / FADE_SAMPLES;
      else if (i > beepSamples - FADE_SAMPLES) envelope = (beepSamples - i) / FADE_SAMPLES;
      samples[cursor++] = Math.round(AMPLITUDE * envelope * Math.sin(2 * Math.PI * BEEP_FREQ_HZ * t));
    }
    if (b < BEEP_COUNT - 1) cursor += gapSamples; // silence, already zero-filled
  }
  return samples;
}

function encodeWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buffer;
}

const wav = encodeWav(synthesize());

const outPaths = [
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'raw', 'alarm_sound.wav'),
  path.join(__dirname, '..', 'www', 'audio', 'alarm.wav'),
];
for (const outPath of outPaths) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, wav);
  console.log('wrote', outPath, `(${wav.length} bytes)`);
}
