# 📸 B 옵션 — 인스타 스토리 진짜 자동 게시 가이드

## 🎯 최종 사용자 경험
```
사용자가 "인스타 스토리로 공유" 클릭
        ↓
   자동 이미지 생성 (기존)
        ↓
🚀 인스타 앱 자동 실행
        ↓
✨ 스토리 편집 화면이 열림
✨ 우리 이미지가 배경에 자동 배치되어 있음
        ↓
   사용자는 스티커·텍스트·이모지 자유롭게 추가
        ↓
   "내 스토리에 공유" 클릭
        ↓
        완료!
```

---

## 📋 진행 순서

### 1️⃣ Facebook Developer 등록 (주인님)
- **URL**: https://developers.facebook.com/apps/
- 앱 이름: 건강어때
- 유형: 기타 → 비즈니스
- **📌 App ID** (16자리 숫자) 발급받기
- 저에게 App ID 알려주세요!

### 2️⃣ 코드 적용 (제가 만든 문서 참고)
| 파일 | 위치 |
|------|------|
| `flutter_main_dart_patch.md` | Flutter Dart 코드 |
| `ios_AppDelegate_swift_patch.md` | iOS Swift 코드 |
| `android_MainActivity_patch.md` | Android Kotlin 코드 |

### 3️⃣ App ID 넣기 (2곳)
**Flutter (`lib/main.dart`)**:
```dart
'appId': 'YOUR_FACEBOOK_APP_ID', // ← 여기 넣기
```

Info.plist·AndroidManifest.xml·MainActivity.kt·AppDelegate.swift는 하드코딩된 App ID 없음. Flutter에서만 넣으면 됨.

### 4️⃣ 앱 재빌드
```bash
cd /Users/jinyoungchoi/Desktop/peepee_ai_final
flutter clean
flutter pub get
flutter build appbundle --release  # Android
flutter build ipa --release        # iOS
```

### 5️⃣ 스토어 재신청
- **Android**: Google Play Console → AAB 업로드 (심사 1-2일)
- **iOS**: Xcode → Archive → App Store Connect (심사 1-3일)

---

## 🎁 결과: A + B 통합

| 상황 | 동작 |
|------|------|
| **1순위**: 앱 안 (B 성공) | 인스타 스토리 편집 화면 자동 열림 ✨ |
| **2순위**: 앱 안 (B 실패, 예: 인스타 미설치) | 갤러리 저장 + A 안내 모달 |
| **3순위**: 웹 브라우저 (iOS) | 공유 시트 + 안내 모달 |
| **4순위**: 웹 브라우저 (그 외) | 이미지 크게 표시 + 인스타 열기 버튼 |

즉 **어느 환경이든 최선의 경험** 제공! 앱만 있으면 100% 자동.

---

## 🔒 App ID 보안
- **App ID는 공개돼도 문제없음** (Google Analytics ID와 같은 성격)
- Facebook App Secret은 절대 앱에 넣으면 안 됨 (우리는 안 씀)
- Instagram Story 공유는 App ID만 있으면 되고 서버 통신 X

---

## 🧪 테스트 방법
1. **실기기 필수** (에뮬레이터에는 인스타 앱 없음)
2. 인스타 앱 설치 후 로그인
3. 우리 앱 → 결과 화면 → "인스타 스토리로 공유"
4. 인스타 앱 자동 열림 → 스토리 편집 화면 확인

## ⚠️ 자주 발생하는 이슈
| 문제 | 원인 | 해결 |
|------|------|------|
| 인스타 안 열림 | 앱 미설치 | 인스타 설치 |
| iOS: 아무 반응 없음 | Info.plist에 스킴 등록 X | Info.plist LSApplicationQueriesSchemes 확인 |
| Android: "지원되지 않음" | App ID 오타 | main.dart의 appId 확인 |
| 이미지가 안 붙음 | 이미지 데이터 형식 | Base64 부분만 잘라내는지 확인 |

---

## 📌 오늘 할 일 (주인님 체크리스트)
- [ ] Facebook Developer 등록 → App ID 발급
- [ ] App ID 저에게 알려주기
- [ ] main.dart 패치 적용 (제가 도와드림)
- [ ] iOS AppDelegate.swift 교체 (제가 도와드림)
- [ ] Android MainActivity.kt 교체 (제가 도와드림)
- [ ] 앱 빌드 → 실기기 테스트
- [ ] 스토어 재신청
