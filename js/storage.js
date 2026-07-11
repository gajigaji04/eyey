// All persistence lives in localStorage. No server, no database.
const KEYS = {
  medications: 'eyesAlarm.medications',
  pattern: 'eyesAlarm.pattern',
  completions: 'eyesAlarm.completions',
  notified: 'eyesAlarm.notified',
};

// Native <input type="time"> only accepts 00:00-23:59, so bedtime is stored
// as 23:59 rather than the colloquial "24:00" (same instant, for our purposes).
const DEFAULT_PATTERN = { wake: '08:00', lunch: '13:00', dinner: '19:00', sleep: '23:59' };

// type 'fixed'  -> slots picked from wake/lunch/dinner/sleep
// type 'interval' -> every intervalHours, intervalCount times/day starting at wake
const DEFAULT_MEDICATIONS = [
  { id: 'moxian', name: '목시아인', enabled: true, type: 'fixed', slots: ['wake', 'lunch', 'dinner', 'sleep'] },
  { id: 'lotemax', name: '로테맥스', enabled: true, type: 'interval', intervalHours: 3, intervalCount: 6 },
  { id: 'dicus', name: '디쿠스', enabled: true, type: 'interval', intervalHours: 3, intervalCount: 6 },
  { id: 'cicaplast', name: '시카플루이드겔', enabled: true, type: 'fixed', slots: ['wake', 'lunch', 'dinner', 'sleep'] },
  { id: 'serum', name: '혈청', enabled: true, type: 'interval', intervalHours: 1, intervalCount: 16 },
];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function genId() {
  return 'med_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getMedications() {
  let meds = readJSON(KEYS.medications, null);
  if (!meds) {
    meds = DEFAULT_MEDICATIONS;
    writeJSON(KEYS.medications, meds);
  }
  return meds;
}

function saveMedications(meds) {
  writeJSON(KEYS.medications, meds);
}

function getPattern() {
  let pattern = readJSON(KEYS.pattern, null);
  if (!pattern) {
    pattern = { ...DEFAULT_PATTERN };
    writeJSON(KEYS.pattern, pattern);
  }
  return pattern;
}

function savePattern(pattern) {
  writeJSON(KEYS.pattern, pattern);
}

// completions/notified are pruned to today only — this app has no history/calendar view.
function getCompletionsToday() {
  const all = readJSON(KEYS.completions, {});
  const today = todayStr();
  if (Object.keys(all).length && !(today in all)) {
    writeJSON(KEYS.completions, { [today]: {} });
    return {};
  }
  return all[today] || {};
}

function setCompletion(doseKey, done) {
  const today = todayStr();
  const today_map = getCompletionsToday();
  if (done) today_map[doseKey] = Date.now();
  else delete today_map[doseKey];
  writeJSON(KEYS.completions, { [today]: today_map });
}

function getNotifiedToday() {
  const all = readJSON(KEYS.notified, {});
  const today = todayStr();
  if (Object.keys(all).length && !(today in all)) {
    writeJSON(KEYS.notified, { [today]: [] });
    return [];
  }
  return all[today] || [];
}

function markNotified(doseKey) {
  const today = todayStr();
  const list = getNotifiedToday();
  if (!list.includes(doseKey)) list.push(doseKey);
  writeJSON(KEYS.notified, { [today]: list });
}
