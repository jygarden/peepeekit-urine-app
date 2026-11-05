# 📱 건강어때 네이티브 앱 배포 (iOS / Android)

## 🎯 전환 요약

| 항목 | 기존 (하이브리드) | 현재 (번들 모드) |
|---|---|---|
| 앱이 뭘 로드? | Vercel의 index.html | **앱 내부 dist/index.html** |
| 오프라인 | ❌ | ✅ (API만 네트워크 필요) |
| 로딩 속도 | 2-3초 (다운로드) | 즉시 (로컬) |
| 코드 수정 시 | 웹 push만 | **앱 재빌드 + 재심사** |
| API 호출 | 상대경로 /api/* | Vercel 절대경로 (자동 리라우트) |
| Apple 심사 | "단순 웹뷰" 거부 위험 | ✅ 네이티브로 통과 |

## ✅ 코드 변경사항 (이미 반영됨)

1. **`capacitor.config.json`** — `server.url` 제거 → 번들 모드 활성화
2. **`index.html`** 최상단 — Capacitor 감지 + fetch 자동 리라우트
   ```js
   window.API_BASE = isNative ? 'https://peepeekit-urine-app-5h3f.vercel.app' : '';
   ```
3. **서비스워커** — 네이티브 앱에서 자동 스킵 (충돌 방지)
4. **CORS** — `X-Nickname`, `X-Coach-Token` 헤더 추가

## 🚀 배포 명령어

### 준비 (처음 한 번만)
```bash
cd /Users/jinyoungchoi/Desktop/peepee_ai_final/peepee_new
npm install
```

### 배포 사이클 (코드 수정할 때마다)
```bash
# 1. dist/ 빌드 (minify + 자산 복사)
npm run build

# 2. 네이티브 프로젝트에 복사
npx cap sync

# 3. iOS 빌드
npx cap open ios
# → Xcode에서:
#   - Product → Archive
#   - Window → Organizer → Distribute App
#   - App Store Connect 업로드

# 4. Android 빌드
npx cap open android
# → Android Studio에서:
#   - Build → Generate Signed Bundle / APK
#   - AAB (Android App Bundle) 선택
#   - Google Play Console 업로드
```

## ⚠️ 심사 체크리스트

### iOS
- [ ] 버전 번호 올리기 (`ios/App/App.xcodeproj/project.pbxproj` 또는 Xcode에서)
- [ ] Info.plist 권한 설명 (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription`)
- [ ] 스크린샷 업데이트 (6.7" / 6.5" / 5.5")
- [ ] "What's New" 입력

### Android
- [ ] `versionCode` +1, `versionName` 올리기 (`android/app/build.gradle`)
- [ ] 권한 설명 (`android/app/src/main/AndroidManifest.xml`)
- [ ] 스크린샷 (최소 2장, 320~3840px)
- [ ] "출시 노트" 입력

## 🐛 디버깅

### 안 되면 체크
1. **빈 화면**: `npm run build` 안 돌려서 dist/ 비어있음
2. **API 401/CORS 에러**: Vercel에 최신 API 코드 올라가 있는지 확인
3. **이미지 안 나옴**: build.js가 assets 복사했는지 확인
4. **푸시 안 됨**: `GoogleService-Info.plist` (iOS) / `google-services.json` (Android) 있는지

### iOS Safari 원격 디버깅
- 아이폰: 설정 → Safari → 고급 → 웹 Inspector 켜기
- Mac Safari → 개발 메뉴 → 아이폰 이름 → 건강어때

### Android Chrome 원격 디버깅
- 폰: 개발자 옵션 → USB 디버깅 켜기
- PC: `chrome://inspect` → 폰 선택

## 🔐 보안

**API 키들은 Vercel 환경변수에만** — 앱 번들에 넣지 말 것.
- `GEMINI_API_KEY`
- `SUPABASE_SECRET_KEY`
- `KAKAO_REST_API_KEY`

앱 번들에는 **ANON_KEY + 공개 URL**만 있어야 함.

## 🔄 웹 유지 + 앱 병행

현재 설정은 **웹(PWA)과 앱 둘 다** 지원:
- 웹에서 접속: `location.protocol === 'https:'` → `API_BASE = ''` (상대경로)
- 앱에서 접속: Capacitor 감지 → `API_BASE = Vercel URL` (자동 리라우트)

코드 한 벌로 양쪽 커버.
