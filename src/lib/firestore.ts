import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateDaySchedule } from './scheduleGenerator';
import { DayRecord, DoseEvent, UserSettings } from '@/types';
import { DEFAULT_PREFS } from '@/types';
import { todayKey } from './dateUtils';

const userDoc = (uid: string) => doc(db, 'users', uid);
const daysCol = (uid: string) => collection(db, 'users', uid, 'days');
const dayDoc = (uid: string, date: string) => doc(db, 'users', uid, 'days', date);

/** 최초 로그인 시 사용자 설정 문서를 만들거나, 있으면 그대로 가져온다. */
export async function getOrCreateUserSettings(uid: string): Promise<UserSettings> {
  const ref = userDoc(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserSettings;

  const initial: UserSettings = {
    prefs: DEFAULT_PREFS,
    notificationsEnabled: false,
    reminderMinutesBefore: 5,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, initial);
  return initial;
}

export async function saveUserPrefs(uid: string, prefs: UserSettings['prefs']) {
  await updateDoc(userDoc(uid), { prefs });
}

export async function setNotificationsEnabled(uid: string, enabled: boolean) {
  await updateDoc(userDoc(uid), { notificationsEnabled: enabled });
}

export async function setReminderMinutesBefore(uid: string, minutes: number) {
  await updateDoc(userDoc(uid), { reminderMinutesBefore: minutes });
}

/** FCM 토큰은 여러 기기(웹/모바일)에서 각각 등록될 수 있으므로 배열에 누적한다. */
export async function saveFcmToken(uid: string, token: string) {
  await updateDoc(userDoc(uid), { fcmTokens: arrayUnion(token) });
}

/**
 * 오늘(또는 지정한 날짜)의 일정을 가져온다.
 * 문서가 없으면 사용자 설정을 기준으로 새로 생성해서 저장한다 (하루가 바뀌면 자동 초기화되는 효과).
 */
export async function getOrCreateDayRecord(uid: string, date: string, prefs = DEFAULT_PREFS): Promise<DayRecord> {
  const ref = dayDoc(uid, date);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as DayRecord;

  const now = new Date().toISOString();
  const record: DayRecord = {
    date,
    prefsSnapshot: prefs,
    doses: generateDaySchedule(prefs),
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, record);
  return record;
}

export async function getDayRecord(uid: string, date: string): Promise<DayRecord | null> {
  const snap = await getDoc(dayDoc(uid, date));
  return snap.exists() ? (snap.data() as DayRecord) : null;
}

/**
 * 지정한 날짜의 일정을 새 설정 기준으로 강제로 다시 만든다.
 * 이미 완료/건너뛰기 처리한 기록은 사라지므로, 보통 "오늘 설정을 지금 바로 적용하고 싶을 때"만 사용한다.
 */
export async function regenerateDayRecord(uid: string, date: string, prefs = DEFAULT_PREFS): Promise<DayRecord> {
  const now = new Date().toISOString();
  const record: DayRecord = {
    date,
    prefsSnapshot: prefs,
    doses: generateDaySchedule(prefs),
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(dayDoc(uid, date), record);
  return record;
}

/** 특정 회차(dose)의 상태를 완료/건너뛰기/대기로 갱신한다. */
export async function updateDoseStatus(
  uid: string,
  date: string,
  doseId: string,
  status: DoseEvent['status']
): Promise<DoseEvent[]> {
  const ref = dayDoc(uid, date);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('일정 문서를 찾을 수 없습니다.');

  const record = snap.data() as DayRecord;
  const doses = record.doses.map((d) =>
    d.id === doseId
      ? { ...d, status, completedAt: status === 'pending' ? undefined : new Date().toISOString() }
      : d
  );

  await updateDoc(ref, { doses, updatedAt: new Date().toISOString() });
  return doses;
}

/** 달력/주간/월간 통계용으로 날짜 범위의 기록을 모두 가져온다. */
export async function getDayRecordsInRange(uid: string, startDate: string, endDate: string): Promise<DayRecord[]> {
  const q = query(daysCol(uid), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date', 'asc'));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => d.data() as DayRecord);
}

/** 오늘 이전 기록들을 최신순으로 최대 N개 가져온다 (연속 성공일 계산용). */
export async function getRecentDayRecords(uid: string, max = 90): Promise<DayRecord[]> {
  const q = query(daysCol(uid), orderBy('date', 'desc'), limit(max));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => d.data() as DayRecord);
}

export { todayKey };
