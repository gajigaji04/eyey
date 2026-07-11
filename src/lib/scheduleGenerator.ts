import { DoseEvent, MedicationId, UserSchedulePrefs } from '@/types';
import { MEDICATIONS, MIN_GAP_MINUTES } from './medications';
import { minutesToTime, resolveSleepMinutes, timeToMinutes } from './dateUtils';

interface RawEvent {
  medId: MedicationId;
  occurrence: number; // 같은 약 안에서의 순번 (0부터) - 재생성해도 안정적인 id를 만들기 위함
  desiredMinutes: number; // 자정 기준 절대 분. 취침이 자정을 넘기면 1440 이상이 될 수 있다.
}

function buildAnchorMinutes(prefs: UserSchedulePrefs) {
  const wake = timeToMinutes(prefs.wakeTime);
  const lunch = timeToMinutes(prefs.lunchTime);
  const dinner = timeToMinutes(prefs.dinnerTime);
  const sleep = resolveSleepMinutes(wake, timeToMinutes(prefs.sleepTime));
  return { wake, lunch, dinner, sleep };
}

/** 안약 규칙(anchor/interval)에 따라 "충돌 재배치 전" 원하는 시각들을 모두 나열한다. */
function generateRawEvents(prefs: UserSchedulePrefs): RawEvent[] {
  const { wake, lunch, dinner, sleep } = buildAnchorMinutes(prefs);
  const events: RawEvent[] = [];

  // 목시아인 / 시카플루이드겔: 기상·점심·저녁·취침 전, 하루 4회 고정
  (['moxi', 'cica'] as MedicationId[]).forEach((medId) => {
    [wake, lunch, dinner, sleep].forEach((t, occurrence) => {
      events.push({ medId, occurrence, desiredMinutes: t });
    });
  });

  // 로테맥스 / 디쿠스: 기상 시각부터 3시간마다, 취침 전까지
  // 혈청: 기상 시각부터 1시간마다, 취침 전까지
  (['lotemax', 'dequs', 'serum'] as MedicationId[]).forEach((medId) => {
    const interval = MEDICATIONS[medId].intervalMinutes!;
    let occurrence = 0;
    for (let t = wake; t < sleep; t += interval) {
      events.push({ medId, occurrence, desiredMinutes: t });
      occurrence += 1;
    }
  });

  return events;
}

/**
 * 하루치 안약 일정을 생성한다.
 *
 * 1) 각 안약의 규칙대로 "원래 넣고 싶은 시각"을 전부 나열한다.
 * 2) 시각 순으로 정렬하고, 시각이 같으면 안약 우선순위(MEDICATIONS[].priority)로 정렬한다.
 *    (혈청 → 목시아인 → 시카플루이드겔 → 로테맥스 → 디쿠스 순)
 * 3) 맨 앞부터 훑으면서, 직전에 배치된 시각 + 5분보다 이르면 그만큼 뒤로 민다.
 *    이렇게 하면 서로 다른 안약이 같은 시각이나 5분 이내로 절대 겹치지 않는다.
 *
 * 예) 기상 08:00, wake 기준 3시간 간격(로테맥스) · 1시간 간격(혈청) 시작점이 겹치면
 *     09:00 혈청 → 09:05 목시아인 → 09:10 시카플루이드겔 → 09:15 로테맥스 → 09:20 디쿠스
 *     와 같이 자동으로 재배치된다.
 */
export function generateDaySchedule(prefs: UserSchedulePrefs): DoseEvent[] {
  const raw = generateRawEvents(prefs);

  raw.sort((a, b) => {
    if (a.desiredMinutes !== b.desiredMinutes) return a.desiredMinutes - b.desiredMinutes;
    return MEDICATIONS[a.medId].priority - MEDICATIONS[b.medId].priority;
  });

  let cursor = -Infinity;
  return raw.map((event, index) => {
    const assigned = Math.max(event.desiredMinutes, cursor + MIN_GAP_MINUTES);
    cursor = assigned;

    return {
      id: `${event.medId}-${event.occurrence}`,
      medId: event.medId,
      order: index,
      scheduledTime: minutesToTime(assigned),
      originalTime: minutesToTime(event.desiredMinutes),
      wasShifted: assigned !== event.desiredMinutes,
      status: 'pending',
    } satisfies DoseEvent;
  });
}
