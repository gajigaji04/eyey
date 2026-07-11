(() => {
  let medications = [];
  let pattern = {};
  let schedule = [];
  let completions = {};

  const el = {
    notifBtn: document.getElementById('notif-btn'),
    tabs: document.querySelectorAll('.tab-btn'),
    views: {
      today: document.getElementById('view-today'),
      meds: document.getElementById('view-meds'),
      settings: document.getElementById('view-settings'),
    },
    rateNumber: document.getElementById('rate-number'),
    rateBarFill: document.getElementById('rate-bar-fill'),
    rateSub: document.getElementById('rate-sub'),
    currentContent: document.getElementById('current-dose-content'),
    nextContent: document.getElementById('next-dose-content'),
    scheduleList: document.getElementById('schedule-list'),
    medList: document.getElementById('med-list'),
    addMedBtn: document.getElementById('add-med-btn'),
    medTemplate: document.getElementById('med-card-template'),
    patternWake: document.getElementById('pattern-wake'),
    patternLunch: document.getElementById('pattern-lunch'),
    patternDinner: document.getElementById('pattern-dinner'),
    patternSleep: document.getElementById('pattern-sleep'),
  };

  function recompute() {
    medications = getMedications();
    pattern = getPattern();
    schedule = buildTodaySchedule(medications, pattern);
    completions = getCompletionsToday();
  }

  function nowMinutesFloat(d) {
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  }

  function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}시간 ${m}분 ${sec}초`;
    if (m > 0) return `${m}분 ${sec}초`;
    return `${sec}초`;
  }

  function renderToday() {
    const total = schedule.length;
    const done = schedule.filter((d) => completions[d.id]).length;
    const rate = total ? Math.round((done / total) * 100) : 0;
    el.rateNumber.textContent = `${rate}%`;
    el.rateBarFill.style.width = `${rate}%`;
    el.rateSub.textContent = `${done} / ${total}회 완료`;

    const now = new Date();
    const nowMin = nowMinutesFloat(now);
    const overdue = schedule.filter((d) => !completions[d.id] && d.minutes <= nowMin);
    const upcoming = schedule.filter((d) => !completions[d.id] && d.minutes > nowMin);

    if (total === 0) {
      el.currentContent.innerHTML = '<p class="muted">켜져 있는 안약이 없어요. 안약 관리에서 추가해보세요.</p>';
    } else if (overdue.length === 0) {
      el.currentContent.innerHTML = '<p class="muted">지금 넣을 안약이 없어요 👍</p>';
    } else {
      el.currentContent.innerHTML = overdue
        .map((d) => {
          const lateMin = Math.max(0, Math.floor(nowMin - d.minutes));
          const lateText = lateMin > 0 ? ` · ${lateMin}분 지남` : ' · 지금';
          return `
            <div class="due-item">
              <div>
                <div class="due-name">${escapeHtml(d.name)}</div>
                <div class="due-time">${d.time}${lateText}</div>
              </div>
              <button class="complete-btn" type="button" data-dose-id="${d.id}">완료</button>
            </div>`;
        })
        .join('');
    }

    if (upcoming.length === 0) {
      el.nextContent.innerHTML = total === 0
        ? '<p class="muted">-</p>'
        : '<p class="muted">오늘 일정이 모두 끝났어요 🎉</p>';
    } else {
      const next = upcoming[0];
      const diffSeconds = (next.minutes - nowMin) * 60;
      el.nextContent.innerHTML = `
        <div class="next-name">${escapeHtml(next.name)}</div>
        <div class="next-time">${next.time} 예정</div>
        <div class="next-countdown">${formatDuration(diffSeconds)}</div>`;
    }

    el.scheduleList.innerHTML = schedule
      .map((d) => {
        const isDone = !!completions[d.id];
        const isOverdue = !isDone && d.minutes <= nowMin;
        const cls = isDone ? 'done' : isOverdue ? 'overdue' : 'upcoming';
        return `
          <li class="${cls}">
            <label>
              <input type="checkbox" class="dose-check" data-dose-id="${d.id}" ${isDone ? 'checked' : ''} />
              <span class="dose-time">${d.time}</span>
              <span class="dose-name">${escapeHtml(d.name)}</span>
            </label>
          </li>`;
      })
      .join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function toggleDose(doseId, done) {
    setCompletion(doseId, done);
    completions = getCompletionsToday();
    renderToday();
  }

  function renderMeds() {
    el.medList.innerHTML = '';
    medications.forEach((med) => {
      const node = el.medTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.medId = med.id;
      node.querySelector('.med-name-input').value = med.name;
      node.querySelector('.med-enabled-input').checked = med.enabled;
      node.querySelector('.med-type-input').value = med.type;

      const fixedBox = node.querySelector('.med-fixed-slots');
      const intervalBox = node.querySelector('.med-interval-fields');
      if (med.type === 'fixed') {
        intervalBox.style.display = 'none';
        node.querySelectorAll('.slot-check').forEach((cb) => {
          cb.checked = (med.slots || []).includes(cb.value);
        });
      } else {
        fixedBox.style.display = 'none';
        node.querySelector('.interval-hours-input').value = med.intervalHours ?? 3;
        node.querySelector('.interval-count-input').value = med.intervalCount ?? 6;
      }
      el.medList.appendChild(node);
    });
  }

  function findMed(medId) {
    return medications.find((m) => m.id === medId);
  }

  function persistMedsAndRefresh() {
    saveMedications(medications);
    recompute();
    renderToday();
  }

  function onMedListChange(e) {
    const card = e.target.closest('.med-card');
    if (!card) return;
    const med = findMed(card.dataset.medId);
    if (!med) return;

    if (e.target.classList.contains('med-name-input')) {
      med.name = e.target.value.trim() || '이름 없음';
    } else if (e.target.classList.contains('med-enabled-input')) {
      med.enabled = e.target.checked;
    } else if (e.target.classList.contains('med-type-input')) {
      med.type = e.target.value;
      if (med.type === 'fixed' && !med.slots) med.slots = [];
      if (med.type === 'interval') {
        if (!med.intervalHours) med.intervalHours = 3;
        if (!med.intervalCount) med.intervalCount = 6;
      }
      persistMedsAndRefresh();
      renderMeds();
      return;
    } else if (e.target.classList.contains('slot-check')) {
      const checked = card.querySelectorAll('.slot-check:checked');
      med.slots = Array.from(checked).map((cb) => cb.value);
    } else if (e.target.classList.contains('interval-hours-input')) {
      med.intervalHours = Math.max(0.5, Number(e.target.value) || 1);
    } else if (e.target.classList.contains('interval-count-input')) {
      med.intervalCount = Math.max(1, Math.floor(Number(e.target.value) || 1));
    } else {
      return;
    }
    persistMedsAndRefresh();
  }

  function onMedListClick(e) {
    if (!e.target.classList.contains('delete-btn')) return;
    const card = e.target.closest('.med-card');
    if (!card) return;
    const med = findMed(card.dataset.medId);
    if (!med) return;
    if (!confirm(`'${med.name}'을(를) 삭제할까요?`)) return;
    medications = medications.filter((m) => m.id !== med.id);
    persistMedsAndRefresh();
    renderMeds();
  }

  function addMedication() {
    const med = { id: genId(), name: '', enabled: true, type: 'fixed', slots: [] };
    medications.push(med);
    persistMedsAndRefresh();
    renderMeds();
    const card = el.medList.querySelector(`[data-med-id="${med.id}"] .med-name-input`);
    if (card) card.focus();
  }

  function renderSettings() {
    el.patternWake.value = pattern.wake;
    el.patternLunch.value = pattern.lunch;
    el.patternDinner.value = pattern.dinner;
    el.patternSleep.value = pattern.sleep;
  }

  function onPatternChange() {
    pattern = {
      wake: el.patternWake.value || '08:00',
      lunch: el.patternLunch.value || '13:00',
      dinner: el.patternDinner.value || '19:00',
      sleep: el.patternSleep.value || '24:00',
    };
    savePattern(pattern);
    recompute();
    renderToday();
  }

  function switchTab(tab) {
    el.tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
    Object.entries(el.views).forEach(([key, view]) => view.classList.toggle('hidden', key !== tab));
  }

  function updateNotifButton() {
    const perm = Notify.permission();
    el.notifBtn.hidden = perm === 'granted' || perm === 'unsupported';
  }

  async function checkAndFireNotifications() {
    if (Notify.permission() !== 'granted') return;
    const now = new Date();
    const nowMin = nowMinutesFloat(now);
    const dateStr = todayStr();
    const notified = getNotifiedToday();
    for (const dose of schedule) {
      if (completions[dose.id]) continue;
      if (dose.minutes > nowMin) continue;
      if (notified.includes(dose.id)) continue;
      markNotified(dose.id);
      await Notify.fire(dose, dateStr);
    }
  }

  function handleCompleteFromUrl() {
    const params = new URLSearchParams(location.search);
    const doseId = params.get('complete');
    if (doseId) {
      setCompletion(doseId, true);
      completions = getCompletionsToday();
      history.replaceState(null, '', location.pathname);
    }
  }

  function tick() {
    renderToday();
    checkAndFireNotifications();
  }

  function init() {
    recompute();
    handleCompleteFromUrl();
    renderToday();
    renderMeds();
    renderSettings();
    updateNotifButton();

    el.tabs.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    el.scheduleList.addEventListener('change', (e) => {
      if (e.target.classList.contains('dose-check')) {
        toggleDose(e.target.dataset.doseId, e.target.checked);
      }
    });
    document.getElementById('current-dose-content').addEventListener('click', (e) => {
      if (e.target.classList.contains('complete-btn')) {
        toggleDose(e.target.dataset.doseId, true);
      }
    });
    el.medList.addEventListener('change', onMedListChange);
    el.medList.addEventListener('click', onMedListClick);
    el.addMedBtn.addEventListener('click', addMedication);
    [el.patternWake, el.patternLunch, el.patternDinner, el.patternSleep].forEach((input) =>
      input.addEventListener('change', onPatternChange)
    );
    el.notifBtn.addEventListener('click', async () => {
      await Notify.requestPermission();
      updateNotifButton();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'COMPLETE_DOSE' && event.data.doseId) {
          toggleDose(event.data.doseId, true);
        }
      });
    }

    Notify.init();
    setInterval(tick, 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
