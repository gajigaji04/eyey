import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { MEDICATION_NAMES } from './medications';

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// 이 프로젝트는 한국 사용자를 기준으로 만들어졌으므로, 서버(기본 UTC)에서도 항상 한국 표준시(KST) 기준으로 계산한다.
const TIME_ZONE = 'Asia/Seoul';

interface DoseEvent {
  id: string;
  medId: string;
  scheduledTime: string; // "HH:mm"
  status: 'pending' | 'done' | 'skipped';
  reminderNotifiedAt?: string;
  dueNotifiedAt?: string;
}

interface DayRecord {
  date: string;
  doses: DoseEvent[];
  allDoneNotifiedAt?: string;
}

interface UserSettings {
  notificationsEnabled?: boolean;
  reminderMinutesBefore?: number;
  fcmTokens?: string[];
}

function nowInKst(): { dateKey: string; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const hour = Number(get('hour')) % 24; // Intl은 자정을 "24"로 줄 수 있어 보정한다.
  const minute = Number(get('minute'));

  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + minute,
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 사용자의 등록된 모든 기기(FCM 토큰)로 알림을 보내고, 더 이상 유효하지 않은 토큰은 정리한다. */
async function sendToUser(uid: string, title: string, body: string, data: Record<string, string> = {}) {
  const userSnap = await db.collection('users').doc(uid).get();
  const user = userSnap.data() as UserSettings | undefined;
  if (!user?.notificationsEnabled || !user.fcmTokens?.length) return;

  const response = await messaging.sendEachForMulticast({
    tokens: user.fcmTokens,
    notification: { title, body },
    data,
    webpush: {
      notification: { icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' },
      fcmOptions: { link: '/' },
    },
  });

  const invalidTokens: string[] = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        invalidTokens.push(user.fcmTokens![i]);
      }
    }
  });

  if (invalidTokens.length) {
    await db
      .collection('users')
      .doc(uid)
      .update({ fcmTokens: user.fcmTokens.filter((t) => !invalidTokens.includes(t)) });
  }
}

/**
 * 1분마다 실행되어, 모든 사용자의 "오늘" 일정을 훑으며
 * - 사전 알림("N분 후 ~ 넣으세요")
 * - 정시 알림("~ 넣을 시간입니다")
 * 을 아직 안 보낸 회차에 한해 보낸다 (reminderNotifiedAt / dueNotifiedAt 플래그로 중복 방지).
 */
export const checkDoseTimes = onSchedule(
  { schedule: 'every 1 minutes', timeZone: TIME_ZONE, region: 'asia-northeast3' },
  async () => {
    const { dateKey, minutes: nowMinutes } = nowInKst();

    const daysSnap = await db.collectionGroup('days').where('date', '==', dateKey).get();
    if (daysSnap.empty) return;

    await Promise.all(
      daysSnap.docs.map(async (daySnap) => {
        const uid = daySnap.ref.parent.parent?.id;
        if (!uid) return;

        const day = daySnap.data() as DayRecord;
        const userSnap = await db.collection('users').doc(uid).get();
        const user = userSnap.data() as UserSettings | undefined;
        if (!user?.notificationsEnabled) return;

        const reminderBefore = user.reminderMinutesBefore ?? 5;
        let changed = false;

        const updatedDoses = await Promise.all(
          day.doses.map(async (dose) => {
            if (dose.status !== 'pending') return dose;

            const doseMinutes = timeToMinutes(dose.scheduledTime);
            const medName = MEDICATION_NAMES[dose.medId] ?? dose.medId;
            const next = { ...dose };

            if (
              reminderBefore > 0 &&
              !dose.reminderNotifiedAt &&
              nowMinutes >= doseMinutes - reminderBefore &&
              nowMinutes < doseMinutes
            ) {
              await sendToUser(uid, '곧 점안 시간이에요', `${reminderBefore}분 후 ${medName}을(를) 넣으세요.`, {
                doseId: dose.id,
                kind: 'reminder',
              });
              next.reminderNotifiedAt = new Date().toISOString();
              changed = true;
            }

            if (!dose.dueNotifiedAt && nowMinutes >= doseMinutes && nowMinutes < doseMinutes + 1) {
              await sendToUser(uid, '안약 넣을 시간입니다', `${medName} 넣을 시간입니다.`, {
                doseId: dose.id,
                kind: 'due',
              });
              next.dueNotifiedAt = new Date().toISOString();
              changed = true;
            }

            return next;
          })
        );

        if (changed) {
          await daySnap.ref.update({ doses: updatedDoses, updatedAt: new Date().toISOString() });
        }
      })
    );

    logger.info(`checkDoseTimes: 처리한 사용자 수 ${daysSnap.size} (${dateKey} ${nowMinutes}분)`);
  }
);

/**
 * 사용자가 완료/건너뛰기 버튼을 눌러 오늘 문서가 바뀔 때마다 실행된다.
 * 모든 회차가 대기 상태를 벗어났다면(완료 또는 건너뜀) "오늘 안약을 모두 완료했습니다" 알림을 한 번만 보낸다.
 */
export const onDayRecordWritten = onDocumentWritten('users/{uid}/days/{date}', async (event) => {
  const after = event.data?.after?.data() as DayRecord | undefined;
  if (!after || after.allDoneNotifiedAt) return;
  if (after.doses.length === 0) return;

  const allDone = after.doses.every((d) => d.status !== 'pending');
  if (!allDone) return;

  const uid = event.params.uid as string;
  await sendToUser(uid, '오늘 안약을 모두 완료했습니다', '수고하셨어요! 내일도 잊지 말고 챙겨주세요.', {
    kind: 'all-done',
  });
  await event.data!.after!.ref.update({ allDoneNotifiedAt: new Date().toISOString() });
});
