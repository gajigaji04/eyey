// Notification permission + firing.
//
// On the plain web (Vercel deployment): no push server exists, so alarms only
// fire via a timer while this page/tab is open and running.
//
// Inside the Capacitor native Android app: real OS alarms are pre-scheduled
// via @capacitor/local-notifications, so they fire even if the app is fully
// closed. `js/vendor/capacitor.js` + `js/vendor/capacitor-local-notifications.js`
// are the official no-bundler builds of those two packages; on the plain web
// they load harmlessly and `isNative()` just stays false.
const Notify = (() => {
  const CHANNEL_ID = 'eyesalarm-alerts';
  const BREAK_WORK_END_ID = 987654321; // reserved ids, well outside hashId()'s dose-id range
  const BREAK_REST_END_ID = 987654322;
  let swRegistration = null;
  let nativePermissionGranted = null; // null = unknown/not asked yet
  let scheduledNativeIds = [];
  let alarmAudio = null;

  function playLoudWebAlarm() {
    try {
      if (!alarmAudio) alarmAudio = new Audio('audio/alarm.wav');
      alarmAudio.currentTime = 0;
      alarmAudio.volume = 1.0;
      alarmAudio.play().catch(() => {});
    } catch (e) {
      // ignore — autoplay can be blocked before the user has interacted with the page
    }
  }

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  function localNotificationsPlugin() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  }

  // Deterministic string -> positive 31-bit int, for LocalNotifications numeric ids.
  function hashId(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h) || 1;
  }

  async function init() {
    if (isNative()) {
      const plugin = localNotificationsPlugin();
      if (plugin) {
        try {
          const status = await plugin.checkPermissions();
          nativePermissionGranted = status.display === 'granted';
        } catch (e) {
          console.warn('local notifications permission check failed', e);
        }
        try {
          // Android: a channel's sound/importance is fixed at creation time,
          // so this must run once with the loud settings baked in from the start.
          await plugin.createChannel({
            id: CHANNEL_ID,
            name: '안약 · 눈 휴식 알림',
            description: '안약 점안 및 눈 휴식 알림 (큰 소리)',
            importance: 5,
            visibility: 1,
            sound: 'alarm_sound.wav',
            vibration: true,
          });
        } catch (e) {
          // no-op on platforms without notification channels (e.g. iOS)
        }
        plugin.addListener('localNotificationActionPerformed', (action) => {
          const doseId = action.notification && action.notification.extra && action.notification.extra.doseId;
          if (doseId) {
            window.dispatchEvent(new CustomEvent('eyesalarm:complete-dose', { detail: { doseId } }));
          }
        });
      }
      return;
    }
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('./service-worker.js');
      } catch (e) {
        console.warn('service worker registration failed', e);
      }
    }
  }

  function permission() {
    if (isNative()) {
      if (nativePermissionGranted === true) return 'granted';
      if (nativePermissionGranted === false) return 'denied';
      return 'default';
    }
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  async function requestPermission() {
    if (isNative()) {
      const plugin = localNotificationsPlugin();
      if (!plugin) return 'unsupported';
      const status = await plugin.requestPermissions();
      nativePermissionGranted = status.display === 'granted';
      return permission();
    }
    if (!('Notification' in window)) return 'unsupported';
    return Notification.requestPermission();
  }

  // Web path only: called once per second by app.js for doses that just became due.
  async function fire(dose, dateStr) {
    if (isNative()) return; // native OS alarms already deliver these
    if (permission() !== 'granted') return;
    const title = `${dose.name} 넣을 시간이에요`;
    const options = {
      body: `예정 시간 ${dose.time}`,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: `${dateStr}_${dose.id}`,
      data: { doseId: dose.id, medId: dose.medId, date: dateStr, time: dose.time },
      actions: [{ action: 'complete', title: '완료 처리' }],
      requireInteraction: true,
      silent: false,
      vibrate: [300, 150, 300, 150, 300],
    };
    if (swRegistration) {
      swRegistration.showNotification(title, options);
    } else if ('Notification' in window) {
      new Notification(title, options);
    }
    playLoudWebAlarm();
  }

  // Native path only: (re)schedule real OS alarms for every not-yet-completed,
  // still-upcoming dose in today's schedule. Called whenever the schedule or
  // completion state changes. Only covers "today" — reopen the app daily so
  // tomorrow's doses get scheduled (this app has no background scheduler).
  async function syncNativeSchedule(schedule, completions) {
    if (!isNative() || permission() !== 'granted') return;
    const plugin = localNotificationsPlugin();
    if (!plugin) return;

    if (scheduledNativeIds.length) {
      await plugin.cancel({ notifications: scheduledNativeIds.map((id) => ({ id })) }).catch(() => {});
      scheduledNativeIds = [];
    }

    const now = new Date();
    const notifications = schedule
      .filter((dose) => !completions[dose.id])
      .map((dose) => {
        const at = new Date(now);
        at.setHours(Math.floor(dose.minutes / 60), dose.minutes % 60, 0, 0);
        return { dose, at };
      })
      .filter(({ at }) => at.getTime() > now.getTime())
      .map(({ dose, at }) => ({
        id: hashId(dose.id),
        title: `${dose.name} 넣을 시간이에요`,
        body: `예정 시간 ${dose.time}`,
        schedule: { at, allowWhileIdle: true },
        extra: { doseId: dose.id },
        channelId: CHANNEL_ID,
        sound: 'alarm_sound.wav',
      }));

    if (notifications.length) {
      await plugin.schedule({ notifications });
      scheduledNativeIds = notifications.map((n) => n.id);
    }
  }

  // Web path only: 50분/10분 눈 휴식 타이머의 단계 전환 알림.
  async function fireBreak(kind) {
    if (isNative()) return;
    if (permission() !== 'granted') return;
    const title = kind === 'rest' ? '50분 지났어요, 눈 좀 쉬어주세요 👀' : '휴식 끝! 다시 시작할게요';
    const options = {
      body: kind === 'rest' ? '10분간 화면에서 눈을 떼고 쉬어주세요.' : '다음 50분 타이머가 시작됐어요.',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'break-timer',
      requireInteraction: true,
      silent: false,
      vibrate: [300, 150, 300, 150, 300],
    };
    if (swRegistration) swRegistration.showNotification(title, options);
    else if ('Notification' in window) new Notification(title, options);
    playLoudWebAlarm();
  }

  // Native path only: schedules a repeating 50분-업무/10분-휴식 alarm pair
  // starting from `startedAt`. Like dose alarms, this only looks ~16 hours
  // ahead — reopen the app occasionally to keep it topped up.
  async function scheduleBreakTimerNative(startedAt) {
    if (!isNative() || permission() !== 'granted') return;
    const plugin = localNotificationsPlugin();
    if (!plugin) return;
    await cancelBreakTimerNative();

    const workEndAt = new Date(startedAt + 50 * 60000);
    const restEndAt = new Date(startedAt + 60 * 60000);
    await plugin.schedule({
      notifications: [
        {
          id: BREAK_WORK_END_ID,
          title: '50분 지났어요, 눈 좀 쉬어주세요 👀',
          body: '10분간 화면에서 눈을 떼고 쉬어주세요.',
          schedule: { at: workEndAt, every: 'hour', count: 16, allowWhileIdle: true },
          channelId: CHANNEL_ID,
          sound: 'alarm_sound.wav',
        },
        {
          id: BREAK_REST_END_ID,
          title: '휴식 끝! 다시 시작할게요',
          body: '다음 50분 타이머가 시작됐어요.',
          schedule: { at: restEndAt, every: 'hour', count: 16, allowWhileIdle: true },
          channelId: CHANNEL_ID,
          sound: 'alarm_sound.wav',
        },
      ],
    });
  }

  async function cancelBreakTimerNative() {
    if (!isNative()) return;
    const plugin = localNotificationsPlugin();
    if (!plugin) return;
    await plugin
      .cancel({ notifications: [{ id: BREAK_WORK_END_ID }, { id: BREAK_REST_END_ID }] })
      .catch(() => {});
  }

  return {
    init,
    permission,
    requestPermission,
    fire,
    syncNativeSchedule,
    isNative,
    fireBreak,
    scheduleBreakTimerNative,
    cancelBreakTimerNative,
  };
})();
