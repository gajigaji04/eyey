'use client';

import { useEffect, useRef } from 'react';
import { DayRecord, UserSettings } from '@/types';
import { MEDICATIONS } from '@/lib/medications';
import { timeToMinutes } from '@/lib/dateUtils';
import { showLocalNotification } from '@/lib/notifications';

/**
 * 앱(탭)이 열려 있는 동안, 각 안약의 "사전 알림"과 "정시 알림"을 브라우저 Notification API로 띄운다.
 * 실제로 앱이 완전히 닫혀 있을 때의 알림은 firebase-messaging-sw.js + Cloud Functions 스케줄러가 담당하고,
 * 이 훅은 앱이 열려 있을 때 즉각적인 로컬 피드백을 보장하기 위한 보조 장치다.
 *
 * 30초마다 현재 시각과 각 회차의 예정 시각을 비교해서, 이미 알린 회차는 다시 알리지 않도록 추적한다.
 */
export function useNotificationScheduler(today: DayRecord | null, settings: UserSettings | null) {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 날짜가 바뀌면(오늘 문서가 바뀌면) 알림 기록도 초기화한다.
    notifiedRef.current = new Set();
  }, [today?.date]);

  useEffect(() => {
    if (!today || !settings?.notificationsEnabled) return;

    const tick = () => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const reminderBefore = settings.reminderMinutesBefore ?? 5;

      const pending = today.doses.filter((d) => d.status === 'pending');

      pending.forEach((dose) => {
        const med = MEDICATIONS[dose.medId];
        const doseMinutes = timeToMinutes(dose.scheduledTime);

        const reminderKey = `${dose.id}-reminder`;
        const dueKey = `${dose.id}-due`;

        if (
          reminderBefore > 0 &&
          !notifiedRef.current.has(reminderKey) &&
          nowMinutes >= doseMinutes - reminderBefore &&
          nowMinutes < doseMinutes
        ) {
          notifiedRef.current.add(reminderKey);
          showLocalNotification(
            '곧 점안 시간이에요',
            `${reminderBefore}분 후 ${med.name}을(를) 넣으세요. (${dose.scheduledTime})`,
            reminderKey
          );
        }

        if (!notifiedRef.current.has(dueKey) && nowMinutes >= doseMinutes && nowMinutes < doseMinutes + 1) {
          notifiedRef.current.add(dueKey);
          showLocalNotification('안약 넣을 시간입니다', `${med.name} 넣을 시간입니다.`, dueKey);
        }
      });

      const allDone = today.doses.length > 0 && today.doses.every((d) => d.status !== 'pending');
      if (allDone && !notifiedRef.current.has('all-done')) {
        notifiedRef.current.add('all-done');
        showLocalNotification('오늘 안약을 모두 완료했습니다', '수고하셨어요! 내일도 잊지 말고 챙겨주세요.', 'all-done');
      }
    };

    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [today, settings]);
}
