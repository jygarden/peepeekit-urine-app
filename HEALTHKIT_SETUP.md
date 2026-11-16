# 🏥 Apple HealthKit / Google Health Connect 연동 가이드

## 📦 설치 (완료)
- `@perfood/capacitor-healthkit` · iOS용
- `@kiwi-health/capacitor-health-connect` · Android용
- `assets/health/health-sync.js` · 공통 레이어

## 🍎 iOS 추가 설정 (Xcode에서)

### 1. HealthKit Entitlement 추가
Xcode → App 프로젝트 선택 → **Signing & Capabilities** → **+ Capability** → **HealthKit** 추가

### 2. Info.plist 권한 설명 추가
`ios/App/App/Info.plist`에 추가:

```xml
<key>NSHealthShareUsageDescription</key>
<string>건강어때는 걸음수·심박수·혈압·혈당·체중 데이터를 읽어 맞춤 식단과 운동을 추천해드립니다.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>건강어때는 분석한 식단/운동 데이터를 Apple 건강에 기록할 수 있습니다.</string>
```

### 3. 터미널
```bash
npm install
npx cap sync ios
npx cap open ios
```

## 🤖 Android 추가 설정

### 1. AndroidManifest.xml 권한 추가
`android/app/src/main/AndroidManifest.xml`의 `<application>` 밖에 추가:

```xml
<uses-permission android:name="android.permission.health.READ_STEPS"/>
<uses-permission android:name="android.permission.health.READ_HEART_RATE"/>
<uses-permission android:name="android.permission.health.READ_BLOOD_PRESSURE"/>
<uses-permission android:name="android.permission.health.READ_BLOOD_GLUCOSE"/>
<uses-permission android:name="android.permission.health.READ_WEIGHT"/>
<uses-permission android:name="android.permission.health.READ_BODY_FAT"/>
<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED"/>
<uses-permission android:name="android.permission.health.READ_SLEEP"/>

<queries>
    <package android:name="com.google.android.apps.healthdata"/>
</queries>
```

### 2. 터미널
```bash
npm install
npx cap sync android
npx cap open android
```

## 🔌 작동 방식

- **네이티브 앱**: 설정에서 "건강 앱 연동" 토글 ON → 권한 요청 → 12시간마다 자동 동기화
- **웹 PWA**: 플러그인 없어서 조용히 비활성 (수동 입력만 가능)

## 📊 수집 데이터

| 데이터 | iOS (HealthKit) | Android (Health Connect) |
|---|---|---|
| 걸음 수 | ✅ stepCount | ✅ Steps |
| 심박수 | ✅ heartRate | ✅ HeartRate |
| 혈압 | ✅ bloodPressure | ✅ BloodPressure |
| 혈당 | ✅ bloodGlucose | ✅ BloodGlucose |
| 체중 | ✅ bodyMass | ✅ Weight |
| 체지방률 | ✅ bodyFatPercentage | ✅ BodyFat |
| 운동 칼로리 | ✅ activeEnergyBurned | ✅ ActiveCaloriesBurned |
| 수면 | ✅ sleepAnalysis | ✅ SleepSession |

## 🧪 테스트

```js
// 브라우저 콘솔
await HealthSync.isAvailable();  // true / false
await HealthSync.requestPermissions();  // 권한 팝업
const data = await HealthSync.readAll();  // 최근 24h 데이터
console.log(data);
await HealthSync.syncToServer();  // body_logs에 저장
```

## ⚠️ 심사 주의사항

- **Apple**: HealthKit 사용 시 심사에서 "어떤 데이터를 왜 쓰는지" 명확히 설명해야 함
- **Google Play**: Health Connect 사용 시 "Prominent Disclosure" 필수 (설정 화면에 안내 문구)
