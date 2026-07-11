/**
 * 안약 종류 식별자. Firestore 문서/컬렉션 키로도 그대로 사용된다.
 */
export type MedicationId = 'moxi' | 'lotemax' | 'dequs' | 'cica' | 'serum';

/** 안약 하나에 대한 정적 메타데이터 (색상, 이름, 배치 규칙 등) */
export interface MedicationDef {
  id: MedicationId;
  name: string; // 화면에 표시할 한글 이름
  shortDesc: string; // "흰색 뚜껑" 같은 부제
  color: string; // tailwind 색상 클래스에 대응하는 hex
  textOnColor: 'dark' | 'light'; // 색상 위에 올릴 글자색 대비
  rule: 'anchor' | 'interval'; // anchor: 기상/점심/저녁/취침 4회, interval: N시간마다
  intervalMinutes?: number; // rule === 'interval' 일 때 간격(분)
  dailyCount: number; // 하루 총 횟수(참고용 표시)
  priority: number; // 같은 시각 충돌 시 정렬 우선순위(낮을수록 먼저 배치)
}

/** 사용자가 설정할 수 있는 하루 생활 패턴 (분 단위 HH:mm 문자열로 저장) */
export interface UserSchedulePrefs {
  wakeTime: string; // "08:00"
  lunchTime: string; // "13:00"
  dinnerTime: string; // "19:00"
  sleepTime: string; // "00:00" (자정). <input type="time">과 호환되도록 24:00 대신 00:00으로 표기하고,
  // resolveSleepMinutes()가 기상 시각보다 이르거나 같은 취침 시각을 "다음날"로 자동 보정한다.
}

export const DEFAULT_PREFS: UserSchedulePrefs = {
  wakeTime: '08:00',
  lunchTime: '13:00',
  dinnerTime: '19:00',
  sleepTime: '00:00',
};

/** 하루 일정에서 실제로 배치된 투약 1건 */
export interface DoseEvent {
  id: string; // `${medId}-${index}` 형태의 안정적인 키
  medId: MedicationId;
  order: number; // 하루 중 전체 순번(정렬용)
  scheduledTime: string; // 재배치가 끝난 최종 시각 "HH:mm"
  originalTime: string; // 충돌 재배치 전 원래 의도했던 시각 "HH:mm"
  wasShifted: boolean; // originalTime과 다르면 true
  status: 'pending' | 'done' | 'skipped';
  completedAt?: string; // ISO 문자열, 완료/건너뛰기 처리 시각
  // 아래 두 필드는 Cloud Functions(functions/src/index.ts)가 중복 알림 방지를 위해 서버에서만 기록한다.
  reminderNotifiedAt?: string;
  dueNotifiedAt?: string;
}

/** Firestore에 저장되는 하루 문서 */
export interface DayRecord {
  date: string; // "YYYY-MM-DD"
  prefsSnapshot: UserSchedulePrefs; // 그날 일정 생성에 쓰인 설정 스냅샷
  doses: DoseEvent[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  allDoneNotifiedAt?: string; // "오늘 안약을 모두 완료했습니다" 알림 중복 방지용 (Cloud Functions가 기록)
}

/** Firestore users/{uid} 문서 */
export interface UserSettings {
  prefs: UserSchedulePrefs;
  fcmTokens?: string[]; // 여러 기기에서 알림을 받을 수 있도록 배열로 저장
  notificationsEnabled: boolean;
  reminderMinutesBefore: number; // "5분 후 ~ 넣으세요" 사전 알림 시간
  createdAt: string;
}

export interface DailyStat {
  date: string;
  total: number;
  done: number;
  skipped: number;
  rate: number; // 0~100
}
