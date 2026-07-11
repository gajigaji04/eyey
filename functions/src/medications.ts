// src/lib/medications.ts 의 이름만 그대로 옮겨온 것 (Cloud Functions는 별도 TS 프로젝트라 경로 별칭을 공유할 수 없다).
// 알림 문구에 안약 이름을 넣기 위한 최소한의 매핑만 유지한다. 규칙/색상 등은 프런트엔드 쪽 정의가 원본이다.
export const MEDICATION_NAMES: Record<string, string> = {
  moxi: '목시아인',
  cica: '시카플루이드겔',
  lotemax: '로테맥스',
  dequs: '디쿠스',
  serum: '혈청',
};
