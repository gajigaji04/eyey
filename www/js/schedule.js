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

function minutesOfDay(timestamp) {
  const d = new Date(timestamp);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

// Raw (pre-conflict-resolution) dose times for one day. `completions` (doseKey
// -> actual-completion timestamp) lets interval doses rebase: once a dose is
// actually marked done, later occurrences of that medication chain forward
// from the real time it was taken instead of the original fixed grid.
function generateRawDoses(medications, pattern, completions) {
  const raw = [];
  const wakeMin = parseTimeToMinutes(pattern.wake);
  const sleepMin = parseTimeToMinutes(pattern.sleep);
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
      const hours = Math.max(0.5, Number(med.intervalHours) || 1);
      const count = Math.max(1, Math.floor(Number(med.intervalCount) || 1));
      let anchor = wakeMin;
      // Never schedule an interval dose overnight, between bedtime and wake.
      for (let k = 0; k < count && anchor <= sleepMin; k++) {
        const doseKey = `${med.id}_${k}`;
        const plannedMinutes = Math.round(anchor);
        raw.push({ medId: med.id, name: med.name, doseKey, minutes: plannedMinutes, medIndex });
        const completedAt = completions && completions[doseKey];
        anchor = (completedAt ? minutesOfDay(completedAt) : plannedMinutes) + hours * 60;
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

function buildTodaySchedule(medications, pattern, completions) {
  return resolveConflicts(generateRawDoses(medications, pattern, completions));
}

const BREAK_WORK_MIN = 50;
const BREAK_REST_MIN = 10;
const BREAK_CYCLE_MIN = BREAK_WORK_MIN + BREAK_REST_MIN;

// Phase is derived from `startedAt` rather than stored, so it can never drift
// out of sync between renders.
function computeBreakPhase(startedAt, now) {
  const elapsedMin = (now - startedAt) / 60000;
  const cyclePos = ((elapsedMin % BREAK_CYCLE_MIN) + BREAK_CYCLE_MIN) % BREAK_CYCLE_MIN;
  const phase = cyclePos < BREAK_WORK_MIN ? 'work' : 'rest';
  const remainingMin = phase === 'work' ? BREAK_WORK_MIN - cyclePos : BREAK_CYCLE_MIN - cyclePos;
  return { phase, remainingSeconds: remainingMin * 60 };
}
