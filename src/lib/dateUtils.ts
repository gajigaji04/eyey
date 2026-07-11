/**
 * "HH:mm" 문자열을 자정 기준 분(minute)으로 변환한다.
 * "24:00"처럼 시(hour)가 24 이상인 값도 허용해 "자정을 넘긴 시각"을 표현할 수 있게 한다.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 분(minute)을 "HH:mm" 문자열로 변환한다. 24시간을 넘기면 다음날로 넘어간 것으로 보고 24로 나눈 나머지를 쓴다. */
export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 취침 시각이 기상 시각보다 이르거나 같으면(예: 새벽 1시 취침) 다음날로 취급해 분을 보정한다. */
export function resolveSleepMinutes(wakeMinutes: number, sleepMinutes: number): number {
  return sleepMinutes <= wakeMinutes ? sleepMinutes + 1440 : sleepMinutes;
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateKey(d: Date): string {
  return todayKey(d);
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

/** 밀리초 차이를 "1시간 23분" 같은 사람이 읽기 쉬운 문자열로 변환한다. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '지금';
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}
