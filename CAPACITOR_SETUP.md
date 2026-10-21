# 📱 건강어때 · Capacitor 네이티브 앱 전환 가이드

> **목표:** PWA → iOS App Store + Google Play 등록용 네이티브 앱
> **소요 시간:** 작업 2일 + 심사 대기 (iOS 1~3일 · Android 4~8시간)
> **전제:** Mac + Xcode 설치 + Apple Developer 계정 ($99/년)

---

## 🧭 전체 흐름

```
Phase B1 · 로컬 환경 준비 (30분)
Phase B2 · Capacitor 초기화 (20분)
Phase B3 · iOS 프로젝트 생성 (30분)
Phase B4 · Android 프로젝트 생성 (30분)
Phase B5 · 앱 아이콘·스플래시 (1시간)
Phase B6 · iOS 빌드·심사 제출 (반나절)
Phase B7 · Android 빌드·심사 제출 (반나절)
```

---

## Phase B1 · 로컬 환경 준비

### 1. Xcode 설치 (iOS용)
- Mac App Store에서 **Xcode** 설치 (약 10GB · 1~2시간)
- 설치 후 터미널에서:
```bash
xcode-select --install
sudo xcodebuild -license accept
```

### 2. Android Studio 설치 (Android용)
- https://developer.android.com/studio 다운로드
- 설치 후 SDK Manager에서:
  - Android 14 (API 34) SDK
  - Android SDK Build-Tools
  - Android Emulator (선택)

### 3. CocoaPods 설치 (iOS 의존성)
```bash
sudo gem install cocoapods
pod --version   # 1.14+ 나와야 함
```

### 4. Apple Developer 계정 가입
- https://developer.apple.com/programs/
- 연 $99 · 결제 후 승인 24시간
- (안 하면 iOS 앱스토어 등록 불가)

### 5. Google Play Developer 계정 가입
- https://play.google.com/console/signup
- 1회 $25
- (안 하면 Google Play 등록 불가)

---

## Phase B2 · Capacitor 초기화

```bash
cd /Users/jinyoungchoi/Desktop/geongangeottae

# 1. 의존성 설치 (package.json에 이미 추가됨)
npm install

# 2. 빌드 1번 (dist/ 생성)
npm run build

# 3. Capacitor sync (설정 → 네이티브 반영)
npx cap sync
```

**에러 발생 시:**
- `pod install failed` → `cd ios/App && pod install` 수동 실행
- `Gradle` 에러 → Android Studio 열고 Gradle sync

---

## Phase B3 · iOS 프로젝트 생성

```bash
# iOS 네이티브 프로젝트 생성 (ios/ 폴더 생김)
npx cap add ios

# Xcode 열기
npx cap open ios
```

**Xcode 안에서:**
1. 상단 디바이스를 "Any iOS Device (arm64)" 또는 시뮬레이터로 선택
2. 왼쪽 트리 **App → Signing & Capabilities** 탭
3. Team: 본인 Apple Developer 계정 선택
4. Bundle Identifier: `com.healtheottae.app` 확인
5. 재생(▶) 버튼으로 시뮬레이터 실행 → 앱 뜨면 성공

**카메라 권한 추가 (중요):**
- `ios/App/App/Info.plist` 열기
- 아래 추가:
```xml
<key>NSCameraUsageDescription</key>
<string>건강어때는 식단 사진 등록을 위해 카메라를 사용합니다.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>건강어때는 식단 사진 선택을 위해 사진 라이브러리에 접근합니다.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>건강어때는 주변 음식점 추천을 위해 위치 정보를 사용합니다.</string>
```

---

## Phase B4 · Android 프로젝트 생성

```bash
# Android 네이티브 프로젝트 생성 (android/ 폴더 생김)
npx cap add android

# Android Studio 열기
npx cap open android
```

**Android Studio 안에서:**
1. 상단 디바이스를 에뮬레이터 또는 USB 연결된 폰으로 선택
2. 재생(▶) 버튼으로 빌드·실행 → 앱 뜨면 성공

**권한 추가 (`android/app/src/main/AndroidManifest.xml`):**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## Phase B5 · 앱 아이콘·스플래시 (브랜딩)

### 아이콘 준비
- **1024x1024 px PNG** (투명 배경 X · 모서리 둥글지 않게)
- 건강어때 로고 활용 (파랑/네이비 배경 + 흰 아이콘)

### 자동 생성 도구
```bash
npm install -g @capacitor/assets

# assets/icon-only.png (1024x1024) + assets/splash.png (2732x2732) 준비 후
npx capacitor-assets generate
```

→ iOS·Android 모든 사이즈 자동 생성

---

## Phase B6 · iOS 빌드·심사 제출

### 1. 심사용 Archive 빌드 (Xcode)
1. Xcode → Product → Scheme → App 선택
2. 상단 디바이스를 "Any iOS Device (arm64)"로 변경
3. Product → **Archive** (10~15분)
4. 완료되면 Organizer 창 자동 열림

### 2. App Store Connect 등록
1. https://appstoreconnect.apple.com
2. "앱" → 새 앱 생성:
   - 이름: `건강어때`
   - 번들 ID: `com.healtheottae.app`
   - 언어: 한국어 (주)
3. 필수 입력:
   - 앱 설명 (6자 이상, 4000자 이하)
   - 키워드 (100자)
   - **스크린샷**: 6.7" (아이폰 15 Pro Max) · 5.5" (구형) 각 3~10장
   - **개인정보 처리방침 URL**: `https://peepeekit-urine-app-5h3f.vercel.app/privacy.html`
   - 카테고리: 건강 및 피트니스
4. "앱 심사용 정보": 리뷰어 로그인 테스트 계정 (PT 측 테스트용)

### 3. 제출
- Organizer → "Distribute App" → "App Store Connect" → "Upload"
- App Store Connect에서 빌드 선택 → "심사 제출"

### 4. 심사 대기 (1~3일)
- 거절 시: 메시지 확인 후 수정 → 재제출

---

## Phase B7 · Android 빌드·심사 제출

### 1. 서명 키 생성
```bash
cd android/app
keytool -genkey -v -keystore release.keystore -alias healtheottae -keyalg RSA -keysize 2048 -validity 10000
# 비밀번호 꼭 기억! (분실 시 앱 업데이트 불가)
```

### 2. 서명 설정 (`android/app/build.gradle`)
```gradle
android {
  signingConfigs {
    release {
      storeFile file('release.keystore')
      storePassword '<위에서 설정한 비번>'
      keyAlias 'healtheottae'
      keyPassword '<위에서 설정한 비번>'
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
```

### 3. AAB 빌드 (Google Play 전용 포맷)
```bash
cd android
./gradlew bundleRelease
# android/app/build/outputs/bundle/release/app-release.aab 생성
```

### 4. Google Play Console 등록
1. https://play.google.com/console
2. 앱 만들기 → `건강어때`
3. 필수 입력:
   - 앱 설명 (짧은 + 긴 설명)
   - **스크린샷**: 폰 2~8장 (16:9 또는 9:16)
   - 그래픽 이미지: 512x512 (아이콘) + 1024x500 (피쳐)
   - 콘텐츠 등급 설문
   - 개인정보 처리방침 URL
   - 타겟 연령층
4. "AAB 업로드" → `app-release.aab` 선택
5. 심사 제출

### 5. 심사 대기 (4~8시간)
- Android는 iOS보다 빠름

---

## ⚠️ 주의 사항

### Apple 심사 거절 흔한 이유
1. **"웹사이트 wrapper 같다"** → Capacitor는 네이티브 기능 쓰므로 보통 OK
   - 거절 시: 카메라/푸시/바이오메트릭 활용 강조
2. **개인정보 처리방침 없음** → `/privacy.html` 꼭 작성
3. **테스트 계정 미제공** → PT 로그인용 계정 필수 제공
4. **크래시** → 아이폰 시뮬레이터 다양한 기종에서 테스트

### 기존 Vercel 유지
- Capacitor 앱은 Vercel URL에서 콘텐츠 로드 (`server.url`)
- Vercel에 push하면 앱도 자동 업데이트 (OTA)
- **큰 변화는 심사 재제출 필요** (UI 전체 개편 등)

### 심사 통과용 번들 vs 운영
- **첫 심사**: `capacitor.config.ts`의 `server.url` 블록 **주석 처리** → 번들 로드 (Apple이 "실제 콘텐츠 확인")
- **심사 통과 후**: `server.url` 재활성화 → `npx cap sync` → OTA 활성

---

## 📋 체크리스트

### 심사 제출 전 필수
- [ ] 앱 아이콘 1024x1024 완성
- [ ] 스플래시 스크린 완성
- [ ] 스크린샷 (iOS 6.7": 3장+, Android 폰: 2장+)
- [ ] 개인정보 처리방침 URL 작동 (`/privacy.html`)
- [ ] 서비스 이용약관 URL 작동 (`/terms.html`)
- [ ] 리뷰용 테스트 계정 (PT 로그인용)
- [ ] 앱 설명 (한국어, 명확히)
- [ ] 카테고리 선택 (건강 및 피트니스)
- [ ] 콘텐츠 등급 설정 (12+ 권장)
- [ ] 가격 및 유통 (무료)

### 첫 심사 후 할 일
- [ ] `server.url` 재활성 → OTA 가동
- [ ] 베타 테스터 10명 섭외
- [ ] Firebase Analytics 또는 Mixpanel 연동 (사용자 추적)

---

## 🚀 지금 당장 시작할 명령

```bash
cd /Users/jinyoungchoi/Desktop/geongangeottae

# 1. 의존성 설치
npm install

# 2. 빌드
npm run build

# 3. Capacitor sync
npx cap sync

# 4. iOS 프로젝트 생성 + Xcode 열기
npx cap add ios
npx cap open ios

# 5. (Android도 하려면)
npx cap add android
npx cap open android
```

---

## 📞 막힐 때

| 증상 | 해결 |
|---|---|
| `npx cap sync` 실패 | `rm -rf node_modules && npm install` 재시도 |
| Xcode 서명 에러 | Apple Developer 계정 Team 선택 재확인 |
| 앱 열면 흰 화면 | `server.url` 블록 주석 처리 후 `npx cap sync` |
| 카메라 안 됨 | Info.plist에 NSCameraUsageDescription 추가 |
| Android 빌드 실패 | Android Studio → File → Invalidate Caches |

---

## 🏁 다음 단계 (이 가이드 끝났을 때)

1. 베타 앱 TestFlight (iOS) + Internal Testing (Android)
2. 베타 테스터 피드백 수집 (1주일)
3. 수정·최종 심사 제출
4. 마케팅·앱스토어 최적화 (ASO)
5. Phase C · 몸 변화 추적 + 운동 처방 (COACH_MODE_PLAN.md 참조)
