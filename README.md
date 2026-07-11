# 안약 알림

라식 후 안약 점안 시간을 알려주는 설치형 웹앱(PWA)입니다. Firebase, 로그인, 서버, 데이터베이스 없이 순수 HTML/CSS/JavaScript로만 만들었고, 모든 데이터는 브라우저 LocalStorage에 저장됩니다.

## 실행 방법

Service Worker는 `file://`로 열면 동작하지 않으므로 간단한 정적 서버로 열어야 합니다.

```bash
npx serve .
# 또는
python -m http.server 8000
```

브라우저에서 `http://localhost:포트`로 접속한 뒤, 주소창의 설치 아이콘(또는 브라우저 메뉴의 "홈 화면에 추가")으로 설치할 수 있습니다.

## 폴더 구조

- `index.html`, `css/style.css` — 화면
- `js/storage.js` — LocalStorage 읽기/쓰기 (안약 목록, 생활 패턴, 완료 기록)
- `js/schedule.js` — 오늘 일정 생성 + 5분 간격 충돌 자동 배치
- `js/notify.js` — 알림 권한 요청 및 발송
- `js/app.js` — 화면 렌더링과 상태 관리
- `service-worker.js` — 오프라인 캐시 + 알림 클릭 시 완료 처리
- `scripts/generate-icons.cjs` — 앱 아이콘 PNG를 생성하는 1회성 스크립트 (`node scripts/generate-icons.cjs`)

## 알림 관련 중요한 제약

서버/백엔드가 없는 구조이기 때문에 웹 푸시(Push API)를 사용할 수 없습니다. 그래서 이 앱의 알림은 **앱(탭)이 열려서 실행되고 있는 동안에만** 울립니다. 완전히 앱을 종료하거나 브라우저를 닫으면 알림이 오지 않습니다. 사용 중에는 설치한 앱을 백그라운드에 두거나 탭을 열어두세요.

알림을 누르면 서비스 워커가 해당 안약을 자동으로 완료 처리합니다.
