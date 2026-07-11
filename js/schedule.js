// Builds today's dose schedule from medications + daily pattern.
const DAY_MIN = 1440;
const SLOT_ORDER = ['wake', 'lunch', 'dinner', 'sleep'];
const SLOT_LABEL = { wake: '기상', lunch: '점심', dinner: '저녁', sleep: '자기 전' };

function parseTimeToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutesToTime(min) {
  const wrapped = ((min % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Raw (pre-conflict-resolution) dose times for one day.
function generateRawDoses(medications, pattern) {
  const raw = [];
  medications.forEach((med, medIndex) => {
    if (!med.enabled) return;
    if (med.type === 'fixed') {
      (med.slots || []).forEach((slot) => {
        if (!SLOT_ORDER.includes(slot)) return;
        raw.push({
          medId: med.id,
          name: med.name,
          doseKey: `${med.id}_${slot}`,
          minutes: parseTimeToMinutes(pattern[slot]),
          medIndex,
        });
      });
    } else if (med.type === 'interval') {
      const base = parseTimeToMinutes(pattern.wake);
      const hours = Math.max(0.5, Number(med.intervalHours) || 1);
      const count = Math.max(1, Math.floor(Number(med.intervalCount) || 1));
      for (let k = 0; k < count; k++) {
        let minutes = Math.round(base + k * hours * 60);
        if (minutes >= DAY_MIN) minutes = minutes % DAY_MIN;
        raw.push({
          medId: med.id,
          name: med.name,
          doseKey: `${med.id}_${k}`,
          minutes,
          medIndex,
        });
      }
    }
  });
  return raw;
}

// Same-time doses get pushed forward in 5-minute steps, in declaration order.
function resolveConflicts(rawDoses) {
  const sorted = [...rawDoses].sort((a, b) => a.minutes - b.minutes || a.medIndex - b.medIndex);
  let lastPlaced = -Infinity;
  return sorted.map((dose) => {
    const placed = dose.minutes < lastPlaced + 5 ? lastPlaced + 5 : dose.minutes;
    lastPlaced = placed;
    return {
      id: dose.doseKey,
      medId: dose.medId,
      name: dose.name,
      minutes: placed,
      time: formatMinutesToTime(placed),
    };
  });
}

function buildTodaySchedule(medications, pattern) {
  return resolveConflicts(generateRawDoses(medications, pattern));
}
