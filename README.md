# 안약 알리미 (Eyes Alarm)

라식 수술 후 안약 점안 시간을 놓치지 않도록 도와주는 실시간 알림 PWA입니다.
Next.js(App Router) + TypeScript + Tailwind CSS + Firebase(Auth/Firestore/FCM)로 만들어졌고,
Android/iPhone에 "앱처럼" 설치해서 쓸 수 있습니다.

## 목차

1. [기능 요약](#기능-요약)
2. [프로젝트 구조](#프로젝트-구조)
3. [일정 자동 생성 알고리즘](#일정-자동-생성-알고리즘)
4. [로컬에서 실행하기](#로컬에서-실행하기)
5. [Firebase 프로젝트 설정](#firebase-프로젝트-설정)
6. [푸시 알림(FCM) 설정](#푸시-알림fcm-설정)
7. [Cloud Functions 배포 (시간 기반 알림)](#cloud-functions-배포-시간-기반-알림)
8. [Vercel 배포](#vercel-배포)
9. [모바일에 앱처럼 설치하기](#모바일에-앱처럼-설치하기)
10. [트러블슈팅](#트러블슈팅)

---

## 기능 요약

- 이메일/비밀번호 로그인 또는 게스트로 바로 시작
- 기상/점심/저녁/취침 시각을 기준으로 **하루 안약 일정 자동 생성**
- 서로 다른 안약이 겹치면 **5분 간격으로 자동 재배치**
- 오늘 남은 안약 / 완료한 안약 / 다음 안약까지 남은 시간 표시
- 완료·건너뛰기 처리, 완료율(%) 및 하루 완료율 표시
- 달력에서 지난 기록 확인, 주간/월간 통계, 연속 성공일(스트릭)
- 웹 푸시(FCM) + 브라우저 Notification API 알림
- 하루가 바뀌면 자동으로 새 일정 생성 (자정 기준)
- PWA: 오프라인 앱 셸 캐싱, 홈 화면 설치 지원

## 프로젝트 구조

```
eyes-alarm/
├─ src/
│  ├─ app/                     # Next.js App Router 페이지
│  │  ├─ layout.tsx            # 전역 레이아웃, PWA 메타데이터
│  │  ├─ page.tsx              # 오늘 화면(대시보드)
│  │  ├─ login/page.tsx        # 로그인/회원가입/게스트
│  │  ├─ settings/page.tsx     # 생활 패턴/알림 설정
│  │  ├─ calendar/page.tsx     # 달력으로 지난 기록 보기
│  │  └─ stats/page.tsx        # 주간/월간 통계, 스트릭
│  ├─ components/              # UI 컴포넌트
│  ├─ context/                 # AuthContext, ScheduleContext (전역 상태)
│  ├─ hooks/                   # useCountdown, useNotificationScheduler
│  ├─ lib/
│  │  ├─ medications.ts        # 안약 5종 규칙/색상 정의
│  │  ├─ scheduleGenerator.ts  # ★ 하루 일정 생성 + 충돌 재배치 알고리즘
│  │  ├─ firestore.ts          # Firestore CRUD
│  │  ├─ firebase.ts           # Firebase 초기화
│  │  ├─ notifications.ts      # FCM 토큰 발급, 로컬 알림
│  │  └─ stats.ts              # 완료율/스트릭 계산
│  └─ types/index.ts
├─ public/
│  ├─ manifest.json                        # PWA 매니페스트
│  ├─ firebase-messaging-sw.template.js    # 서비스워커 템플릿(커밋 대상)
│  ├─ firebase-messaging-sw.js             # 빌드 시 자동 생성(gitignore)
│  └─ icons/                               # 자동 생성된 PNG 아이콘
├─ scripts/
│  ├─ generate-icons.js       # 외부 의존성 없이 PWA 아이콘 PNG 생성
│  └─ generate-sw.js          # .env.local 값을 서비스워커에 주입
├─ functions/                  # Firebase Cloud Functions (시간 기반 푸시 발송)
│  └─ src/index.ts
├─ firestore.rules
├─ firebase.json
└─ .env.local.example
```

## 일정 자동 생성 알고리즘

`src/lib/scheduleGenerator.ts`의 `generateDaySchedule()`이 핵심입니다.

1. 안약별 규칙대로 "원래 넣고 싶은 시각"을 모두 나열합니다.
   - 목시아인/시카플루이드겔: 기상·점심·저녁·취침 전 (하루 4회)
   - 로테맥스/디쿠스: 기상 시각부터 3시간마다, 취침 전까지
   - 혈청: 기상 시각부터 1시간마다, 취침 전까지
2. 시각순으로 정렬하고, 시각이 같으면 **혈청 → 목시아인 → 시카플루이드겔 → 로테맥스 → 디쿠스** 순서로 정렬합니다.
3. 앞에서부터 훑으면서 직전에 배치된 시각 + 5분보다 이르면 그만큼 뒤로 밉니다.

예) 08:00 기상 기준으로 여러 안약이 09:00에 겹치면:

```
09:00 혈청
09:05 목시아인
09:10 시카플루이드겔
09:15 로테맥스
09:20 디쿠스
```

취침 시각은 `<input type="time">`과 호환되도록 `00:00`(자정)으로 표기하며, 기상 시각보다 이르거나
같으면 자동으로 "다음날"로 계산합니다(`resolveSleepMinutes`).

## 로컬에서 실행하기

```bash
npm install
npm run gen:icons      # 최초 1회: public/icons/*.png 생성 (이미 생성되어 있다면 생략 가능)
cp .env.local.example .env.local   # 아래 "Firebase 프로젝트 설정" 참고해 값 채우기
npm run dev
```

`npm run dev` / `npm run build`는 실행 전에 자동으로 `scripts/generate-sw.js`를 실행해
`.env.local`의 Firebase 값을 `public/firebase-messaging-sw.js`에 주입합니다.

## Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트를 만듭니다.
2. **빌드 > Authentication** → 시작하기 → 로그인 방법에서 **이메일/비밀번호**와 **익명**을 사용 설정합니다.
3. **빌드 > Firestore Database** → 데이터베이스 만들기 (프로덕션 모드 권장, 리전은 `asia-northeast3(서울)` 추천).
4. **프로젝트 설정(톱니바퀴) > 일반** 하단의 "내 앱"에서 웹 앱을 추가(`</>` 아이콘)하고,
   나온 `firebaseConfig` 값을 `.env.local`에 그대로 옮겨 적습니다.

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

5. Firestore 보안 규칙 배포 (CLI 필요, 아래 설치 안내 참고):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # 방금 만든 프로젝트 선택
   firebase deploy --only firestore:rules
   ```

`firestore.rules`는 각 사용자가 자신의 `users/{uid}` 문서와 그 하위 `days/{date}` 문서만
읽고 쓸 수 있도록 제한합니다.

## 푸시 알림(FCM) 설정

1. Firebase 콘솔 **프로젝트 설정 > Cloud Messaging** 탭에서 **웹 푸시 인증서** 섹션의
   "키 쌍 생성"을 눌러 VAPID 키를 발급받습니다.
2. `.env.local`에 추가합니다.

   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=발급받은_키
   ```

3. 앱 실행 후 로그인하면 대시보드 상단에 "알림 켜기" 배너가 뜹니다. 눌러서
   브라우저 알림 권한을 허용하면 FCM 토큰이 발급되어 Firestore(`users/{uid}.fcmTokens`)에 저장됩니다.

브라우저가 열려 있는 동안은 `src/hooks/useNotificationScheduler.ts`가 30초마다 다음 안약 시각을
확인해서 **로컬 Notification API**로 즉시 알려줍니다. 앱이 완전히 종료되어 있어도 알림을 받으려면
아래 Cloud Functions를 배포해야 실제 서버 푸시(FCM)가 발송됩니다.

## Cloud Functions 배포 (시간 기반 알림)

앱이 백그라운드/완전 종료 상태에서도 알림을 받으려면, 1분마다 예정 시각을 확인해서
FCM 푸시를 보내는 Cloud Function을 배포해야 합니다. **Firebase Blaze(종량제) 요금제**가 필요합니다
(Cloud Scheduler를 사용하는 예약 함수의 최소 요건입니다. 개인 사용 규모에서는 대부분 무료 한도 내에서 처리됩니다).

```bash
cd functions
npm install
npm run deploy         # = tsc 빌드 후 firebase deploy --only functions
```

배포되는 함수 두 가지 (`functions/src/index.ts`):

- `checkDoseTimes` — 1분마다 모든 사용자의 오늘 일정을 확인해 "N분 후 ~ 넣으세요" /
  "~ 넣을 시간입니다" 알림을 보냅니다. (중복 발송 방지를 위해 각 회차에 발송 여부를 기록합니다)
- `onDayRecordWritten` — 오늘 문서가 바뀔 때마다 실행되어, 모든 회차가 완료/건너뜀 상태가 되면
  "오늘 안약을 모두 완료했습니다" 알림을 한 번 보냅니다.

> 서버는 한국 표준시(Asia/Seoul) 기준으로 동작하도록 고정되어 있습니다. 다른 시간대에서 쓸 계획이라면
> `functions/src/index.ts`의 `TIME_ZONE` 상수를 수정하세요.

## Vercel 배포

```bash
npm install -g vercel
vercel login
vercel
```

1. 프로젝트를 연결한 뒤, Vercel 대시보드 **Settings > Environment Variables**에 `.env.local`의
   `NEXT_PUBLIC_FIREBASE_*` 값과 `NEXT_PUBLIC_FIREBASE_VAPID_KEY`를 그대로 등록합니다.
2. Vercel은 빌드 시 `npm run build`(= `prebuild`로 `generate-sw.js` 자동 실행)를 실행하므로
   서비스워커도 배포 시점에 맞게 자동 생성됩니다.
3. Firebase 콘솔 **Authentication > Settings > 승인된 도메인**에 Vercel에서 발급된 도메인
   (`your-app.vercel.app`)을 추가해야 로그인이 정상 동작합니다.

## 모바일에 앱처럼 설치하기

**Android (Chrome)**

1. 배포된 주소로 Chrome에서 접속합니다.
2. 오른쪽 위 메뉴(⋮) → **"앱 설치"** 또는 **"홈 화면에 추가"** 를 누릅니다.
3. 설치되면 다른 앱처럼 홈 화면 아이콘으로 실행되고, 알림도 정상적으로 수신됩니다.

**iPhone (Safari)**

1. 배포된 주소로 Safari에서 접속합니다. (반드시 Safari — 다른 브라우저는 홈 화면 추가가 제한적입니다)
2. 하단 공유 버튼(⬆️) → **"홈 화면에 추가"** 를 누릅니다.
3. 홈 화면 아이콘으로 실행한 뒤, 대시보드의 "알림 켜기"를 눌러 권한을 허용합니다.
   iOS는 **16.4 이상**부터, 그리고 반드시 **홈 화면에 추가한 뒤**에만 웹 푸시 알림을 지원합니다.

## 트러블슈팅

- **알림이 전혀 안 와요**: 브라우저 알림 권한이 "허용"인지 확인하고, `.env.local`의
  `NEXT_PUBLIC_FIREBASE_VAPID_KEY`가 채워져 있는지, `functions` 배포가 되어 있는지 확인하세요.
- **iOS에서 알림이 안 와요**: 홈 화면에 추가한 아이콘으로 실행했는지, iOS 버전이 16.4 이상인지 확인하세요.
  Safari 탭으로만 열면 백그라운드 푸시를 받을 수 없습니다.
- **일정이 이상하게 생성돼요**: 설정에서 기상/점심/저녁/취침 시각을 다시 확인하세요. 취침 시각이
  기상 시각보다 늦은 같은 날 시각이어야 정상 계산됩니다(예: 기상 08:00, 취침 00:00(자정) 또는 01:00 모두 가능).
- **아이콘을 바꾸고 싶어요**: `scripts/generate-icons.js`를 수정하거나, `public/icons/`에
  직접 192x192 / 512x512 PNG로 교체하세요.
