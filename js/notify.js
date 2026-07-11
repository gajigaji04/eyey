// Notification permission + firing. No push server: alarms only fire while
// this page/tab is open and running (a hard limit of a backend-less PWA).
const Notify = (() => {
  let swRegistration = null;

  async function init() {
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('./service-worker.js');
      } catch (e) {
        console.warn('service worker registration failed', e);
      }
    }
  }

  function permission() {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.requestPermission();
  }

  async function fire(dose, dateStr) {
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
    };
    if (swRegistration) {
      swRegistration.showNotification(title, options);
    } else if ('Notification' in window) {
      new Notification(title, options);
    }
  }

  return { init, permission, requestPermission, fire };
})();
