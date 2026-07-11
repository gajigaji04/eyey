import { MedicationDef, MedicationId } from '@/types';

/**
 * 안약 5종의 고정 규칙 정의.
 * priority는 같은 시각에 여러 안약이 몰릴 때 어떤 순서로 5분씩 밀어 배치할지를 결정한다.
 * 요구사항 예시(09:00 혈청 → 09:05 목시아인 → 09:10 시카플루이드겔 → 09:15 로테맥스)를
 * 그대로 재현하도록 우선순위를 맞췄고, 디쿠스는 로테맥스 바로 다음 순서로 둔다.
 */
export const MEDICATIONS: Record<MedicationId, MedicationDef> = {
  serum: {
    id: 'serum',
    name: '혈청',
    shortDesc: '1시간마다',
    color: '#f4d35e',
    textOnColor: 'dark',
    rule: 'interval',
    intervalMinutes: 60,
    dailyCount: 16,
    priority: 0,
  },
  moxi: {
    id: 'moxi',
    name: '목시아인',
    shortDesc: '흰색 뚜껑 · 아침/점심/저녁/취침 전',
    color: '#e5e9ee',
    textOnColor: 'dark',
    rule: 'anchor',
    dailyCount: 4,
    priority: 1,
  },
  cica: {
    id: 'cica',
    name: '시카플루이드겔',
    shortDesc: '아침/점심/저녁/취침 전',
    color: '#52b788',
    textOnColor: 'light',
    rule: 'anchor',
    dailyCount: 4,
    priority: 2,
  },
  lotemax: {
    id: 'lotemax',
    name: '로테맥스',
    shortDesc: '연분홍색 뚜껑 · 3시간마다',
    color: '#f9c9d6',
    textOnColor: 'dark',
    rule: 'interval',
    intervalMinutes: 180,
    dailyCount: 6,
    priority: 3,
  },
  dequs: {
    id: 'dequs',
    name: '디쿠스',
    shortDesc: '일회용 안구건조증 치료제 · 3시간마다',
    color: '#8ecae6',
    textOnColor: 'dark',
    rule: 'interval',
    intervalMinutes: 180,
    dailyCount: 6,
    priority: 4,
  },
};

export const MEDICATION_LIST = Object.values(MEDICATIONS);

export const MIN_GAP_MINUTES = 5; // 서로 다른 안약 사이 최소 간격
