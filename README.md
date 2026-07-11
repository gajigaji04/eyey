# 안약 알림

라식 후 안약 점안 시간을 알려주는 앱입니다. Firebase, 로그인, 서버, 데이터베이스 없이 만들었고 모든 데이터는 기기 LocalStorage에 저장됩니다. 두 가지 형태로 씁니다.

1. **웹 PWA** (`www/`) — 배포 주소: https://eyes-alarm.vercel.app. 브라우저에서 열어 "홈 화면에 추가"로 설치. 앱이 열려 있는 동안만 알림이 옵니다.
2. **네이티브 안드로이드 앱** (`android/`, Capacitor) — 완전히 앱을 꺼도 OS가 대신 알림을 울려줍니다.

## 웹으로 실행 (개발/미리보기)

Service Worker는 `file://`로 열면 동작하지 않으므로 정적 서버로 열어야 합니다.

```bash
cd www
npx serve .
# 또는
python -m http.server 8000
```

## 웹 배포 (Vercel)

이미 `eyes-alarm.vercel.app`에 연결되어 있습니다. `www/` 내용을 고치고 재배포하려면:

```bash
cd www
cp -r ../.vercel .   # 최초 1회, 같은 프로젝트에 연결
npx vercel --prod --yes
rm -rf .vercel        # 커밋 전 정리 (루트의 .vercel만 유지)
```

## 안드로이드 앱 빌드 (APK)

로컬에 Android SDK 커맨드라인 도구와 JDK 21이 설치되어 있어야 합니다(이 프로젝트 세팅 시 `C:\Android\sdk`, `C:\Java\jdk-21.0.11+10`에 설치해두었습니다).

```bash
npm install                 # 루트에서, @capacitor/* 의존성 설치
node scripts/generate-icons.cjs        # 아이콘을 바꿨다면 www/icons 재생성
node scripts/generate-alarm-sound.cjs  # 알림음을 바꿨다면 res/raw + www/audio 재생성
npx cap sync android         # www/ 변경사항 + 플러그인을 android/ 프로젝트에 반영

cd android
JAVA_HOME="C:/Java/jdk-21.0.11+10" ./gradlew.bat assembleDebug
```

빌드된 APK: `android/app/build/outputs/apk/debug/app-debug.apk`

**폰에 설치하기**
- USB 디버깅 연결 후: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
- 또는 APK 파일을 폰으로 옮겨서 직접 실행 (설정에서 "출처를 알 수 없는 앱 설치" 허용 필요)

실제 배포용(정식 서명 APK/AAB)을 만들려면 Android Studio에서 서명 키를 만들고 `assembleRelease` / `bundleRelease`를 사용해야 합니다. 지금 빌드는 테스트용 디버그 APK입니다.

## 폴더 구조

```
www/                  ← 실제 앱 화면 (웹 배포 + 네이티브 앱이 공유)
  index.html, css/style.css
  js/storage.js        LocalStorage 읽기/쓰기 (안약 목록, 생활 패턴, 완료 기록)
  js/schedule.js        오늘 일정 생성 + 5분 간격 충돌 자동 배치
  js/notify.js           알림: 웹은 SW+Notification API, 네이티브는 OS 알람 예약
  js/app.js               화면 렌더링과 상태 관리
  js/vendor/               Capacitor 브라우저용 스크립트(번들러 없이 쓰는 공식 배포본)
  service-worker.js         오프라인 캐시 + (웹) 알림 클릭 시 완료 처리
android/                ← Capacitor로 생성된 네이티브 안드로이드 프로젝트 (커밋 대상)
  app/src/main/res/raw/alarm_sound.wav  알림 채널에 쓰이는 큰 알림음 (3연속 비프)
scripts/generate-icons.cjs        앱 아이콘 PNG 생성용 1회성 스크립트 (node 내장 zlib만 사용)
scripts/generate-alarm-sound.cjs  알림음 WAV 생성용 1회성 스크립트 (node 내장 기능만 사용)
capacitor.config.json    Capacitor 설정 (appId, webDir 등)
```

## 알림 동작 차이

| | 웹(PWA) | 네이티브 앱(APK) |
|---|---|---|
| 방식 | 앱이 열려 있을 때 매초 확인 후 발송 | 오늘 일정 전체를 OS 알람으로 미리 예약 |
| 완전 종료 시 | 알림 안 옴 | 옴 (재부팅해도 복원됨) |
| 필요한 것 | 없음 (서버 없음) | 없음 (서버 없음, 기기가 직접 예약) |
| 소리 | 브라우저 알림 기본음 + 탭이 열려 있으면 큰 비프음 재생 | 전용 알림 채널(중요도 최대) + 큰 비프음이 알림 소리 자체로 재생 |
| 제약 | — | 하루 일정만 예약하므로, **매일 한 번은 앱을 열어야** 다음날 알림이 다시 예약됩니다. 안약/생활패턴을 수정하거나 완료 체크할 때마다 자동으로 재예약됩니다. 눈 휴식 타이머도 켤 때마다 앞으로 약 16시간치만 예약되므로 마찬가지로 매일 앱을 열어야 계속 이어집니다. |

알림을 누르면 (웹은 서비스 워커, 앱은 네이티브 리스너가) 해당 안약을 자동으로 완료 처리합니다.

## 그 외 기능

- **취침~기상 사이 주기 알림 없음**: "몇 시간마다" 안약은 기상 시각부터 시작해서 취침 시각을 넘기면 그 이후 회차는 생성되지 않습니다.
- **먹은 시간 기준 재배열**: 완료 체크된 안약의 실제 시간(체크한 시각, 또는 완료된 항목의 시간을 눌러 직접 수정한 시각)을 기준으로 그 약의 다음 회차들이 자동으로 다시 계산됩니다. 예정된 시간이 아니라 실제로 넣은 시간 + 주기로 밀려서 배치됩니다.
- **눈 휴식 타이머**: "오늘" 탭의 토글로 켜면 50분 후 "쉬어주세요" 알림, 다시 10분 후 "재시작" 알림이 반복됩니다.

