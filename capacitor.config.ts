import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 건강어때 · Capacitor 설정
 *
 * 전략:
 *   - 쉘(네이티브 wrapper)은 앱스토어에 올림
 *   - 콘텐츠는 Vercel에서 실시간 로드 (server.url)
 *     → index.html을 수정하면 심사 없이 바로 반영 (OTA)
 *   - 네이티브 기능 (카메라/푸시/공유)은 Capacitor 플러그인 사용
 *
 * 전환 모드:
 *   - 개발·심사 통과용: server.url 비활성 (dist/ 번들 로드)
 *   - 운영: server.url 활성 (vercel.app 로드)
 */
const config: CapacitorConfig = {
  appId: 'com.healtheottae.app',       // 역순 도메인 (앱스토어 고유 ID)
  appName: '건강어때',
  webDir: 'dist',                       // build.js가 만드는 폴더
  bundledWebRuntime: false,

  // 운영 모드 · Vercel에서 실시간 로드
  // 심사 통과 후 활성화 (처음 심사는 번들 로드로 통과 추천)
  server: {
    url: 'https://peepeekit-urine-app-5h3f.vercel.app',
    cleartext: false,
    androidScheme: 'https'
    // 심사 중엔 이 server 블록 전체 주석 처리하고 번들로 심사받기
  },

  // iOS 세부 설정
  ios: {
    scheme: '건강어때',
    contentInset: 'always',             // 상단 노치/상태바 영역 보호
    backgroundColor: '#FFFFFF'
  },

  // Android 세부 설정
  android: {
    backgroundColor: '#FFFFFF',
    allowMixedContent: false,
    captureInput: true,                 // 입력창 포커스 시 키보드 안정
    webContentsDebuggingEnabled: false  // 운영 빌드엔 false
  },

  // 플러그인별 세부 설정
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#1E3A8A',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',                    // 상태바 글자 검정
      backgroundColor: '#FFFFFF'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      // iOS: Info.plist에 NSCameraUsageDescription 추가 필요
      // "건강어때는 식단 사진 등록을 위해 카메라를 사용합니다."
    }
  }
};

export default config;
