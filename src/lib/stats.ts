import { DailyStat, DayRecord } from '@/types';

/** 하루 기록 하나를 완료율 통계로 요약한다. */
export function summarizeDay(record: DayRecord): DailyStat {
  const total = record.doses.length;
  const done = record.doses.filter((d) => d.status === 'done').length;
  const skipped = record.doses.filter((d) => d.status === 'skipped').length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  return { date: record.date, total, done, skipped, rate };
}

export function summarizeDays(records: DayRecord[]): DailyStat[] {
  return records.map(summarizeDay).sort((a, b) => a.date.localeCompare(b.date));
}

/** 여러 날 기록의 평균 완료율(%) */
export function averageRate(stats: DailyStat[]): number {
  if (stats.length === 0) return 0;
  const sum = stats.reduce((acc, s) => acc + s.rate, 0);
  return Math.round(sum / stats.length);
}

/**
 * 오늘(또는 최신 날짜)부터 과거로 거슬러 올라가며 "완료율 100%"인 날이 며칠 연속인지 센다.
 * records는 date desc(최신순) 정렬이어야 한다.
 */
export function calcStreak(recordsDesc: DayRecord[]): number {
  let streak = 0;
  for (const record of recordsDesc) {
    const { rate, total } = summarizeDay(record);
    if (total > 0 && rate === 100) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}
