<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <!-- 🎨 Phosphor Icons (이모지 대체 데모) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/fill/style.css"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/duotone/style.css"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/bold/style.css"/>
  <!-- 🔤 Pretendard 폰트 (한국 헬스 앱 표준급) -->
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
  <!-- 🗄 Supabase REST 설정 (CDN 없이 fetch로 직접) -->
  <script>
    window.SUPABASE_URL = 'https://guvzbtemficekutgxngb.supabase.co';
    window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1dnpidGVtZmljZWt1dGd4bmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTkyMjcsImV4cCI6MjA5MTAzNTIyN30.u52nNN_iKreXF6R1jxe3NOtGHsnLbop4Z3t1hqY8fro';
  </script>
  <!-- 🚨 글로벌 에러 핸들러 (흰 화면 디버그용) -->
  <script>
  window.addEventListener('error', function(e) {
    try {
      var msg = 'JS Error: ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || '');
      console.error(msg);
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:50px;left:8px;right:8px;background:#dc2626;color:#fff;padding:10px;z-index:99999;font-size:11px;font-family:monospace;line-height:1.4;border-radius:6px;max-height:40vh;overflow:auto;white-space:pre-wrap';
      d.textContent = '🚨 ' + msg;
      (document.body || document.documentElement).appendChild(d);
    } catch(_) {}
  });
  window.addEventListener('unhandledrejection', function(e) {
    try {
      var msg = 'Promise Error: ' + (e.reason && (e.reason.message || e.reason) || 'unknown');
      console.error(msg);
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:120px;left:8px;right:8px;background:#7c2d12;color:#fff;padding:10px;z-index:99999;font-size:11px;font-family:monospace;border-radius:6px';
      d.textContent = '🚨 ' + msg;
      (document.body || document.documentElement).appendChild(d);
    } catch(_) {}
  });
  </script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <title>건강어때 — AI 건강검진</title>

  <!-- PWA 설정 -->
  <link rel="manifest" href="/manifest.json"/>
  <meta name="theme-color" content="#6366f1"/>
  <meta name="mobile-web-app-capable" content="yes"/>

  <!-- iOS 홈화면 앱 설정 -->
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="건강어때"/>
  <link rel="apple-touch-icon" href="/icon-192.png"/>

  <!-- 동글동글한 한글 폰트 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Gaegu:wght@400;700&display=swap" rel="stylesheet">

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <!-- Chart.js (추세 그래프용) -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <!-- jsPDF (PDF 리포트용) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <!-- 카카오 로그인 SDK -->
  <script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
    integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
    crossorigin="anonymous"></script>
  <script>
    const KAKAO_JS_KEY = 'aacf444a8f6bc5687084b289c7217ada';
    if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
  </script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    /* 🎨 디자인 시스템 v1 — Sage Green 메인 + Warm Orange 액센트 */
    :root{
      /* 메인 컬러 — 자연·건강의 sage green */
      --primary:#10B981;
      --primary-dark:#059669;
      --primary-darker:#047857;
      --primary-light:#D1FAE5;
      --primary-pale:#ECFDF5;
      --primary-text:#065F46;
      /* 액센트 — 따뜻한 오렌지 (강조용) */
      --accent:#F59E0B;
      --accent-dark:#D97706;
      --accent-light:#FEF3C7;
      --accent-pale:#FFFBEB;
      /* 그레이 스케일 (모든 텍스트·테두리) */
      --gray-50:#F8FAFC;
      --gray-100:#F1F5F9;
      --gray-200:#E2E8F0;
      --gray-300:#CBD5E1;
      --gray-400:#94A3B8;
      --gray-500:#64748B;
      --gray-600:#475569;
      --gray-700:#334155;
      --gray-800:#1F2937;
      --gray-900:#0F172A;
      /* 상태 컬러 */
      --danger:#EF4444;
      --danger-light:#FEE2E2;
      --warning:#F59E0B;
      --warning-light:#FEF3C7;
      --info:#3B82F6;
      --info-light:#DBEAFE;
      --success:#10B981;
      --success-light:#D1FAE5;
      /* 그림자 — 부드럽고 미묘하게 */
      --shadow-xs:0 1px 2px rgba(15,23,42,.04);
      --shadow-sm:0 2px 6px rgba(15,23,42,.05);
      --shadow:0 3px 12px rgba(15,23,42,.06);
      --shadow-md:0 6px 20px rgba(15,23,42,.08);
      --shadow-lg:0 12px 32px rgba(15,23,42,.1);
      /* radius 시스템 */
      --r-sm:8px;
      --r:12px;
      --r-md:14px;
      --r-lg:16px;
      --r-xl:20px;
      --r-2xl:24px;
      /* 4의 배수 간격 시스템 */
      --s-1:4px;
      --s-2:8px;
      --s-3:12px;
      --s-4:16px;
      --s-5:20px;
      --s-6:24px;
      --s-8:32px;
      --s-10:40px;
    }
    body{background:#F7F8FA;font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,system-ui,'Apple SD Gothic Neo','Noto Sans KR',Roboto,sans-serif;padding-bottom:0;color:var(--gray-900);-webkit-font-smoothing:antialiased;letter-spacing:-.2px}
    #app{max-width:430px;margin:0 auto;min-height:100vh}
    /* 헤더 전체 제거 */
    .header{display:none !important}

    /* ── 헤더 ── */
    .header{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:18px 20px 22px;color:#fff;position:sticky;top:0;z-index:200}
    .header-row{display:flex;justify-content:space-between;align-items:center}
    .header h1{font-size:19px;font-weight:800;letter-spacing:-.5px}
    .header p{font-size:11px;opacity:.85;margin-top:3px}
    .btn-history{background:rgba(255,255,255,.18);border:none;border-radius:8px;padding:6px 11px;color:#fff;font-size:11px;cursor:pointer;white-space:nowrap}
    .btn-back-home{background:rgba(255,255,255,.18);border:none;border-radius:8px;padding:6px 11px;color:#fff;font-size:11px;cursor:pointer;white-space:nowrap;margin-right:6px}

    /* ── 화면 ── */
    .screen{display:none;padding:16px 16px 40px}
    .screen.active{display:block}

    /* ── 공통 ── */
    .section-title{font-size:13px;font-weight:700;color:#334155;margin-bottom:8px}
    /* ── 페이지 헤더 (뒤로가기 + 제목) ── */
    .page-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-top:4px}
    .page-header .back-btn{
      flex-shrink:0;width:36px;height:36px;border-radius:10px;
      background:#F1F5F9;border:1px solid #E2E8F0;color:#334155;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;font-weight:700;cursor:pointer;
      transition:background .15s,transform .12s;
      font-family:inherit;line-height:1
    }
    .page-header .back-btn:hover{background:#E2E8F0}
    .page-header .back-btn:active{transform:scale(.92)}
    .page-header .page-title{
      font-size:16px;font-weight:800;color:#0F172A;
      letter-spacing:-.3px;flex:1
    }
    .card{background:#fff;border-radius:14px;padding:16px;margin-bottom:14px;box-shadow:0 1px 6px rgba(0,0,0,.07)}

    /* ── 입력 필드 ── */
    .field{margin-bottom:12px}
    .field label{display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px}
    .field input,.field select,.field textarea{
      width:100%;padding:10px 13px;border-radius:10px;
      border:1.5px solid #e2e8f0;font-size:13px;outline:none;
      background:#fff;color:#1e293b;-webkit-appearance:none
    }
    .field input:focus,.field select:focus{border-color:#6366f1}
    .field .row2{display:flex;gap:8px}
    .field .row2 select{flex:1}

    /* ════════════ 환영(Welcome) 화면 ════════════ */
    body.welcome-active{
      background:linear-gradient(180deg,#FAFCFF 0%,#EBF3FE 60%,#D5E6FB 100%);
      overflow-y:auto;-webkit-overflow-scrolling:touch
    }
    #screenWelcome{padding:0;display:none;position:relative;z-index:2;min-height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch}
    #screenWelcome.active{display:block}

    /* ── 오로라 배경 (더 강하게, 화면 전체 흐름) ── */
    .aurora-bg{position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden;display:none}
    body.welcome-active .aurora-bg{display:block}
    .aurora-blob{position:absolute;border-radius:50%;filter:blur(80px);will-change:transform;mix-blend-mode:screen}
    .aurora-blob.b1{width:620px;height:620px;left:-200px;top:30%;background:rgba(94,124,226,.65);animation:auroraFloat1 14s ease-in-out infinite}
    .aurora-blob.b2{width:520px;height:520px;right:-150px;top:55%;background:rgba(138,184,255,.7);animation:auroraFloat2 17s ease-in-out infinite}
    .aurora-blob.b3{width:480px;height:480px;left:20%;bottom:-180px;background:rgba(168,200,255,.75);animation:auroraFloat3 16s ease-in-out infinite}
    .aurora-blob.b4{width:380px;height:380px;right:10%;bottom:-100px;background:rgba(214,231,255,.85);animation:auroraFloat4 19s ease-in-out infinite}
    .aurora-blob.b5{width:340px;height:340px;left:40%;top:10%;background:rgba(177,210,253,.55);animation:auroraFloat5 20s ease-in-out infinite}
    .aurora-blob.b6{width:280px;height:280px;left:5%;top:5%;background:rgba(200,225,255,.5);animation:auroraFloat6 18s ease-in-out infinite}
    @keyframes auroraFloat1{
      0%,100%{transform:translate(0,0) scale(1)}
      33%{transform:translate(80px,-50px) scale(1.2)}
      66%{transform:translate(-40px,40px) scale(1.05)}
    }
    @keyframes auroraFloat2{
      0%,100%{transform:translate(0,0) scale(1)}
      50%{transform:translate(-90px,-60px) scale(.85)}
    }
    @keyframes auroraFloat3{
      0%,100%{transform:translate(0,0) scale(1)}
      33%{transform:translate(50px,-80px) scale(1.25)}
      66%{transform:translate(-30px,-30px) scale(1.05)}
    }
    @keyframes auroraFloat4{
      0%,100%{transform:translate(0,0) scale(1)}
      50%{transform:translate(-50px,-90px) scale(1.15)}
    }
    @keyframes auroraFloat5{
      0%,100%{transform:translate(0,0) scale(1)}
      50%{transform:translate(60px,80px) scale(1.1)}
    }
    @keyframes auroraFloat6{
      0%,100%{transform:translate(0,0) scale(1)}
      50%{transform:translate(70px,40px) scale(.9)}
    }

    .welcome-wrap{
      min-height:100vh;display:flex;flex-direction:column;align-items:center;
      padding:40px 24px 80px;position:relative;z-index:3;text-align:center
    }
    /* 환영 화면 활성 상태에서 body 스크롤 활성화 */
    body:has(#screenWelcome.active){overflow-y:auto;height:auto}
    .welcome-brand{
      font-size:15px;font-weight:700;color:var(--primary);letter-spacing:-.2px;
      opacity:0;animation:fadeSlideUp .7s cubic-bezier(.2,.8,.2,1) .15s forwards
    }
    .welcome-content{
      margin-top:32px;display:flex;flex-direction:column;align-items:center;width:100%;max-width:340px
    }
    .welcome-greet{
      font-size:15px;font-weight:500;color:#6E6E73;letter-spacing:-.2px;line-height:1.3;
      opacity:0;animation:fadeSlideUp .8s cubic-bezier(.2,.8,.2,1) .45s forwards
    }
    .welcome-name{
      font-size:32px;font-weight:700;color:#1D1D1F;letter-spacing:-1px;margin-top:10px;line-height:1.25;
      opacity:0;animation:fadeSlideUp .8s cubic-bezier(.2,.8,.2,1) .8s forwards
    }
    .welcome-wave{display:inline-block;animation:wave 1.6s ease-in-out 1.4s infinite;transform-origin:70% 70%}
    @keyframes wave{
      0%,100%{transform:rotate(0)}
      10%,30%{transform:rotate(-12deg)}
      20%,40%{transform:rotate(12deg)}
      50%{transform:rotate(0)}
    }
    .welcome-sub{
      font-size:13px;color:#6E6E73;letter-spacing:-.2px;margin-top:18px;font-weight:500;line-height:1.5;
      opacity:0;animation:fadeSlideUp .8s cubic-bezier(.2,.8,.2,1) 1.15s forwards
    }
    .welcome-input-wrap{
      margin-top:34px;width:100%;
      opacity:0;animation:fadeSlideUp .8s cubic-bezier(.2,.8,.2,1) 1.05s forwards
    }
    /* 카카오 로그인 버튼 */
    .kakao-btn{
      width:100%;padding:16px;border:none;border-radius:14px;
      background:#FEE500;color:#1A1A1A;font-size:15px;font-weight:700;cursor:pointer;
      font-family:inherit;letter-spacing:-.3px;display:flex;align-items:center;justify-content:center;gap:8px;
      box-shadow:0 4px 18px rgba(254,229,0,.40);transition:transform .2s,box-shadow .2s
    }
    .kakao-btn:hover{box-shadow:0 6px 24px rgba(254,229,0,.55)}
    .kakao-btn:active{transform:scale(.98)}
    .kakao-btn svg{width:20px;height:20px;flex-shrink:0}
    /* 모바일에서는 카카오 버튼 + 구분선 숨김 */
    body.is-mobile .kakao-btn,
    body.is-mobile .welcome-divider{display:none !important}
    .welcome-divider{
      display:flex;align-items:center;gap:10px;margin:18px 0 14px;
      font-size:11px;color:#9CA3B5;letter-spacing:-.1px
    }
    .welcome-divider::before,.welcome-divider::after{
      content:'';flex:1;height:1px;background:#DBE5F5
    }
    .welcome-input{
      width:100%;padding:14px 18px;border:1.5px solid #DBE5F5;border-radius:14px;
      font-size:13px;background:rgba(255,255,255,.85);outline:none;font-family:inherit;
      color:#1D1D1F;letter-spacing:-.3px;transition:border-color .2s, box-shadow .2s;
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)
    }
    .welcome-input::placeholder{color:#B0B8C5}
    .welcome-input:focus{border-color:#5E7CE2;box-shadow:0 0 0 4px rgba(94,124,226,.10)}
    .welcome-btn-secondary{
      width:100%;padding:13px;margin-top:8px;border:1px solid #DBE5F5;border-radius:14px;
      background:transparent;color:#5E7CE2;font-size:13px;font-weight:600;cursor:pointer;
      font-family:inherit;letter-spacing:-.2px;transition:background .2s
    }
    .welcome-btn-secondary:hover{background:rgba(94,124,226,.05)}
    .welcome-btn-secondary:active{transform:scale(.99)}
    .welcome-hint{
      margin-top:18px;text-align:center;font-size:11px;color:#7C8898;letter-spacing:-.15px;
      display:flex;align-items:center;justify-content:center;gap:5px;
      opacity:0;animation:fadeSlideUp .8s cubic-bezier(.2,.8,.2,1) 1.3s forwards
    }
    .welcome-hint svg{width:11px;height:11px;color:#7C8898;stroke:currentColor;stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
    /* 카카오 로딩 오버레이 */
    .kakao-loading{
      position:fixed;inset:0;background:rgba(247,247,245,.7);backdrop-filter:blur(8px);
      display:none;align-items:center;justify-content:center;z-index:9999;flex-direction:column;gap:14px
    }
    .kakao-loading.show{display:flex}
    .kakao-loading .spinner{
      width:38px;height:38px;border:3px solid rgba(94,124,226,.2);border-top-color:#5E7CE2;
      border-radius:50%;animation:spin 1s linear infinite
    }
    @keyframes spin{to{transform:rotate(360deg)}}
    .kakao-loading p{font-size:13px;color:#5E7CE2;font-weight:600;letter-spacing:-.2px}

    /* ════════════ 홈 화면 — 시안과 동일 ════════════ */
    body.home-active{background:#F7F7F5}
    #screenHome{padding:0}
    .home-wrap{padding:20px 26px 0;min-height:100vh;display:flex;flex-direction:column;position:relative}

    /* ── 진입 애니메이션 ── */
    @keyframes fadeSlideUp{
      from{opacity:0;transform:translateY(16px)}
      to{opacity:1;transform:translateY(0)}
    }
    @keyframes iconPop{
      0%{transform:scale(.85);opacity:0}
      60%{transform:scale(1.06);opacity:1}
      100%{transform:scale(1);opacity:1}
    }
    @keyframes softFloat{
      0%,100%{transform:translateY(0)}
      50%{transform:translateY(-3px)}
    }
    /* 홈에 들어왔을 때 한 번씩 등장 */
    #screenHome.active .home-title{animation:fadeSlideUp .55s cubic-bezier(.2,.8,.2,1) both}
    #screenHome.active .home-card:nth-child(1){animation:fadeSlideUp .55s cubic-bezier(.2,.8,.2,1) .12s both}
    #screenHome.active .home-card:nth-child(2){animation:fadeSlideUp .55s cubic-bezier(.2,.8,.2,1) .22s both}
    #screenHome.active .home-foot{animation:fadeSlideUp .55s cubic-bezier(.2,.8,.2,1) .34s both}
    /* 아이콘 안쪽 그림은 카드 등장 직후 살짝 팝 */
    #screenHome.active .home-card:nth-child(1) .hc-icon{animation:iconPop .55s cubic-bezier(.2,.8,.2,1) .35s both}
    #screenHome.active .home-card:nth-child(2) .hc-icon{animation:iconPop .55s cubic-bezier(.2,.8,.2,1) .45s both}

    /* 카드 hover: 들어올림 + 아이콘 확대 + 화살표 우측 nudge */
    .home-card{transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s,outline-color .2s}
    .hc-icon-wrap,.hc-icon,.hc-arrow{transition:transform .25s cubic-bezier(.2,.8,.2,1)}
    .home-card:hover .hc-icon-wrap{transform:scale(1.05)}
    .home-card:hover .hc-arrow{transform:translateX(3px)}
    /* 활성 탭(누르는 순간) */
    .home-card:active .hc-icon-wrap{transform:scale(.97)}

    /* 아이콘 박스에 미세하게 떠 있는 느낌 (홈 머무를 때만) */
    #screenHome.active .home-card .hc-icon-wrap{
      animation:softFloat 4.2s ease-in-out infinite 1s
    }
    #screenHome.active .home-card:nth-child(2) .hc-icon-wrap{
      animation-delay:2.1s
    }

    /* 상단 (타이틀 + 벨 버튼) */
    .home-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:32px}
    /* 🆕 새 홈 레이아웃 */
    .home-top-bar{position:absolute;top:20px;right:26px;display:flex;align-items:center;gap:8px;z-index:5}
    .home-hello{margin-bottom:22px;padding:0 2px}
    .home-hello h1{font-size:24px;font-weight:800;letter-spacing:-.7px;color:var(--gray-900);line-height:1.32;margin-bottom:12px}
    .home-hello .sub{font-size:12.5px;color:var(--gray-500);letter-spacing:-.2px;font-weight:500;line-height:1.6}
    .home-title{flex:1;min-width:0}
    .home-title h1{font-size:23px;font-weight:800;letter-spacing:-.7px;color:#1D1D1F;line-height:1.3}
    .home-title .sub{font-size:11px;color:#6E6E73;letter-spacing:-.2px;margin-top:10px;font-weight:500;line-height:1.5}
    .bell-btn{
      width:42px;height:42px;border-radius:50%;background:#fff;border:1px solid #E5E5EA;
      display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;
      color:#1D1D1F;box-shadow:0 1px 3px rgba(0,0,0,.04);padding:0;font-family:inherit;
      transition:transform .15s,box-shadow .2s
    }
    .bell-btn:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .bell-btn:active{transform:scale(.95)}
    .bell-btn svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
    /* 🆕 설정 버튼 (톱니바퀴) */
    .settings-btn{
      width:42px;height:42px;border-radius:50%;background:#fff;border:1px solid var(--gray-200);
      display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;
      color:var(--gray-700);box-shadow:var(--shadow-xs);padding:0;font-family:inherit;
      transition:transform .2s ease,box-shadow .2s ease,color .2s ease
    }
    .settings-btn:hover{box-shadow:var(--shadow-sm);color:var(--primary)}
    .settings-btn:active{transform:scale(.92) rotate(45deg)}

    /* 카드 — 크고 푹신한 박스 */
    .home-cards{display:flex;flex-direction:column;gap:16px;width:100%}
    .home-card{
      width:100%;background:#FFFFFF;border:none;border-radius:24px;
      padding:22px 22px 16px;cursor:pointer;display:flex;flex-direction:column;text-align:left;
      box-shadow:0 1px 2px rgba(0,0,0,.03),0 10px 26px rgba(0,0,0,.06);
      transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s,outline-color .2s;
      position:relative;overflow:hidden;-webkit-appearance:none;font-family:inherit;
      outline:1.5px solid transparent;outline-offset:-1.5px
    }
    .home-card:hover{box-shadow:0 1px 2px rgba(0,0,0,.04),0 14px 34px rgba(0,0,0,.09)}
    .home-card:active{transform:scale(.985)}
    .home-card.human:active{outline-color:#5E7CE2}
    .home-card.pet:active{outline-color:#8FC9B5}
    .card-top{display:flex;align-items:center;gap:18px}
    .card-divider{display:none}
    /* 카드 footer — 알약(pill) 뱃지 */
    .card-footer{display:flex;align-items:center;gap:6px;margin-top:14px;flex-wrap:wrap}
    .card-pill{
      display:inline-flex;align-items:center;gap:5px;
      padding:5px 11px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:-.1px;
      color:#5E7CE2;background:rgba(94,124,226,.10)
    }
    .home-card.pet .card-pill.subj-pill{
      color:#4EA483;background:rgba(110,175,146,.13)
    }
    .card-pill.time-pill{color:#6E6E73;background:#F2F2F4}
    .card-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
    .card-pill svg{width:11px;height:11px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}

    /* 아이콘 원 — 그라데이션 글로우 */
    .hc-icon-wrap{
      width:78px;height:78px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
      position:relative
    }
    .home-card.human .hc-icon-wrap{
      background:radial-gradient(circle at 30% 30%, #FFFFFF 0%, #DEE9FF 60%, #C5D8FB 100%);
      box-shadow:0 4px 18px rgba(94,124,226,.18), inset 0 1px 2px rgba(255,255,255,.8)
    }
    .home-card.pet .hc-icon-wrap{
      background:radial-gradient(circle at 30% 30%, #FFFFFF 0%, #DAF0E5 60%, #BDE2D0 100%);
      box-shadow:0 4px 18px rgba(143,201,181,.25), inset 0 1px 2px rgba(255,255,255,.8)
    }
    .home-card.food .hc-icon-wrap{
      background:radial-gradient(circle at 30% 30%, #FFFFFF 0%, #FFEEDB 60%, #FFD8A8 100%);
      box-shadow:0 4px 18px rgba(245,158,11,.22), inset 0 1px 2px rgba(255,255,255,.8)
    }
    .home-card.food .hc-icon{color:#F59E0B}
    .home-card.food:active{outline-color:#F59E0B}
    .home-card.food .card-pill.subj-pill{color:#D97706;background:rgba(245,158,11,.13)}
    .hc-icon{width:44px;height:44px;display:block}
    .home-card.human .hc-icon{color:#5E7CE2}
    .home-card.pet .hc-icon{color:#4EA483}
    .hc-icon path,.hc-icon circle,.hc-icon ellipse,.hc-icon line{
      stroke:currentColor;stroke-width:1.1;fill:none;stroke-linecap:round;stroke-linejoin:round
    }
    .hc-icon [data-fill]{fill:currentColor;stroke:none}

    /* 텍스트 */
    .hc-content{flex:1;min-width:0}
    .hc-content h3{font-size:14.5px;font-weight:700;letter-spacing:-.35px;color:#1D1D1F;line-height:1.25;margin-bottom:6px}
    .hc-content p{font-size:10.5px;color:#6E6E73;letter-spacing:-.15px;font-weight:500;line-height:1.55}

    .hc-arrow{width:9px;height:14px;color:#C7C7CC;flex-shrink:0;margin-left:2px}
    .hc-arrow path{stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}

    /* 최근 검사 기록 섹션 */
    .recent-section{margin-top:24px}
    .recent-title{font-size:12.5px;font-weight:700;color:#1D1D1F;margin-bottom:10px;letter-spacing:-.3px;padding-left:4px}
    .recent-empty{
      background:#fff;border:none;border-radius:20px;padding:18px 18px;width:100%;
      display:flex;align-items:center;gap:14px;cursor:pointer;text-align:left;font-family:inherit;
      box-shadow:0 1px 2px rgba(0,0,0,.03),0 6px 18px rgba(0,0,0,.05);transition:transform .2s
    }
    .recent-empty:active{transform:scale(.99)}
    .recent-icon{
      width:42px;height:42px;border-radius:14px;background:#EFEEF3;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#6E6E73
    }
    .recent-icon svg{width:22px;height:22px;stroke:currentColor;stroke-width:1.4;fill:none;stroke-linecap:round;stroke-linejoin:round}
    .recent-text{flex:1;min-width:0}
    .empty-title{font-size:12.5px;font-weight:600;color:#1D1D1F;letter-spacing:-.2px;line-height:1.3}
    .empty-sub{font-size:10.5px;color:#6E6E73;margin-top:3px;letter-spacing:-.1px}

    /* 하단 면책 (방패 아이콘) */
    .bottom-disclaimer{
      margin-top:auto;padding:30px 0 26px;display:flex;align-items:center;justify-content:center;gap:6px;
      font-size:10px;color:#6E6E73;text-align:center;letter-spacing:-.1px
    }
    .bottom-disclaimer svg{width:12px;height:12px;color:#6E6E73;stroke:currentColor;stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
    /* ── 키트 구매 카드 (홈) ── */
    .kit-purchase{
      margin-top:24px;background:linear-gradient(135deg,#F0F4FF 0%,#FDF2F8 100%);
      border-radius:20px;padding:18px;display:flex;align-items:center;gap:14px;
      text-decoration:none;color:inherit;cursor:pointer;
      box-shadow:0 1px 2px rgba(0,0,0,.03),0 6px 18px rgba(99,102,241,.10);
      transition:transform .2s,box-shadow .2s;border:1px solid rgba(99,102,241,.10)
    }
    .kit-purchase:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.06),0 12px 28px rgba(99,102,241,.18)}
    .kit-purchase:active{transform:scale(.985)}
    .kit-purchase .kit-emoji{
      width:50px;height:50px;border-radius:14px;background:#fff;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
      font-size:26px;box-shadow:0 2px 8px rgba(0,0,0,.06)
    }
    .kit-purchase .kit-text{flex:1;min-width:0}
    .kit-purchase .kit-title{font-size:13.5px;font-weight:700;color:#1D1D1F;letter-spacing:-.3px;line-height:1.3}
    .kit-purchase .kit-sub{font-size:11px;color:#6E6E73;margin-top:3px;letter-spacing:-.1px;line-height:1.5}
    .kit-purchase .kit-arrow{width:9px;height:14px;color:#5E7CE2;flex-shrink:0}
    .kit-purchase .kit-arrow path{stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}
    .kit-purchase .smartstore-badge{
      display:inline-block;background:#03C75A;color:#fff;font-size:9px;font-weight:700;
      padding:2px 6px;border-radius:4px;margin-right:4px;letter-spacing:-.1px;vertical-align:middle
    }
    /* ── 키트 구매 CTA (결과 화면) ── */
    .kit-cta{
      margin:14px 0;background:linear-gradient(135deg,#6366f1,#8b5cf6);
      border-radius:16px;padding:18px 16px;color:#fff;display:flex;align-items:center;gap:12px;
      text-decoration:none;cursor:pointer;box-shadow:0 6px 20px rgba(99,102,241,.32);
      transition:transform .2s,box-shadow .2s
    }
    .kit-cta:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(99,102,241,.42)}
    .kit-cta:active{transform:scale(.985)}
    .kit-cta .cta-emoji{font-size:28px;flex-shrink:0}
    .kit-cta .cta-text{flex:1;min-width:0}
    .kit-cta .cta-title{font-size:14px;font-weight:800;letter-spacing:-.3px;color:#fff}
    .kit-cta .cta-sub{font-size:11px;opacity:.9;margin-top:3px;letter-spacing:-.1px;color:#fff}
    .kit-cta .cta-arrow{font-size:16px;font-weight:700}
    /* ── 식단 분석 화면 ── */
    .meal-time-row{display:flex;gap:8px;margin-bottom:14px}
    .meal-time-btn{flex:1;padding:11px 6px;background:#fff;border:1.5px solid #E5E5EA;border-radius:12px;cursor:pointer;text-align:center;font-size:13px;font-weight:700;color:#6E6E73;font-family:inherit;transition:all .15s}
    .meal-time-btn.active{background:linear-gradient(135deg,#F59E0B,#EA580C);border-color:transparent;color:#fff;box-shadow:0 3px 10px rgba(245,158,11,.32)}
    /* 칼로리 큰 표시 */
    .calorie-hero{background:linear-gradient(135deg,#FEF3C7,#FCD34D);border-radius:20px;padding:22px 18px;text-align:center;color:#78350F;margin-bottom:14px;box-shadow:0 4px 18px rgba(251,191,36,.30)}
    .calorie-label{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;opacity:.7;margin-bottom:6px}
    .calorie-num{font-size:42px;font-weight:900;letter-spacing:-1.5px;line-height:1;font-family:ui-rounded,'SF Pro Rounded',system-ui}
    .calorie-unit{font-size:18px;font-weight:700;opacity:.8;margin-left:3px}
    .calorie-sub{font-size:11px;margin-top:6px;opacity:.85}
    /* 영양소 막대 */
    .nutri-grid{background:#fff;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 1px 6px rgba(0,0,0,.05)}
    .nutri-title{font-size:13px;font-weight:800;color:#1D1D1F;margin-bottom:12px;display:flex;align-items:center;gap:6px}
    .nutri-item{margin-bottom:10px}
    .nutri-item:last-child{margin-bottom:0}
    .nutri-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .nutri-name{font-size:12px;color:#475569;font-weight:600}
    .nutri-val{font-size:12px;color:#1D1D1F;font-weight:700}
    .nutri-bar{height:6px;border-radius:3px;background:#F1F5F9;overflow:hidden}
    .nutri-fill{height:100%;border-radius:3px;transition:width .5s ease-out}
    .nutri-fill.carbs{background:linear-gradient(90deg,#FBBF24,#F59E0B)}
    .nutri-fill.protein{background:linear-gradient(90deg,#A78BFA,#7C3AED)}
    .nutri-fill.fat{background:linear-gradient(90deg,#FB7185,#E11D48)}
    .nutri-fill.fiber{background:linear-gradient(90deg,#86EFAC,#22C55E)}
    .nutri-fill.sodium{background:linear-gradient(90deg,#94A3B8,#64748B)}
    .nutri-fill.sugar{background:linear-gradient(90deg,#F9A8D4,#EC4899)}
    /* 인식된 음식 리스트 */
    .food-list{background:#fff;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 1px 6px rgba(0,0,0,.05)}
    .food-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F1F5F9;font-size:13px}
    .food-item:last-child{border-bottom:none}
    .food-item .fname{font-weight:600;color:#1D1D1F}
    .food-item .famount{color:#6E6E73;font-size:11px;margin-left:6px}
    .food-item .fcal{color:#F59E0B;font-weight:800}
    /* 하이라이트 */
    .highlight-item{display:flex;gap:8px;padding:9px 11px;border-radius:10px;margin-bottom:6px;font-size:12px;line-height:1.5}
    .highlight-item.good{background:#F0FDF4;color:#15803D}
    .highlight-item.warning{background:#FFFBEB;color:#92400E}
    .highlight-item.danger{background:#FFF1F2;color:#9F1239}
    /* ── 🎯 검사 변화 비교 카드 ── */
    .compare-card{background:linear-gradient(135deg,#ECFDF5 0%,#DBEAFE 100%);border:2px solid #A7F3D0;border-radius:22px;padding:20px;margin-bottom:14px;position:relative;overflow:hidden}
    .compare-card.declined{background:linear-gradient(135deg,#FEF2F2 0%,#FFF7ED 100%);border-color:#FDBA74}
    .compare-card.same{background:linear-gradient(135deg,#F9FAFB 0%,#F3F4F6 100%);border-color:#E5E7EB}
    .compare-title{font-size:13px;font-weight:800;color:#065F46;letter-spacing:-.3px;margin-bottom:12px;display:flex;align-items:center;gap:6px}
    .compare-card.declined .compare-title{color:#9A3412}
    .compare-card.same .compare-title{color:#374151}
    .compare-score-row{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.6);border-radius:14px;padding:14px 16px;margin-bottom:12px}
    .compare-score-item{text-align:center;flex:1}
    .compare-score-label{font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
    .compare-score-num{font-size:32px;font-weight:900;color:#1D1D1F;line-height:1;font-family:ui-rounded,'SF Pro Rounded',system-ui;letter-spacing:-1px}
    .compare-arrow{font-size:24px;color:#10B981;margin:0 8px}
    .compare-card.declined .compare-arrow{color:#EF4444}
    .compare-card.same .compare-arrow{color:#94A3B8}
    .compare-diff{display:inline-block;background:#10B981;color:#fff;font-size:13px;font-weight:800;padding:4px 12px;border-radius:999px;margin-top:6px}
    .compare-card.declined .compare-diff{background:#EF4444}
    .compare-card.same .compare-diff{background:#94A3B8}
    .compare-items{background:rgba(255,255,255,.6);border-radius:12px;padding:10px 14px;margin-bottom:10px}
    .compare-item-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;border-bottom:1px solid rgba(0,0,0,.06)}
    .compare-item-row:last-child{border-bottom:none}
    .compare-item-name{font-weight:600;color:#1D1D1F}
    .compare-item-change{font-weight:700}
    .compare-item-change.up{color:#059669}
    .compare-item-change.down{color:#DC2626}
    .compare-item-change.flat{color:#6B7280}
    .compare-message{background:rgba(255,255,255,.7);border-radius:12px;padding:11px 14px;font-size:12.5px;color:#0F766E;line-height:1.6;font-weight:600}
    .compare-card.declined .compare-message{color:#9A3412}
    .compare-card.same .compare-message{color:#374151}
    .compare-period{font-size:10.5px;color:#6B7280;margin-top:8px;text-align:center;letter-spacing:-.1px}
    /* ── 🤖 AI 영양사 채팅 ── */
    .chat-btn-row{background:linear-gradient(135deg,#FEF3C7,#FCD34D);border:none;border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px;width:100%;cursor:pointer;font-family:inherit;text-align:left;margin-bottom:14px;box-shadow:0 3px 10px rgba(251,191,36,.25);transition:transform .15s,box-shadow .2s}
    .chat-btn-row:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(251,191,36,.35)}
    .chat-btn-row:active{transform:scale(.985)}
    .chat-btn-ic{font-size:28px;flex-shrink:0}
    .chat-btn-text{flex:1}
    .chat-btn-title{font-size:13px;font-weight:800;color:#78350F}
    .chat-btn-sub{font-size:11px;color:#92400E;margin-top:2px}
    .chat-btn-arrow{color:#78350F;font-size:16px;font-weight:800}
    /* 채팅 화면 */
    #screenChat{padding:0;background:#F7F7F5}
    .chat-header{background:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E5E5EA;position:sticky;top:0;z-index:10}
    .chat-header h2{font-size:15px;font-weight:800;color:#1D1D1F}
    .chat-header h2 .sub{font-size:10px;color:#6E6E73;font-weight:500;display:block;margin-top:2px}
    .chat-back{background:none;border:none;color:#6366F1;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
    .chat-messages{padding:16px;min-height:calc(100vh - 200px);display:flex;flex-direction:column;gap:10px;padding-bottom:90px}
    .chat-msg{max-width:80%;padding:11px 14px;border-radius:18px;font-size:13px;line-height:1.5;letter-spacing:-.1px;word-break:break-word}
    .chat-msg.user{align-self:flex-end;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;border-bottom-right-radius:6px}
    .chat-msg.ai{align-self:flex-start;background:#fff;color:#1D1D1F;border:1px solid #E5E5EA;border-bottom-left-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
    .chat-msg.typing{align-self:flex-start;background:#fff;border:1px solid #E5E5EA;padding:14px;border-radius:18px;border-bottom-left-radius:6px}
    .chat-typing-dots{display:flex;gap:4px}
    .chat-typing-dots span{width:8px;height:8px;border-radius:50%;background:#94A3B8;animation:typing 1.4s infinite ease-in-out}
    .chat-typing-dots span:nth-child(2){animation-delay:.2s}
    .chat-typing-dots span:nth-child(3){animation-delay:.4s}
    @keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
    .chat-input-bar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);max-width:430px;width:100%;background:#fff;padding:12px 14px;border-top:1px solid #E5E5EA;display:flex;gap:8px;z-index:20}
    .chat-input-bar input{flex:1;padding:11px 15px;border:1.5px solid #E5E5EA;border-radius:999px;font-size:13px;outline:none;font-family:inherit;background:#F7F7F5}
    .chat-input-bar input:focus{border-color:#6366F1;background:#fff}
    .chat-input-bar button{background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;border:none;border-radius:50%;width:42px;height:42px;font-size:15px;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(99,102,241,.4);flex-shrink:0}
    .chat-input-bar button:disabled{background:#94A3B8;box-shadow:none}
    .chat-suggestions{display:flex;gap:6px;overflow-x:auto;padding:8px 14px;background:#fff;border-top:1px solid #f1f5f9}
    .chat-suggest{flex-shrink:0;background:#F1F5F9;border:none;border-radius:999px;padding:7px 13px;font-size:11.5px;font-weight:600;color:#475569;cursor:pointer;font-family:inherit}
    .chat-suggest:hover{background:#E2E8F0}
    /* ── 📅 이번 주 액션 플랜 ── */
    .action-plan{background:linear-gradient(135deg,#F0F9FF,#E0F2FE);border:1.5px solid #7DD3FC;border-radius:18px;padding:18px;margin-bottom:14px}
    .action-plan-title{font-size:14px;font-weight:800;color:#0C4A6E;margin-bottom:12px;display:flex;align-items:center;gap:6px}
    .action-plan-day{background:rgba(255,255,255,.7);border-radius:12px;padding:11px 14px;margin-bottom:7px;display:flex;align-items:flex-start;gap:11px}
    .action-plan-day.today{background:#FCD34D;border:2px solid #F59E0B}
    .action-plan-dow{font-size:13px;font-weight:800;color:#0369A1;min-width:30px}
    .action-plan-day.today .action-plan-dow{color:#78350F}
    .action-plan-text{flex:1;font-size:11.5px;color:#075985;line-height:1.6}
    .action-plan-day.today .action-plan-text{color:#7C2D12;font-weight:600}
    .action-plan-check{width:18px;height:18px;border:1.5px solid #94A3B8;border-radius:6px;cursor:pointer;flex-shrink:0;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;color:transparent}
    .action-plan-check.done{background:#10B981;border-color:#10B981;color:#fff}
    /* ── 🔍 음식 인식 확인 화면 ── */
    .confirm-hero{background:linear-gradient(135deg,#FEF3C7,#FCD34D);border-radius:18px;padding:18px;text-align:center;color:#78350F;margin-bottom:14px}
    .confirm-hero h2{font-size:16px;font-weight:800;margin-bottom:4px}
    .confirm-hero p{font-size:12px;opacity:.85;line-height:1.5}
    .confirm-food-card{background:#fff;border-radius:16px;padding:14px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
    .confirm-food-name{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    .confirm-food-name input{flex:1;background:#F7F7F5;border:1.5px solid #E5E5EA;border-radius:10px;padding:9px 12px;font-size:14px;font-weight:700;color:#1D1D1F;outline:none;font-family:inherit}
    .confirm-food-name input:focus{border-color:#F59E0B;background:#fff}
    .confirm-ingredients-label{font-size:11px;font-weight:700;color:#6E6E73;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}
    .confirm-ing-chip{display:inline-flex;align-items:center;gap:6px;background:#FFFBEB;border:1.5px solid #FCD34D;color:#78350F;border-radius:999px;padding:6px 11px 6px 14px;font-size:12.5px;font-weight:600;margin:0 5px 5px 0}
    .confirm-ing-chip input{background:transparent;border:none;outline:none;width:auto;font-family:inherit;font-size:12.5px;font-weight:600;color:#78350F;padding:0;max-width:120px;min-width:30px}
    .confirm-ing-chip button{background:rgba(0,0,0,.10);border:none;width:18px;height:18px;border-radius:50%;font-size:10px;color:#78350F;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0}
    .confirm-ing-chip button:hover{background:rgba(0,0,0,.18)}
    .confirm-add-btn{background:#fff;border:1.5px dashed #F59E0B;color:#F59E0B;border-radius:999px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin:5px 5px 0 0}
    .confirm-actions{margin-top:14px;display:flex;flex-direction:column;gap:8px}
    /* 음식별 카드(결과) — 기능성 영양소 표시 */
    .food-detail-card{background:#fff;border-radius:14px;padding:13px 16px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,.05);border-left:3px solid #F59E0B}
    .food-detail-name{font-size:14px;font-weight:800;color:#1D1D1F;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center}
    .food-detail-amount{font-size:11px;color:#6E6E73;font-weight:500}
    .food-detail-cal{color:#F59E0B;font-weight:800;font-size:13px}
    .key-nutrient-row{background:linear-gradient(135deg,#FEF3C7,#FFFBEB);border-radius:10px;padding:9px 11px;margin-top:8px;font-size:11.5px;color:#78350F;line-height:1.5}
    .key-nutrient-row strong{color:#78350F;font-weight:800}
    /* 음식 궁합 박스 */
    .pairings-box{background:linear-gradient(135deg,#F0FDF4,#DBEAFE);border:1.5px solid #BBF7D0;border-radius:16px;padding:16px;margin-bottom:12px}
    .pairings-title{font-size:13.5px;font-weight:800;color:#065F46;margin-bottom:10px;display:flex;align-items:center;gap:6px}
    .pair-item{background:rgba(255,255,255,.7);border-radius:10px;padding:9px 12px;margin-bottom:6px;font-size:12px;line-height:1.5}
    .pair-item.good{color:#065F46}
    .pair-item.warning{color:#9A3412;background:rgba(255,237,213,.8)}
    .pair-combo{font-weight:700;margin-bottom:2px}
    .pair-reason{font-size:11px;opacity:.85}
    /* 오늘 비교 박스 */
    .today-compare-box{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:14px 16px;margin-bottom:var(--s-3);font-size:12.5px;color:var(--gray-700);line-height:1.65;box-shadow:var(--shadow-xs)}
    .today-compare-box::before{content:"💬 ";font-size:14px}
    /* 라이트 팁 박스 */
    .light-tips-box{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:18px;margin-bottom:var(--s-3);box-shadow:var(--shadow-xs)}
    .light-tips-title{font-size:13px;font-weight:800;color:#5B21B6;margin-bottom:9px;display:flex;align-items:center;gap:6px}
    .light-tip-item{font-size:12px;color:#4C1D95;line-height:1.6;padding:6px 0;display:flex;gap:8px}
    .light-tip-item:not(:last-child){border-bottom:1px solid rgba(196,181,253,.3)}
    .light-tip-item::before{content:"💡";flex-shrink:0}
    /* 다음 식사 (현실적) */
    .next-meal-cta{background:linear-gradient(135deg,#FEF3C7,#FCD34D);border:1.5px solid #FBBF24;border-radius:16px;padding:14px 16px;margin-bottom:12px}
    .next-meal-title{font-size:13px;font-weight:800;color:#78350F;margin-bottom:6px;display:flex;align-items:center;gap:6px}
    .next-meal-menu{font-size:14px;font-weight:800;color:#9A3412;margin-bottom:4px}
    .next-meal-reason{font-size:12px;color:#92400E;line-height:1.5}
    /* ── 📊 종합 리포트 화면 ── */
    #screenReport{padding:0}
    .report-wrap{padding:22px 18px 40px}
    .report-back{background:none;border:none;color:#F59E0B;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:14px}
    .report-tabs{display:flex;gap:6px;background:#F1F5F9;border-radius:12px;padding:4px;margin-bottom:18px}
    .report-tab{flex:1;padding:9px;border:none;background:transparent;border-radius:9px;font-size:12.5px;font-weight:700;color:#64748B;cursor:pointer;font-family:inherit;transition:all .15s}
    .report-tab.active{background:#fff;color:#F59E0B;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .report-summary-card{background:linear-gradient(135deg,var(--primary-pale) 0%,#fff 70%);border:1px solid var(--primary-light);border-radius:var(--r-lg);padding:22px 18px;color:var(--primary-text);margin-bottom:var(--s-3);text-align:center;box-shadow:var(--shadow-xs)}
    .report-summary-num{font-size:30px;font-weight:900;line-height:1}
    .report-summary-label{font-size:11px;opacity:.85;margin-top:4px}
    .report-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
    .report-stat-card{background:#fff;border-radius:14px;padding:14px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05)}
    .report-stat-num{font-size:22px;font-weight:900;color:#1D1D1F;line-height:1}
    .report-stat-label{font-size:11px;color:#6E6E73;margin-top:4px}
    .report-section{background:#fff;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
    .report-section-title{font-size:13.5px;font-weight:800;color:#1D1D1F;margin-bottom:12px;display:flex;align-items:center;gap:6px}
    .nutri-deficit-bar{height:6px;border-radius:3px;background:#F1F5F9;overflow:hidden;margin-top:5px}
    .nutri-deficit-fill{height:100%;background:linear-gradient(90deg,#EF4444,#F59E0B);border-radius:3px}
    /* ════════════ 🎮 게임 스타일 식단 결과 ════════════ */
    /* 영양사 캐릭터 + 말풍선 */
    .nutritionist-talk{display:flex;align-items:flex-start;gap:12px;margin-bottom:18px;animation:bounceIn .6s ease-out}
    @keyframes bounceIn{0%{transform:scale(.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(.95)}100%{transform:scale(1);opacity:1}}
    .nutri-char{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#FCD34D,#F59E0B);display:flex;align-items:center;justify-content:center;font-size:34px;flex-shrink:0;box-shadow:0 6px 18px rgba(245,158,11,.35);animation:floatChar 3s ease-in-out infinite;position:relative}
    @keyframes floatChar{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-4px) rotate(2deg)}}
    .nutri-char::after{content:"";position:absolute;top:-3px;right:-3px;width:18px;height:18px;background:#10B981;border:3px solid #fff;border-radius:50%;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
    .speech-bubble{flex:1;background:#fff;border-radius:18px;border-bottom-left-radius:4px;padding:14px 16px;box-shadow:0 4px 14px rgba(0,0,0,.08);position:relative;font-size:13px;color:#1D1D1F;line-height:1.55}
    .speech-bubble::before{content:"";position:absolute;left:-7px;top:14px;width:0;height:0;border-style:solid;border-width:6px 10px 6px 0;border-color:transparent #fff transparent transparent;filter:drop-shadow(-1px 1px 1px rgba(0,0,0,.04))}
    .speech-name{font-size:11px;font-weight:800;color:#F59E0B;margin-bottom:4px;letter-spacing:-.1px}
    .speech-text{font-weight:500}
    /* 게임 점수 카드 (원형) */
    .game-score-card{background:linear-gradient(135deg,var(--primary-pale) 0%,#fff 70%);border-radius:var(--r-xl);padding:28px 20px;text-align:center;color:var(--primary-text);margin-bottom:var(--s-4);box-shadow:var(--shadow-sm);border:1px solid var(--primary-light);position:relative}
    .game-score-card::before{display:none}
    .game-rank-badge{display:inline-block;background:#fff;color:var(--primary-text);font-size:10.5px;font-weight:800;padding:5px 14px;border-radius:999px;margin-bottom:12px;letter-spacing:.5px;border:1px solid var(--primary-light)}
    .game-score-ring{width:120px;height:120px;margin:0 auto 12px;position:relative;display:flex;align-items:center;justify-content:center}
    .game-score-ring svg{transform:rotate(-90deg)}
    .game-score-ring .ring-bg{fill:none;stroke:var(--gray-100);stroke-width:8}
    .game-score-ring .ring-fill{fill:none;stroke:var(--primary);stroke-width:8;stroke-linecap:round;transition:stroke-dashoffset 1s ease-out}
    .game-score-num{position:absolute;font-size:42px;font-weight:800;color:var(--gray-900);letter-spacing:-1.5px;font-feature-settings:"tnum"}
    .game-score-label{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;opacity:.7;margin-top:8px}
    .game-grade-stars{font-size:18px;letter-spacing:3px;margin-top:6px}
    /* 게임 스텟 바 (HP·MP 스타일) */
    .game-stats-card{background:#fff;border-radius:var(--r-md);padding:20px;margin-bottom:var(--s-3);border:1px solid var(--gray-200);box-shadow:var(--shadow-xs)}
    .game-stats-title{font-size:15px;font-weight:800;color:var(--gray-900);margin-bottom:18px;letter-spacing:-.3px}
    .game-stat-row{margin-bottom:14px}
    .game-stat-row:last-child{margin-bottom:0}
    .game-stat-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;font-size:12.5px}
    .game-stat-name{color:var(--gray-700);font-weight:600;letter-spacing:-.2px}
    .game-stat-value{color:#6E6E73;font-weight:600}
    .game-stat-bar-wrap{height:8px;background:var(--gray-100);border-radius:99px;overflow:hidden;position:relative}
    .game-stat-bar{height:100%;border-radius:99px;transition:width 1s cubic-bezier(.2,.8,.2,1)}
    .game-stat-bar.carbs{background-color:var(--primary)}
    .game-stat-bar.protein{background-color:var(--primary)}
    .game-stat-bar.fat{background-color:var(--primary)}
    .game-stat-bar.fiber{background-color:var(--primary)}
    .game-stat-bar.sodium{background-color:var(--gray-400)}
    .game-stat-bar.sugar{background-color:var(--gray-400)}
    /* 음식 게임 카드 — 깔끔한 솔리드 */
    .food-game-card{background:#fff;border-radius:var(--r-md);padding:18px;margin-bottom:var(--s-3);box-shadow:var(--shadow-xs);border:1px solid var(--gray-200);position:relative;transition:box-shadow .2s ease}
    .food-game-card:hover{box-shadow:var(--shadow-sm)}
    .food-game-card::before{display:none}
    .food-game-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;position:relative}
    .food-game-name{font-size:15px;font-weight:800;color:#1D1D1F;letter-spacing:-.3px}
    .food-game-amount{font-size:11px;color:#92400E;font-weight:600;margin-top:2px}
    .food-game-cal-badge{background:var(--primary-pale);color:var(--primary-text);font-size:11.5px;font-weight:800;padding:5px 11px;border-radius:999px;border:1px solid var(--primary-light)}
    .food-game-skills{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
    .skill-badge{background:var(--gray-100);color:var(--gray-700);font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;border:1px solid var(--gray-200);display:inline-flex;align-items:center;gap:4px;letter-spacing:-.1px}
    .skill-badge::before{content:""}
    .food-game-skill-detail{font-size:10.5px;color:#92400E;margin-top:5px;line-height:1.5;padding-left:14px;border-left:2px solid #FCD34D;margin-left:2px}
    /* 🎨 Phosphor 아이콘 데모 스타일 */
    .pair-icon-good{color:#10B981;font-size:15px;margin-right:2px;filter:drop-shadow(0 1px 2px rgba(16,185,129,.3))}
    .pair-icon-bad{color:#EF4444;font-size:15px;margin-right:2px;filter:drop-shadow(0 1px 2px rgba(239,68,68,.3))}
    .food-icon{color:#F59E0B;font-size:18px;vertical-align:-3px;margin-right:4px;filter:drop-shadow(0 2px 3px rgba(245,158,11,.35))}
    /* 음식 카드 안에 통합된 궁합 섹션 */
    .card-pairings{margin-top:10px;padding-top:10px;border-top:1.5px dashed #FCD34D}
    .card-pairings-title{font-size:11.5px;font-weight:800;margin-bottom:6px;margin-top:8px;letter-spacing:-.2px}
    .card-pairings-title:first-child{margin-top:0}
    .card-pairings-title.good-title{color:#065F46}
    .card-pairings-title.bad-title{color:#991B1B}
    .card-pair-row{font-size:11px;line-height:1.55;padding:4px 8px;margin-bottom:3px;border-radius:7px;display:flex;align-items:baseline;flex-wrap:wrap;gap:3px}
    .card-pair-row.good{background:var(--primary-pale);color:var(--primary-text);border-left:3px solid var(--primary)}
    .card-pair-row.bad{background:#FEF2F2;color:#991B1B;border-left:3px solid #EF4444}
    .card-pair-row strong{font-weight:700}
    .card-pair-reason{opacity:.85;font-size:10.5px;margin-left:2px}
    /* 📸 사진 찍기 화면 — 프로필 입력 배너 */
    .capture-profile-empty{background:#fff;border:1.5px dashed var(--gray-300);border-radius:var(--r-md);padding:14px;display:flex;align-items:center;gap:11px;cursor:pointer;transition:all .15s ease}
    .capture-profile-empty:hover{border-color:var(--primary);background:var(--primary-pale)}
    .capture-profile-empty:active{transform:scale(.99)}
    .cpe-icon{font-size:24px;flex-shrink:0;line-height:1}
    .cpe-body{flex:1;min-width:0}
    .cpe-title{font-size:13.5px;font-weight:800;color:var(--gray-800);margin-bottom:3px;letter-spacing:-.2px}
    .cpe-sub{font-size:11.5px;color:var(--gray-500);line-height:1.55}
    .cpe-arrow{font-size:22px;color:var(--gray-400);font-weight:800;flex-shrink:0}
    .capture-profile-filled{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:14px;box-shadow:var(--shadow-xs)}
    .cpf-row{display:flex;align-items:center;gap:8px}
    .cpf-stats{flex:1;display:flex;flex-wrap:wrap;gap:5px}
    .cpf-chip{background:var(--gray-50);border:1px solid var(--gray-200);color:var(--gray-700);font-size:11px;font-weight:700;padding:4px 9px;border-radius:999px;white-space:nowrap}
    .cpf-chip-sasang{background:var(--primary-pale);border-color:var(--primary-light);color:var(--primary-text)}
    .cpf-edit{background:#fff;border:1px solid var(--gray-200);color:var(--gray-600);font-size:13px;width:30px;height:30px;border-radius:8px;cursor:pointer;flex-shrink:0;transition:all .15s ease}
    .cpf-edit:hover{border-color:var(--primary);color:var(--primary)}
    .cpf-note{font-size:10px;color:var(--gray-400);margin-top:8px;font-weight:600;text-align:right}
    /* 📋 통합 가입 폼 */
    .signup-form{width:100%;max-width:340px;margin:18px auto 20px;text-align:left}
    .signup-field{margin-bottom:14px}
    .signup-field label{display:block;font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:6px;letter-spacing:-.2px}
    .signup-field .req{color:var(--danger);font-weight:800;margin-left:2px}
    .signup-field .opt{color:var(--gray-400);font-weight:500;font-size:10.5px;margin-left:2px}
    .signup-field input[type=text],.signup-field input[type=tel],.signup-field input[type=number]{width:100%;padding:12px 14px;border-radius:var(--r-md);border:1.5px solid var(--gray-200);font-size:14px;font-family:inherit;background:#fff;color:var(--gray-900);transition:border-color .15s ease}
    .signup-field input:focus{outline:none;border-color:var(--primary)}
    .signup-radio-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .signup-radio{display:flex;align-items:center;justify-content:center;padding:12px;border:1.5px solid var(--gray-200);border-radius:var(--r-md);cursor:pointer;font-size:13.5px;font-weight:700;color:var(--gray-700);background:#fff;transition:all .15s ease}
    .signup-radio:hover{border-color:var(--primary)}
    .signup-radio input{display:none}
    .signup-radio input:checked + span{color:var(--primary)}
    .signup-radio:has(input:checked){border-color:var(--primary);background:var(--primary-pale)}
    .signup-date-row{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:8px}
    .signup-hw-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .signup-hint{font-size:11.5px;color:var(--primary);margin-top:6px;font-weight:600}
    .signup-consent{background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--r-md);padding:12px 14px;margin:18px 0 14px}
    .signup-check{display:flex;align-items:flex-start;gap:8px;padding:5px 0;cursor:pointer;font-size:11.5px;color:var(--gray-600);line-height:1.5}
    .signup-check input{margin-top:2px;flex-shrink:0;accent-color:var(--primary);width:15px;height:15px}
    .signup-check strong{color:var(--danger);font-weight:800;margin-right:3px}
    .consent-link{color:var(--primary);text-decoration:underline;font-size:11px;margin-left:4px;font-weight:700}
    .consent-link:hover{color:var(--primary-dark)}
    .signup-submit{width:100%;padding:14px;background:var(--primary);color:#fff;border:none;border-radius:var(--r-md);font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;letter-spacing:-.3px;transition:all .15s ease}
    .signup-submit:hover{background:var(--primary-dark)}
    .signup-submit:active{transform:scale(.98)}
    .signup-submit:disabled{background:var(--gray-300);cursor:not-allowed}
    .signup-help{font-size:11px;color:var(--gray-400);text-align:center;margin-top:10px;line-height:1.5}
    /* ✨ 통합 카드 시스템 v2 (새 컴포넌트용) */
    .card-v2{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:var(--s-4);box-shadow:var(--shadow-xs);margin-bottom:var(--s-3);transition:box-shadow .2s ease}
    .card-v2:hover{box-shadow:var(--shadow-sm)}
    .card-v2-hero{background:linear-gradient(135deg,var(--primary-pale) 0%,#fff 60%);border:1.5px solid var(--primary-light);border-radius:var(--r-lg);padding:var(--s-5);box-shadow:var(--shadow-sm);margin-bottom:var(--s-4)}
    .card-v2-title{font-size:14px;font-weight:800;color:var(--gray-800);margin-bottom:var(--s-3);letter-spacing:-.3px;display:flex;align-items:center;gap:6px}
    .card-v2-sub{font-size:11.5px;color:var(--gray-500);margin-top:-6px;margin-bottom:var(--s-3);line-height:1.5}
    /* 통합 버튼 시스템 v2 */
    .btn-v2{display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;font-weight:800;font-size:13.5px;padding:11px 18px;border-radius:var(--r-md);border:1.5px solid transparent;cursor:pointer;transition:all .15s ease;letter-spacing:-.2px;line-height:1.2;-webkit-tap-highlight-color:transparent}
    .btn-v2:active{transform:scale(.97)}
    .btn-v2.primary{background:var(--primary);color:#fff;border-color:var(--primary)}
    .btn-v2.primary:hover{background:var(--primary-dark);border-color:var(--primary-dark)}
    .btn-v2.accent{background:var(--accent);color:#fff;border-color:var(--accent)}
    .btn-v2.outline{background:#fff;color:var(--primary-text);border-color:var(--primary-light)}
    .btn-v2.ghost{background:transparent;color:var(--gray-600);border-color:var(--gray-200)}
    .btn-v2.danger{background:var(--danger);color:#fff;border-color:var(--danger)}
    .btn-v2-block{width:100%}
    /* 텍스트 위계 v2 */
    .h-title{font-size:21px;font-weight:800;color:var(--gray-900);letter-spacing:-.5px;line-height:1.3}
    .h-section{font-size:15px;font-weight:800;color:var(--gray-800);letter-spacing:-.3px}
    .h-card{font-size:14px;font-weight:800;color:var(--gray-800);letter-spacing:-.2px}
    .t-body{font-size:13.5px;color:var(--gray-700);line-height:1.6}
    .t-muted{font-size:12px;color:var(--gray-500);line-height:1.5}
    .t-label{font-size:11.5px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px}
    /* 배지 v2 */
    .badge-v2{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 9px;border-radius:999px;letter-spacing:-.1px}
    .badge-v2.primary{background:var(--primary-light);color:var(--primary-text)}
    .badge-v2.accent{background:var(--accent-light);color:#92400E}
    .badge-v2.danger{background:var(--danger-light);color:#991B1B}
    .badge-v2.gray{background:var(--gray-100);color:var(--gray-600)}
    /* 자연스러운 페이지 전환 (screen 전환 시 fade in) */
    .screen.active{animation:fadeSlideIn .3s ease-out}
    @keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    /* 모든 버튼에 미세한 active 피드백 */
    button{transition:transform .12s ease,background .15s ease,box-shadow .15s ease;-webkit-tap-highlight-color:transparent}
    button:not(:disabled):active{transform:scale(.97)}
    /* 💧 물 섭취 위젯 (결과 페이지) — 솔리드 흰색 */
    .water-widget{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:18px;box-shadow:var(--shadow-xs)}
    .water-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
    .water-title{font-size:13.5px;font-weight:800;color:var(--gray-800);margin-bottom:3px;letter-spacing:-.3px}
    .water-stats{font-size:13px;color:var(--gray-700);font-weight:700}
    .water-unit{font-size:10px;color:var(--gray-400);font-weight:600;margin-left:1px}
    .water-pct{font-weight:800}
    .water-cups{font-size:12px;font-weight:700;color:var(--gray-600);background:var(--gray-50);padding:5px 11px;border-radius:999px;border:1px solid var(--gray-200);white-space:nowrap}
    .water-bar-wrap{height:8px;background:var(--gray-100);border-radius:99px;overflow:hidden}
    .water-bar{height:100%;border-radius:99px;transition:width .6s cubic-bezier(.2,.8,.2,1)}
    .water-msg{font-size:11.5px;color:var(--gray-600);margin-top:10px;padding:9px 12px;background:var(--gray-50);border-radius:var(--r-sm);border:1px solid var(--gray-100);line-height:1.55;font-weight:500}
    .water-buttons{display:grid;grid-template-columns:2fr 1fr .55fr .55fr;gap:6px;margin-top:12px}
    .water-btn{background:#fff;border:1px solid var(--gray-200);color:var(--gray-700);font-size:12px;font-weight:700;padding:10px 6px;border-radius:var(--r-sm);cursor:pointer;letter-spacing:-.2px;transition:all .15s ease}
    .water-btn:hover{border-color:var(--primary);color:var(--primary)}
    .water-btn.primary{background:var(--primary);color:#fff;border-color:var(--primary);font-weight:800}
    .water-btn.primary:hover{background:var(--primary-dark);border-color:var(--primary-dark)}
    .water-btn.small{font-size:13px;padding:8px 4px}
    .water-btn.reset{background:#fff;color:var(--gray-500);border-color:var(--gray-200)}
    /* 💧 홈 화면 미니 물 위젯 */
    .home-water{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:14px 16px;margin-bottom:14px;box-shadow:var(--shadow-xs)}
    .home-water-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .home-water-label{font-size:12.5px;font-weight:800;color:var(--gray-800);letter-spacing:-.2px}
    .home-water-val{font-size:12px;color:var(--gray-600);font-weight:700}
    .home-water-bar{height:6px;background:var(--gray-100);border-radius:99px;overflow:hidden}
    .home-water-fill{height:100%;border-radius:99px;transition:width .5s ease-out}
    .home-water-actions{display:flex;gap:6px;margin-top:10px}
    .home-water-btn{flex:1;background:#fff;border:1px solid var(--gray-200);color:var(--gray-700);font-size:11px;font-weight:700;padding:7px 4px;border-radius:var(--r-sm);cursor:pointer;transition:all .15s ease}
    .home-water-btn:hover{border-color:var(--primary);color:var(--primary)}
    .home-water-btn.small{flex:.4}
    /* 🧬 맞춤 분석 카드 — 솔리드 흰색 */
    .personal-empty{background:#fff;border:1.5px dashed var(--gray-300);border-radius:var(--r-md);padding:18px;text-align:center}
    .personal-card{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:18px;box-shadow:var(--shadow-xs)}
    .personal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
    .personal-edit-btn{background:#fff;border:1px solid var(--gray-200);color:var(--gray-700);font-size:11px;font-weight:700;padding:5px 10px;border-radius:8px;cursor:pointer;transition:all .15s ease}
    .personal-edit-btn:hover{border-color:var(--primary);color:var(--primary)}
    .personal-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
    .pstat{background:var(--gray-50);border-radius:var(--r-sm);padding:11px 8px;text-align:center;border:1px solid var(--gray-100)}
    .pstat-v{font-size:20px;font-weight:800;color:var(--gray-900);line-height:1.1;letter-spacing:-.5px}
    .pstat-l{font-size:10.5px;color:var(--gray-500);margin-top:4px;font-weight:600}
    .personal-section{background:var(--gray-50);border-radius:var(--r-sm);padding:13px;margin-top:10px;border:1px solid var(--gray-100)}
    .personal-section.sasang{background:var(--primary-pale);border-color:var(--primary-light)}
    .personal-section.saju{background:var(--gray-50);border-color:var(--gray-200)}
    .psect-title{font-size:12.5px;font-weight:800;color:var(--gray-800);margin-bottom:6px;letter-spacing:-.2px}
    .psect-tip{font-size:11.5px;color:var(--gray-600);line-height:1.6;margin-bottom:8px}
    .psect-row{font-size:11.5px;color:var(--gray-600);padding:3px 0;line-height:1.55}
    .psect-row strong{margin-right:4px}
    .psect-reason{font-size:10.5px;color:var(--gray-500);padding:6px 10px;background:#fff;border-radius:6px;margin-bottom:8px;font-weight:600;border:1px solid var(--gray-100)}
    /* 📊 리포트 버튼 + 모달 */
    .report-btn{background:#fff;color:var(--gray-700);border:1px solid var(--gray-200);border-radius:var(--r-md);padding:13px 8px;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:-.2px;transition:all .15s ease}
    .report-btn:hover{border-color:var(--primary);color:var(--primary)}
    .report-btn:active{transform:scale(.98)}
    .chart-bars{display:flex;align-items:flex-end;height:130px;gap:2px;padding:10px 8px 4px;background:#FAFBFC;border-radius:10px;border:1px solid #F1F5F9;overflow-x:auto}
    .chart-bar-wrap{display:flex;flex-direction:column;align-items:center;flex:1;min-width:22px}
    .chart-bar-val{font-size:9px;color:#64748B;margin-bottom:2px;min-height:12px;font-weight:600}
    .chart-bar{width:75%;background:linear-gradient(180deg,#F59E0B,#EA580C);border-radius:3px 3px 0 0;min-height:2px}
    .chart-bar-label{font-size:9px;color:#94A3B8;margin-top:4px;white-space:nowrap}
    .report-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
    .report-stat{background:var(--gray-50);border-radius:var(--r-sm);padding:14px 6px;text-align:center;border:1px solid var(--gray-100)}
    .report-stat-val{font-size:22px;font-weight:800;color:var(--gray-900);letter-spacing:-.5px}
    .report-stat-label{font-size:10.5px;color:var(--gray-500);margin-top:4px;font-weight:600}
    .report-section{margin-top:16px;padding-top:14px;border-top:1.5px dashed #E5E7EB}
    .report-section-title{font-size:13.5px;font-weight:800;color:#1F2937;margin-bottom:9px;letter-spacing:-.2px}
    .topfood-row{display:flex;align-items:center;gap:9px;padding:6px 0}
    .topfood-rank{width:26px;height:26px;background:linear-gradient(135deg,#F59E0B,#EA580C);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;box-shadow:0 2px 4px rgba(245,158,11,.3)}
    .topfood-info{flex:1;min-width:0}
    .topfood-name{font-size:12.5px;font-weight:700;color:#1F2937;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .topfood-bar{height:7px;background:#F1F5F9;border-radius:4px;overflow:hidden}
    .topfood-bar-fill{height:100%;border-radius:4px}
    .topfood-count{font-size:11.5px;color:#64748B;font-weight:700;flex-shrink:0;min-width:36px;text-align:right}
    .report-nut-row{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:11px}
    .report-nut-label{width:60px;color:#475569;font-weight:600;flex-shrink:0;font-size:11.5px}
    .report-nut-bar{flex:1;height:9px;background:#F1F5F9;border-radius:5px;overflow:hidden}
    .report-nut-fill{height:100%;border-radius:5px}
    .report-nut-val{font-size:10.5px;color:#64748B;width:78px;text-align:right;flex-shrink:0;font-weight:600}
    /* 영양 스텟 그룹 (식단 결과 화면) — 솔리드 + 미묘 */
    .stat-group{margin-bottom:20px;padding:0}
    .stat-group:last-child{margin-bottom:0}
    .stat-group-title{font-size:11px;font-weight:700;color:var(--gray-500);margin-bottom:14px;letter-spacing:.6px;text-transform:uppercase}
    /* 영양소 그룹 (매크로/미네랄/비타민) */
    .nut-group{margin-bottom:11px;padding:9px 10px;background:#FAFBFC;border-radius:10px;border:1px solid #F1F5F9}
    .nut-group:last-child{margin-bottom:0}
    .nut-group-title{font-size:12px;font-weight:800;color:#475569;margin-bottom:6px;letter-spacing:-.2px}
    /* 칭찬·따끔 멘트 */
    .coach-msg{padding:13px 14px;border-radius:13px;margin-bottom:14px;font-size:12.5px;line-height:1.6;border-width:1.5px;border-style:solid}
    .coach-msg.praise{background:var(--primary-pale);color:var(--primary-text);border-color:var(--primary-light)}
    .coach-msg.neutral{background:var(--gray-50);color:var(--gray-700);border-color:var(--gray-200)}
    .coach-msg.warn{background:#FEF2F2;color:#991B1B;border-color:#FCA5A5}
    .coach-msg strong{font-weight:800}
    /* 식단 기록 관리 */
    .food-records-list{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto}
    .food-record-row{display:flex;align-items:center;gap:8px;padding:9px 11px;background:#FAFBFC;border-radius:10px;border:1px solid #F1F5F9}
    .food-record-info{flex:1;min-width:0}
    .food-record-date{font-size:11px;font-weight:700;color:#64748B;margin-bottom:2px}
    .food-record-foods{font-size:12px;color:#1F2937;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px}
    .food-record-cal{font-size:10.5px;color:#F59E0B;font-weight:700}
    .food-record-del{background:#FEE2E2;border:1px solid #FCA5A5;color:#991B1B;font-size:14px;width:34px;height:34px;border-radius:10px;cursor:pointer;flex-shrink:0;font-weight:700}
    .food-record-del:active{background:#FECACA}
    /* 📊 영양 추천/권장 카드 */
    .reco-card{border-radius:var(--r-md);padding:14px;margin-bottom:8px;border:1px solid}
    .reco-soft{background:var(--gray-50);border-color:var(--gray-200)}
    .reco-soft.warn{background:#FFFBEB;border-color:#FDE68A}
    .reco-strong{background:#FEF2F2;border-color:#FCA5A5}
    .reco-strong.danger{background:#FEF2F2;border-color:#EF4444;border-width:1.5px}
    .reco-head{font-size:13px;font-weight:800;color:var(--gray-800);margin-bottom:6px;letter-spacing:-.2px}
    .reco-strong .reco-head{color:#991B1B;font-size:13.5px}
    .reco-body{font-size:11.5px;color:var(--gray-600);line-height:1.6;margin-bottom:9px}
    .reco-strong .reco-body{color:#7F1D1D}
    .reco-foods{display:flex;flex-wrap:wrap;gap:5px}
    .reco-food-tag{background:#fff;color:var(--gray-700);font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;border:1px solid var(--gray-200)}
    .reco-strong .reco-food-tag{color:#991B1B;border-color:#FCA5A5}
    .reco-food-tag.strong{background:#991B1B;color:#fff;border-color:#991B1B;font-weight:800}
    /* 궁합 "더 보기" 버튼 */
    .pair-more-btn{display:block;width:100%;margin-top:8px;padding:9px;background:#fff;border:1.5px dashed #F59E0B;color:#92400E;border-radius:10px;font-size:11.5px;font-weight:700;cursor:pointer;letter-spacing:-.2px}
    .pair-more-btn:active{background:#FEF3C7}
    /* 사진 전체 통합 궁합 박스 — 솔리드 흰색 */
    .overall-pairings-box{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:18px;margin-top:var(--s-3);box-shadow:var(--shadow-xs)}
    .overall-pairings-title{font-size:15px;font-weight:800;color:var(--gray-900);margin-bottom:8px;letter-spacing:-.3px}
    .overall-pairings-sub{font-size:11px;color:var(--gray-500);margin-bottom:8px}
    .overall-pairings-summary{font-size:12.5px;color:var(--gray-700);line-height:1.7;padding:13px 14px;background:var(--gray-50);border-radius:var(--r-sm);border:1px solid var(--gray-100);margin-bottom:6px}
    .overall-pairings-summary strong{color:var(--primary-text);font-weight:800}
    /* 궁합 마무리 안내 박스 */
    .pairing-note{background:var(--primary-pale);border:1px solid var(--primary-light);border-radius:var(--r-md);padding:14px 16px;margin-top:var(--s-3);display:flex;gap:11px;align-items:flex-start}
    .pairing-note-icon{font-size:22px;flex-shrink:0;line-height:1}
    .pairing-note-text{font-size:12px;line-height:1.65;color:#1E3A8A}
    .pairing-note-text strong{color:#1E40AF;font-weight:800}
    /* 궁합 VS 카드 */
    .pair-vs-card{background:#fff;border-radius:14px;padding:11px 13px;margin-bottom:7px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.05);border:1.5px solid #f1f5f9}
    .pair-vs-card.good{border-color:#86EFAC;background:linear-gradient(135deg,#F0FDF4,#fff)}
    .pair-vs-card.bad{border-color:#FECACA;background:linear-gradient(135deg,#FEF2F2,#fff)}
    .pair-side{background:#F8FAFC;border-radius:8px;padding:5px 9px;font-size:11.5px;font-weight:700;color:#1D1D1F;flex-shrink:0}
    .pair-vs-card.good .pair-side{background:#DCFCE7;color:#065F46}
    .pair-vs-card.bad .pair-side{background:#FEE2E2;color:#991B1B}
    .pair-vs-icon{font-size:18px;flex-shrink:0;animation:heartBeat 1.5s ease-in-out infinite}
    @keyframes heartBeat{0%,100%{transform:scale(1)}30%{transform:scale(1.15)}}
    .pair-vs-reason{flex:1;font-size:10.5px;color:#475569;line-height:1.5}
    .pair-section-header{font-size:11px;font-weight:800;color:#6E6E73;margin:12px 0 6px;letter-spacing:.5px;text-transform:uppercase;display:flex;align-items:center;gap:5px}
    /* 라이트 팁 (귀여운 캐릭터들) */
    .tip-game-row{background:#fff;border-radius:14px;padding:11px 13px;margin-bottom:7px;display:flex;align-items:flex-start;gap:11px;box-shadow:0 2px 8px rgba(0,0,0,.05);border-left:4px solid #C4B5FD}
    .tip-game-emoji{font-size:24px;flex-shrink:0;animation:floatChar 2.5s ease-in-out infinite}
    .tip-game-text{flex:1;font-size:12px;color:#1D1D1F;line-height:1.55;padding-top:2px}
    /* 다음 식사 추천 카드 */
    .next-meal-game{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-md);padding:18px;margin-bottom:var(--s-3);display:flex;align-items:center;gap:14px;box-shadow:var(--shadow-xs)}
    .next-meal-game-emoji{width:54px;height:54px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0;box-shadow:0 3px 10px rgba(0,0,0,.1);animation:floatChar 3s ease-in-out infinite}
    .next-meal-game-text{flex:1;color:#78350F}
    .next-meal-game-label{font-size:10px;font-weight:800;letter-spacing:1px;opacity:.8}
    .next-meal-game-menu{font-size:15px;font-weight:800;margin-top:2px;line-height:1.3}
    .next-meal-game-reason{font-size:11.5px;font-weight:500;margin-top:5px;opacity:.9;line-height:1.5}
    /* 영양소 사전 - 게임 스킬북 스타일 */
    .nutrient-skillbook{background:#fff;border-radius:var(--r-md);padding:18px;margin-bottom:var(--s-3);border:1px solid var(--gray-200);box-shadow:var(--shadow-xs)}
    .nutrient-skillbook-title{font-size:13px;font-weight:800;color:#5B21B6;margin-bottom:12px;display:flex;align-items:center;gap:6px}
    .nutrient-skill{background:#fff;border-radius:12px;padding:11px 13px;margin-bottom:7px;display:flex;align-items:flex-start;gap:11px;box-shadow:0 1px 4px rgba(0,0,0,.04)}
    .nutrient-skill-emoji{font-size:24px;flex-shrink:0;margin-top:-2px}
    .nutrient-skill-body{flex:1}
    .nutrient-skill-name{font-size:13px;font-weight:800;color:#5B21B6;letter-spacing:-.2px}
    .nutrient-skill-benefit{font-size:11.5px;color:#4C1D95;margin-top:2px;line-height:1.5}
    .nutrient-skill-source{font-size:10.5px;color:#7C3AED;margin-top:4px;font-weight:600}
    .nutrient-skill-source::before{content:"📍 "}
    /* ── 접기·펼치기 카드 (UX 정리) ── */
    .collapse-card{background:#fff;border-radius:18px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.04);border:1px solid #f1f5f9;overflow:hidden;transition:box-shadow .2s}
    .collapse-card.open{box-shadow:0 2px 10px rgba(0,0,0,.06)}
    .collapse-header{padding:16px 18px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;transition:background .15s}
    .collapse-header:active{background:#FAFAFA}
    .collapse-header-left{flex:1;min-width:0}
    .collapse-title-row{font-size:13.5px;font-weight:800;color:#1D1D1F;display:flex;align-items:center;gap:7px;letter-spacing:-.3px}
    .collapse-title-row .collapse-badge{display:inline-block;background:#F1F5F9;color:#475569;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:4px}
    .collapse-title-row .collapse-badge.alert{background:#FFE4E6;color:#BE123C}
    .collapse-title-row .collapse-badge.good{background:#D1FAE5;color:#065F46}
    .collapse-preview{font-size:11px;color:#6E6E73;margin-top:3px;letter-spacing:-.1px;line-height:1.4}
    .collapse-icon{color:#94A3B8;font-size:18px;flex-shrink:0;margin-left:10px;transition:transform .25s}
    .collapse-card.open .collapse-icon{transform:rotate(180deg);color:#6366F1}
    .collapse-body{display:none;padding:4px 16px 16px}
    .collapse-card.open .collapse-body{display:block;animation:fadeSlideDown .25s ease-out}
    @keyframes fadeSlideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
    .collapse-card.open .collapse-header{border-bottom:1px solid #f8fafc}
    /* 결과 화면 깔끔하게 — 내부 박스 margin 조정 */
    .collapse-body > .rec-box,
    .collapse-body > .medical-disclaimer-box,
    .collapse-body > .saju-box,
    .collapse-body > .env-health-box,
    .collapse-body > .tips-box,
    .collapse-body > .reco-section,
    .collapse-body > .supp-combo{margin-bottom:10px}
    .collapse-body > *:last-child{margin-bottom:0}
    .collapse-body > .section-title{margin-top:6px}

    /* ── 반려동물 버튼 (폼 안) ── */
    .pet-row{display:flex;gap:10px;margin-bottom:14px}
    .pet-btn{flex:1;padding:16px 8px;background:#fff;border:2px solid #e2e8f0;border-radius:14px;cursor:pointer;font-size:26px;text-align:center;transition:all .18s;box-shadow:0 1px 4px rgba(0,0,0,.07)}
    .pet-btn span{display:block;font-size:12px;font-weight:700;color:#374151;margin-top:5px}
    .pet-btn.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);border-color:transparent;box-shadow:0 4px 14px rgba(99,102,241,.38)}
    .pet-btn.active span{color:#fff}

    /* ── 환경 선택 ── */
    .env-row{display:flex;gap:8px;margin-bottom:14px}
    .env-btn{flex:1;padding:12px 6px;background:#fff;border:2px solid #e2e8f0;border-radius:12px;cursor:pointer;text-align:center;font-size:20px;transition:all .18s}
    .env-btn span{display:block;font-size:11px;font-weight:600;color:#374151;margin-top:4px}
    .env-btn.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);border-color:transparent}
    .env-btn.active span{color:#fff}

    /* ── 마케팅 동의 ── */
    .consent-box{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:14px}
    .consent-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
    .consent-row:last-child{margin-bottom:0}
    .consent-row input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:1px;accent-color:#6366f1;cursor:pointer}
    .consent-row label{font-size:12px;color:#475569;line-height:1.6;cursor:pointer}
    .consent-row label strong{color:#1e293b}

    /* ── 버튼 ── */
    .btn-primary{width:100%;padding:15px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(99,102,241,.40);letter-spacing:-.3px}
    .btn-primary:disabled{background:#94a3b8;box-shadow:none;cursor:not-allowed}
    .btn-outline{width:100%;padding:13px;background:#fff;border:2px solid #6366f1;border-radius:12px;color:#6366f1;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px}

    /* ── 촬영 화면 ── */
    .warning-banner{background:#fef3c7;border:1.5px solid #fbbf24;border-radius:12px;padding:14px;margin-bottom:14px}
    .warning-banner .wtitle{font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px}
    .warning-banner li{font-size:12px;color:#78350f;line-height:1.9;list-style:none}
    .warning-banner li::before{content:"⚠️ ";font-size:11px}

    .upload-btn{padding:20px;background:#fff;border:2px dashed #cbd5e1;border-radius:16px;cursor:pointer;text-align:center;width:100%;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .upload-btn.accent{border-color:#6366f1}
    .upload-btn .icon{font-size:30px}
    .upload-btn .lbl{font-size:15px;font-weight:700;color:#334155;margin-top:6px}
    .upload-btn.accent .lbl{color:#6366f1}
    .upload-btn .sub{font-size:12px;color:#94a3b8;margin-top:4px}

    /* ── 미리보기 ── */
    .preview-wrap{position:relative;margin-bottom:14px}
    .preview-wrap img{width:100%;border-radius:16px;display:block;box-shadow:0 4px 16px rgba(0,0,0,.12)}
    .btn-close-img{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);border:none;border-radius:50%;width:34px;height:34px;color:#fff;font-size:18px;cursor:pointer;line-height:34px;text-align:center}

    /* ── 에러 ── */
    .error-box{background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:13px;margin-bottom:13px;font-size:13px;color:#be123c;display:none}
    .error-box.show{display:block}

    /* ── 로딩 ── */
    .loading-box{text-align:center;margin-top:16px;background:#fff;border-radius:14px;padding:22px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);display:none}
    .loading-box.show{display:block}
    .loading-box .emoji{font-size:42px}
    .loading-box p{font-size:14px;color:#475569;margin-top:10px;font-weight:600}
    .loading-box small{font-size:12px;color:#94a3b8;margin-top:6px;display:block}

    /* ── 건강 종합 점수 ── */
    .health-score-card{background:linear-gradient(135deg,#FFFFFF 0%,#F5F3FF 100%);border:2px solid rgba(99,102,241,.18);border-radius:20px;padding:22px 18px;margin-bottom:14px;text-align:center;box-shadow:0 4px 20px rgba(99,102,241,.12);position:relative;overflow:hidden}
    .health-score-card::before{content:"";position:absolute;top:-40px;right:-40px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%);pointer-events:none}
    .score-label{font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase}
    .score-main{display:flex;align-items:baseline;justify-content:center;gap:8px;margin-bottom:8px}
    .score-num{font-size:54px;font-weight:900;color:#1D1D1F;letter-spacing:-2px;line-height:1;font-family:ui-rounded,'SF Pro Rounded',-apple-system,system-ui;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .score-unit{font-size:18px;font-weight:700;color:#94a3b8}
    .score-grade-wrap{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px}
    .score-grade{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;font-size:18px;font-weight:900;color:#fff;font-family:ui-rounded,'SF Pro Rounded',-apple-system,system-ui}
    .score-grade.A{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 3px 10px rgba(16,185,129,.35)}
    .score-grade.B{background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 3px 10px rgba(59,130,246,.35)}
    .score-grade.C{background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 3px 10px rgba(245,158,11,.35)}
    .score-grade.D{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 3px 10px rgba(239,68,68,.35)}
    .score-grade-label{font-size:13px;font-weight:700;color:#475569}
    .score-bars{display:flex;gap:4px;margin-top:14px;justify-content:center}
    .score-bar{width:32px;height:6px;border-radius:3px;background:#E5E7EB}
    .score-bar.fill{background:linear-gradient(90deg,#6366f1,#8b5cf6)}
    .score-message{font-size:12px;color:#64748b;margin-top:10px;line-height:1.5;letter-spacing:-.1px}
    .score-trend-hint{display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,.08);color:#6366f1;font-size:11px;font-weight:700;padding:4px 9px;border-radius:999px;margin-top:8px}
    /* ── 추세 그래프 ── */
    .trend-section{background:#fff;border-radius:16px;padding:16px 14px;margin-bottom:14px;box-shadow:0 1px 6px rgba(0,0,0,.05);border:1px solid #f1f5f9}
    .trend-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .trend-title{font-size:13px;font-weight:800;color:#1D1D1F;letter-spacing:-.3px;display:flex;align-items:center;gap:6px}
    .trend-count{font-size:10.5px;color:#6366f1;background:rgba(99,102,241,.10);padding:3px 9px;border-radius:999px;font-weight:700}
    .trend-chart-wrap{position:relative;height:180px;margin:0 -4px}
    .trend-tabs{display:flex;gap:6px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px}
    .trend-tab{padding:6px 12px;background:#F1F5F9;border:none;border-radius:999px;font-size:11px;font-weight:700;color:#64748b;cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:inherit;transition:all .2s}
    .trend-tab.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 2px 6px rgba(99,102,241,.3)}
    .trend-empty{text-align:center;padding:30px 20px;color:#94A3B8;font-size:13px;line-height:1.7}
    /* ── 결과 배너 ── */
    .result-banner{border-radius:18px;padding:22px 20px;color:#fff;margin-bottom:14px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.16)}
    .result-banner .big-icon{font-size:42px;margin-bottom:6px}
    .result-banner h2{font-size:19px;font-weight:800}
    .result-banner .pet-sub{font-size:12px;opacity:.9;margin-top:4px}
    .result-banner .summary-txt{font-size:13px;opacity:.92;margin-top:10px;line-height:1.7}
    .percentile-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.22);border:1.5px solid rgba(255,255,255,.4);border-radius:999px;padding:5px 13px;font-size:13px;font-weight:800;color:#fff;margin-top:10px}
    .bg-normal{background:linear-gradient(135deg,#10b981,#059669)}
    .bg-warning{background:linear-gradient(135deg,#f59e0b,#d97706)}
    .bg-danger{background:linear-gradient(135deg,#ef4444,#dc2626)}

    /* ── 권고 박스 ── */
    .rec-box{border-radius:12px;padding:13px;margin-bottom:13px;font-size:13px;line-height:1.7;border:1.5px solid}
    .rec-normal{background:#f0fdf4;border-color:#86efac;color:#166534}
    .rec-warning{background:#fffbeb;border-color:#fde68a;color:#92400e}
    .rec-danger{background:#fff1f2;border-color:#fecdd3;color:#9f1239}

    /* ── 체질 건강 박스 ── */
    .saju-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1.5px solid #93c5fd;border-radius:14px;padding:16px;margin-bottom:14px}
    .saju-box .stitle{font-size:13px;font-weight:800;color:#1d4ed8;margin-bottom:10px;display:flex;align-items:center;gap:6px}
    .saju-organ{display:inline-block;background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:8px}
    .saju-tip{font-size:12px;color:#1e40af;line-height:1.7;margin-bottom:4px;display:flex;gap:6px}
    .saju-tip::before{content:"•";flex-shrink:0}
    .saju-month{font-size:12px;color:#1d4ed8;margin-top:8px;padding-top:8px;border-top:1px solid #bfdbfe;line-height:1.6}

    /* ── 항목 카드 ── */
    .result-item{background:#fff;border-radius:12px;padding:13px 15px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
    .result-item.border-normal{border:1.5px solid #e2e8f0}
    .result-item.border-warning{border:1.5px solid #fde68a}
    .result-item.border-danger{border:1.5px solid #fecdd3}
    .ri-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .ri-name{font-size:14px;font-weight:700;color:#1e293b}
    .ri-right{display:flex;align-items:center;gap:7px}
    .ri-val{font-size:13px;color:#64748b;font-weight:600}
    .badge{padding:2px 9px;border-radius:20px;font-size:11px;font-weight:800;color:#fff}
    .badge-normal{background:#22c55e}
    .badge-warning{background:#f59e0b}
    .badge-danger{background:#ef4444}
    .ri-desc{font-size:12px;color:#64748b;line-height:1.6}

    /* ── 팁 ── */
    .tips-box{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:14px;padding:15px;margin-bottom:13px}
    .tips-box .ttitle{font-size:13px;font-weight:700;color:#15803d;margin-bottom:9px}
    .tip-row{display:flex;gap:7px;margin-bottom:7px}
    .tip-row:last-child{margin-bottom:0}
    .tip-check{color:#22c55e;font-size:13px;flex-shrink:0;font-weight:700}
    .tip-text{font-size:12px;color:#166534;line-height:1.6}

    /* ── 액션 버튼 ── */
    .action-row{display:flex;gap:10px;margin:4px 0 16px}
    .btn-retake{flex:1;padding:13px;background:#fff;border:2px solid #6366f1;border-radius:12px;color:#6366f1;font-size:13px;font-weight:700;cursor:pointer}
    .btn-new{flex:1;padding:13px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(99,102,241,.35)}
    .btn-download{width:100%;padding:13px;background:linear-gradient(135deg,#0ea5e9,#0284c7);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px;box-shadow:0 3px 10px rgba(14,165,233,.35)}

    /* ── 면책 ── */
    .disclaimer{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px;font-size:11px;color:#94a3b8;line-height:1.8}

    /* ── 환경 건강 분석 박스 ── */
    .env-health-box{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1.5px solid #7dd3fc;border-radius:14px;padding:16px;margin-bottom:14px}
    .env-health-box .etitle{font-size:13px;font-weight:800;color:#0369a1;margin-bottom:10px;display:flex;align-items:center;gap:6px}
    .env-health-item{font-size:12px;color:#0c4a6e;line-height:1.7;margin-bottom:8px;padding:10px 12px;background:rgba(255,255,255,.6);border-radius:9px}
    .env-health-item .elabel{font-size:11px;font-weight:700;color:#0284c7;margin-bottom:3px}

    /* ── 의료 면책(사람용) 박스 ── */
    .medical-disclaimer-box{background:#fef3c7;border:1.5px solid #fbbf24;border-radius:12px;padding:13px;margin-bottom:13px;font-size:12px;color:#78350f;line-height:1.7}

    /* ── 히스토리 ── */
    .history-item{background:#fff;border-radius:14px;padding:15px;margin-bottom:10px;box-shadow:0 1px 6px rgba(0,0,0,.07);cursor:pointer;border:1.5px solid #e2e8f0}
    .history-item:active{background:#f8fafc}
    .history-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
    .history-pet{font-size:14px;font-weight:700;color:#1e293b}
    .history-date{font-size:11px;color:#94a3b8}
    .history-info{font-size:12px;color:#64748b;line-height:1.7}
    .history-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#fff;margin-top:6px}
    .empty-history{text-align:center;padding:48px 20px;color:#94a3b8;font-size:14px}

    /* ── 추천 섹션 공통 ── */
    .reco-section{margin-bottom:14px}
    .reco-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    .reco-header .reco-icon{font-size:22px}
    .reco-header .reco-title{font-size:14px;font-weight:800;color:#1e293b}

    /* ── 영양제 카드 ── */
    .supp-card{background:#fff;border-radius:12px;padding:13px 15px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,.06);border-left:4px solid #6366f1}
    .supp-card.priority-필수{border-left-color:#ef4444}
    .supp-card.priority-권장{border-left-color:#f59e0b}
    .supp-card.priority-선택{border-left-color:#6366f1}
    .supp-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .supp-name{font-size:14px;font-weight:700;color:#1e293b}
    .supp-badge{font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;color:#fff}
    .supp-badge.필수{background:#ef4444}
    .supp-badge.권장{background:#f59e0b}
    .supp-badge.선택{background:#6366f1}
    .supp-reason{font-size:12px;color:#64748b;line-height:1.6}
    /* 영양제 메타 정보 (용량/타이밍/시너지) */
    .supp-badges{display:flex;gap:4px;align-items:center}
    .supp-cat{font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:20px;color:#fff;letter-spacing:-.1px}
    .supp-cat.기본{background:#3b82f6}
    .supp-cat.타겟{background:#8b5cf6}
    .supp-cat.부스터{background:#f59e0b}
    .supp-meta{margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9;display:flex;flex-direction:column;gap:5px}
    .supp-meta-row{display:flex;gap:8px;font-size:11px;line-height:1.5;align-items:flex-start}
    .supp-meta-label{flex-shrink:0;color:#475569;font-weight:600;width:60px}
    .supp-meta-val{color:#334155;flex:1}
    .supp-caution{margin-top:7px;padding:6px 9px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:6px;font-size:11px;color:#92400e;line-height:1.5}
    /* 약사 조합 처방 박스 */
    .supp-combo{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1.5px solid #c4b5fd;border-radius:16px;padding:18px 16px;margin-top:14px;margin-bottom:8px}
    .combo-title{font-size:14px;font-weight:800;color:#5b21b6;margin-bottom:12px;letter-spacing:-.3px;display:flex;align-items:center;gap:6px}
    .combo-stack{background:rgba(255,255,255,.7);border-radius:10px;padding:10px 13px;margin-bottom:8px}
    .combo-stack-title{font-size:12px;font-weight:700;color:#6d28d9;margin-bottom:6px}
    .combo-stack ul{list-style:none;padding:0;margin:0}
    .combo-stack li{font-size:11.5px;color:#3730a3;padding:3px 0;line-height:1.55;padding-left:14px;position:relative}
    .combo-stack li::before{content:"•";position:absolute;left:4px;color:#8b5cf6;font-weight:700}
    .combo-note{margin-top:10px;padding:10px;background:rgba(255,255,255,.6);border-radius:8px;font-size:12px;color:#4c1d95;line-height:1.7}
    .combo-tip{margin-top:8px;padding:8px 10px;background:#eff6ff;border-radius:8px;font-size:11.5px;color:#1d4ed8;line-height:1.6}
    .combo-cost{margin-top:8px;font-size:12px;color:#5b21b6;text-align:right;font-weight:600}
    .combo-cost strong{color:#7c3aed;font-size:13px;font-weight:800}

    /* ── 사료 카드 ── */
    .food-card{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:14px;padding:15px;margin-bottom:8px}
    .food-type{font-size:13px;font-weight:800;color:#15803d;margin-bottom:10px}
    .food-row{display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap}
    .food-tag{background:#fff;border:1.5px solid #86efac;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;color:#166534}
    .food-avoid{background:#fff1f2;border:1.5px solid #fecdd3;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;color:#be123c}
    .food-label{font-size:11px;font-weight:700;color:#15803d;margin-bottom:5px}
    .food-avoid-label{font-size:11px;font-weight:700;color:#be123c;margin-bottom:5px}
    .food-water{font-size:12px;color:#0369a1;background:#e0f2fe;border-radius:8px;padding:8px 10px;margin-top:6px}

    /* ── 운동 카드 ── */
    .exercise-card{background:linear-gradient(135deg,#fff7ed,#fef3c7);border:1.5px solid #fcd34d;border-radius:14px;padding:15px}
    .exercise-freq{font-size:13px;font-weight:800;color:#92400e;margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .exercise-types{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}
    .exercise-type-tag{background:#fff;border:1.5px solid #fcd34d;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;color:#78350f}
    .exercise-caution{font-size:12px;color:#92400e;background:rgba(255,255,255,.6);border-radius:9px;padding:9px 11px;line-height:1.7;margin-bottom:6px}
    .exercise-indoor{font-size:12px;color:#0369a1;background:#e0f2fe;border-radius:8px;padding:8px 10px}

    /* ── 진행 표시 ── */
    .step-indicator{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:18px}
    .step-dot{width:8px;height:8px;border-radius:50%;background:#e2e8f0;transition:all .2s}
    .step-dot.active{background:#6366f1;width:22px;border-radius:4px}
    .step-dot.done{background:#6366f1}

    /* ── 반려동물 특별 기능 ── */
    .feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
    .feature-card{background:#fff;border-radius:16px;padding:16px 12px;text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);border:2px solid transparent;transition:all .18s;text-decoration:none;display:block}
    .feature-card:active{transform:scale(.97)}
    .feature-card.mbti{border-color:#a78bfa;background:linear-gradient(135deg,#faf5ff,#ede9fe)}
    .feature-card.idcard{border-color:#f9a8d4;background:linear-gradient(135deg,#fdf2f8,#fce7f3)}
    .feature-card .fc-icon{font-size:32px;margin-bottom:6px}
    .feature-card .fc-title{font-size:13px;font-weight:800;color:#1e293b;margin-bottom:3px}
    .feature-card .fc-desc{font-size:11px;color:#64748b;line-height:1.5}
    .feature-card.mbti .fc-title{color:#7c3aed}
    .feature-card.idcard .fc-title{color:#db2777}
    .feature-section-label{font-size:13px;font-weight:700;color:#334155;margin-bottom:8px}
    /* ── 설정 모달 ── */
    .settings-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:99999;padding:20px;animation:cmhFadeIn .2s ease-out}
    .settings-overlay.show{display:flex}
    @keyframes settingsSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    .settings-modal{background:#fff;border-radius:20px;padding:24px 22px 18px;max-width:340px;width:100%;animation:settingsSlide .3s cubic-bezier(.2,.8,.2,1);font-family:inherit;position:relative}
    .settings-modal h3{font-size:17px;font-weight:800;color:#1D1D1F;margin-bottom:6px;letter-spacing:-.4px}
    .settings-modal .settings-sub{font-size:12px;color:#6E6E73;margin-bottom:18px;letter-spacing:-.1px}
    .settings-modal .settings-current{display:flex;align-items:center;gap:10px;background:#F7F7F5;border-radius:12px;padding:12px 14px;margin-bottom:12px}
    .settings-modal .settings-current-label{font-size:11px;color:#6E6E73;font-weight:600}
    .settings-modal .settings-current-value{font-size:14px;color:#1D1D1F;font-weight:700;letter-spacing:-.3px}
    .settings-modal .settings-input{width:100%;padding:13px 15px;border:1.5px solid #DBE5F5;border-radius:12px;font-size:14px;outline:none;font-family:inherit;letter-spacing:-.2px;margin-bottom:14px;background:#fff;color:#1D1D1F}
    .settings-modal .settings-input:focus{border-color:#5E7CE2;box-shadow:0 0 0 4px rgba(94,124,226,.10)}
    .settings-modal .settings-btn{width:100%;padding:13px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:-.2px;transition:transform .15s,box-shadow .2s}
    .settings-modal .settings-btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 3px 12px rgba(99,102,241,.35);margin-bottom:8px}
    .settings-modal .settings-btn-primary:active{transform:scale(.985)}
    .settings-modal .settings-btn-secondary{background:#fff;color:#6E6E73;border:1.5px solid #E5E5EA;margin-bottom:8px}
    .settings-modal .settings-btn-secondary:active{background:#F7F7F5}
    .settings-modal .settings-btn-danger{background:#fff;color:#FF3B30;font-size:13px;padding:13px;border:1.5px solid #FFD4D2;border-radius:12px;font-weight:700;box-shadow:0 1px 3px rgba(255,59,48,.08);transition:background .15s}
    .settings-modal .settings-btn-danger:hover{background:#FFF5F4}
    .settings-modal .settings-btn-danger:active{transform:scale(.985)}
    .settings-modal .settings-divider{height:1px;background:#E5E5EA;margin:12px 0}
    .settings-modal .settings-close{position:absolute;top:14px;right:14px;width:28px;height:28px;border:none;background:rgba(0,0,0,.06);border-radius:50%;cursor:pointer;font-size:15px;color:#444;display:flex;align-items:center;justify-content:center;line-height:1;padding:0}
    /* ── 프로필 선택 화면 ── */
    .profile-wrap{padding:24px 20px 40px}
    .profile-header{margin-bottom:18px}
    .profile-header h2{font-size:21px;font-weight:800;color:#1D1D1F;letter-spacing:-.5px;line-height:1.3;margin-bottom:6px}
    .profile-header p{font-size:12px;color:#6E6E73;letter-spacing:-.1px}
    .profile-list{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
    .profile-card{background:#fff;border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;border:none;width:100%;text-align:left;font-family:inherit;box-shadow:0 1px 2px rgba(0,0,0,.03),0 4px 14px rgba(0,0,0,.05);transition:transform .2s,box-shadow .2s;position:relative}
    .profile-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.08)}
    .profile-card:active{transform:scale(.985)}
    .profile-avatar{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:30px;background:linear-gradient(135deg,#F5F3FF,#EDE9FE);position:relative}
    .profile-avatar.pet{background:radial-gradient(circle at 30% 30%,#fff,#DAF0E5,#BDE2D0)}
    .profile-avatar.human{background:radial-gradient(circle at 30% 30%,#fff,#DEE9FF,#C5D8FB)}
    .profile-info{flex:1;min-width:0}
    .profile-name{font-size:15px;font-weight:700;color:#1D1D1F;letter-spacing:-.3px;margin-bottom:3px}
    .profile-meta{font-size:11px;color:#6E6E73;letter-spacing:-.1px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .profile-card .arrow{width:9px;height:14px;color:#C7C7CC;flex-shrink:0}
    .profile-card .arrow path{stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}
    .profile-card .delete-btn{position:absolute;top:6px;right:6px;width:24px;height:24px;background:rgba(0,0,0,.06);border:none;border-radius:50%;font-size:12px;color:#94A3B8;cursor:pointer;display:none;line-height:1;padding:0;align-items:center;justify-content:center}
    .profile-card.edit-mode .delete-btn{display:flex}
    .profile-add{background:#fff;border:2px dashed #c4b5fd;border-radius:16px;padding:16px;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;font-family:inherit;color:#6366f1;font-size:13.5px;font-weight:700;letter-spacing:-.2px;transition:background .15s}
    .profile-add:hover{background:#F5F3FF}
    .profile-add:active{transform:scale(.99)}
    .profile-empty{text-align:center;padding:34px 20px;color:#94A3B8;font-size:13px;line-height:1.7}
    .profile-edit-toggle{background:none;border:none;color:#6366f1;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
    /* ── 포인트 뱃지 (홈 상단) ── */
    .points-badge-wrap{display:flex;align-items:center;gap:8px;margin-bottom:18px}
    /* 옛 points-badge-wrap 제거된 자리 — 빈 마진 없게 */
    .points-badge-wrap:empty{margin:0;display:none}
    .points-badge{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--gray-200);border-radius:999px;padding:8px 14px 8px 11px;cursor:pointer;box-shadow:var(--shadow-xs);font-family:inherit;color:var(--gray-800);font-size:12.5px;font-weight:800;letter-spacing:-.2px;transition:all .15s ease}
    .points-badge:hover{border-color:var(--accent);color:var(--accent-dark);box-shadow:var(--shadow-sm)}
    .points-badge:hover{box-shadow:0 4px 14px rgba(251,191,36,.45)}
    .points-badge:active{transform:scale(.97)}
    .points-badge .gem{font-size:14px}
    /* ── 포인트 페이지 ── */
    #screenPoints{padding:0}
    .points-wrap{padding:24px 22px 40px;min-height:100vh}
    .points-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
    .points-back{background:none;border:none;font-size:14px;color:#6366f1;font-weight:700;cursor:pointer;font-family:inherit}
    .points-hero{background:linear-gradient(135deg,#FEF3C7 0%,#FCD34D 50%,#F59E0B 100%);border-radius:24px;padding:28px 22px;text-align:center;color:#78350F;position:relative;overflow:hidden;margin-bottom:18px;box-shadow:0 8px 24px rgba(251,191,36,.30)}
    .points-hero::before{content:"";position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.40) 0%,transparent 70%)}
    .points-hero-label{font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;opacity:.7;margin-bottom:6px;position:relative;z-index:1}
    .points-hero-num{font-size:46px;font-weight:900;letter-spacing:-2px;line-height:1;font-family:ui-rounded,'SF Pro Rounded',-apple-system,system-ui;position:relative;z-index:1}
    .points-hero-sub{font-size:12px;font-weight:600;margin-top:6px;opacity:.85;position:relative;z-index:1}
    .checkin-card{background:#fff;border-radius:18px;padding:16px 18px;margin-bottom:18px;box-shadow:0 2px 12px rgba(0,0,0,.06);display:flex;align-items:center;gap:14px}
    .checkin-emoji{font-size:32px}
    .checkin-info{flex:1;min-width:0}
    .checkin-title{font-size:13.5px;font-weight:800;color:#1D1D1F;letter-spacing:-.3px;margin-bottom:3px}
    .checkin-sub{font-size:11px;color:#6E6E73;letter-spacing:-.1px;line-height:1.5}
    .checkin-btn{padding:9px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(99,102,241,.35);white-space:nowrap}
    .checkin-btn:disabled{background:#cbd5e1;box-shadow:none;cursor:default}
    .streak-row{display:flex;gap:4px;margin-top:8px}
    .streak-dot{width:14px;height:14px;border-radius:50%;background:#E5E7EB;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94A3B8;font-weight:700}
    .streak-dot.done{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#fff}
    .reward-section{margin-bottom:18px}
    .reward-section-title{font-size:14px;font-weight:800;color:#1D1D1F;letter-spacing:-.3px;margin-bottom:12px;display:flex;align-items:center;gap:6px}
    .reward-grid{display:flex;flex-direction:column;gap:10px}
    .reward-card{background:#fff;border-radius:18px;padding:14px 16px;display:flex;align-items:center;gap:14px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.04);cursor:pointer;transition:transform .2s,box-shadow .2s;font-family:inherit;text-align:left;width:100%}
    .reward-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.08)}
    .reward-card:active{transform:scale(.985)}
    .reward-card:disabled{opacity:.55;cursor:not-allowed}
    .reward-icon-wrap{width:54px;height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;background:linear-gradient(135deg,#F5F3FF,#EDE9FE)}
    .reward-card.physical .reward-icon-wrap{background:linear-gradient(135deg,#FEF3C7,#FCD34D)}
    /* 검사 기록 카드 점수 표시 */
    .history-score{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;margin-left:6px}
    /* 다음 검사 리마인더 배너 */
    .reminder-banner{background:linear-gradient(135deg,#fff7ed,#fed7aa);border:1.5px solid #fdba74;border-radius:16px;padding:14px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px}
    .reminder-banner .ic{font-size:24px;flex-shrink:0}
    .reminder-banner .txt{flex:1;font-size:12px;color:#9a3412;line-height:1.5}
    .reminder-banner .txt strong{font-weight:800;color:#7c2d12}
    .reminder-banner .close-btn{background:rgba(0,0,0,.08);border:none;border-radius:50%;width:22px;height:22px;color:#7c2d12;font-size:12px;cursor:pointer;line-height:1}
    /* 친절한 에러 박스 */
    .friendly-error{background:#fff1f2;border:1.5px solid #fecdd3;border-radius:14px;padding:16px;margin-bottom:14px;display:none}
    .friendly-error.show{display:block}
    .friendly-error .err-title{font-size:14px;font-weight:800;color:#be123c;margin-bottom:6px;display:flex;align-items:center;gap:6px}
    .friendly-error .err-body{font-size:12px;color:#9f1239;line-height:1.6;margin-bottom:10px}
    .friendly-error .err-action{display:flex;gap:8px;flex-wrap:wrap}
    .friendly-error .err-btn{flex:1;padding:9px;background:#fff;border:1.5px solid #fecdd3;border-radius:10px;color:#9f1239;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;min-width:80px}
    .friendly-error .err-btn.primary{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border-color:transparent}
    /* 촬영 팁 모달 */
    .tip-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:99999;padding:20px}
    .tip-overlay.show{display:flex}
    .tip-modal{background:#fff;border-radius:22px;padding:26px 22px 18px;max-width:340px;width:100%;animation:settingsSlide .35s cubic-bezier(.2,.8,.2,1)}
    .tip-modal h3{font-size:17px;font-weight:800;color:#1D1D1F;margin-bottom:14px;text-align:center;letter-spacing:-.3px}
    .tip-modal .tip-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9}
    .tip-modal .tip-item:last-child{border-bottom:none}
    .tip-modal .tip-emoji{font-size:24px;flex-shrink:0}
    .tip-modal .tip-text{flex:1;font-size:12.5px;color:#475569;line-height:1.6}
    .tip-modal .tip-text strong{color:#1D1D1F;font-weight:700}
    .tip-modal .tip-confirm{width:100%;padding:13px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;font-size:13.5px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:14px}
    /* SNS 공유 버튼 */
    .share-row{display:flex;gap:10px;margin:14px 0}
    .share-btn{flex:1;padding:13px;border:none;border-radius:12px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;letter-spacing:-.2px}
    .share-btn.kakao{background:#FEE500;color:#1A1A1A;box-shadow:0 3px 10px rgba(254,229,0,.4)}
    .share-btn.image{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;box-shadow:0 3px 10px rgba(14,165,233,.35)}
    .reward-info{flex:1;min-width:0}
    .reward-name{font-size:14px;font-weight:700;color:#1D1D1F;letter-spacing:-.3px}
    .reward-desc{font-size:11px;color:#6E6E73;margin-top:2px;line-height:1.5}
    .reward-cost{font-size:13px;font-weight:800;color:#F59E0B;display:flex;align-items:center;gap:3px;margin-top:6px}
    .reward-type{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(99,102,241,.10);color:#6366f1;margin-left:6px;letter-spacing:-.1px}
    .reward-type.physical{background:rgba(251,191,36,.18);color:#92400E}
    .point-history{margin-top:20px}
    .point-history-item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,.04);font-size:12px}
    .point-history-text{color:#475569}
    .point-history-amount{font-weight:800;color:#10b981}
    .point-history-amount.minus{color:#ef4444}
    .point-history-date{font-size:10px;color:#94A3B8;margin-top:2px}
    /* ── 쿠폰 발급 모달 ── */
    .coupon-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:99999;padding:20px}
    .coupon-overlay.show{display:flex}
    .coupon-modal{background:#fff;border-radius:24px;padding:28px 24px 22px;max-width:340px;width:100%;text-align:center;animation:settingsSlide .35s cubic-bezier(.2,.8,.2,1);position:relative}
    .coupon-close{position:absolute;top:14px;right:14px;width:30px;height:30px;border:none;background:rgba(0,0,0,.06);border-radius:50%;cursor:pointer;font-size:15px;color:#444}
    .coupon-celebrate{font-size:46px;margin-bottom:10px;animation:wave 1.2s ease-in-out infinite}
    .coupon-title{font-size:17px;font-weight:800;color:#1D1D1F;margin-bottom:6px;letter-spacing:-.4px}
    .coupon-subtitle{font-size:12.5px;color:#6E6E73;line-height:1.6;margin-bottom:16px}
    .coupon-code-box{background:linear-gradient(135deg,#FEF3C7,#FCD34D);border:2px dashed #92400E;border-radius:14px;padding:18px;margin-bottom:14px}
    .coupon-code-label{font-size:10px;font-weight:700;color:#92400E;letter-spacing:1px;margin-bottom:6px}
    .coupon-code{font-size:22px;font-weight:900;color:#78350F;letter-spacing:2px;font-family:'SF Mono','Monaco',monospace;cursor:pointer;user-select:all}
    .coupon-copy-hint{font-size:10.5px;color:#92400E;margin-top:6px;opacity:.7}
    .coupon-instruction{font-size:11.5px;color:#475569;line-height:1.7;background:#F7F7F5;border-radius:10px;padding:11px 13px;margin-bottom:14px;text-align:left}
    .coupon-link-btn{display:block;width:100%;padding:13px;background:#03C75A;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;text-decoration:none;letter-spacing:-.2px;font-family:inherit;margin-bottom:8px}
    .shipping-form{text-align:left}
    .shipping-form .field{margin-bottom:10px}
    .shipping-form .field label{font-size:11.5px}
    .shipping-form .field input,.shipping-form .field textarea{font-size:13px;padding:9px 12px}
    .shipping-form textarea{resize:none;min-height:60px;font-family:inherit}
  </style>
</head>
<body>
<div id="app">

  <!-- 헤더 (홈 화면에서는 숨김) -->
  <div class="header">
    <div class="header-row">
      <div>
        <h1>건강어때</h1>
        <p id="headerSub">AI 소변검사 키트 분석</p>
      </div>
      <div style="display:flex;align-items:center">
        <button class="btn-back-home" id="btnBackHome" onclick="goHome()" style="display:none">홈</button>
        <button class="btn-history" onclick="goHistory()">검사기록</button>
      </div>
    </div>
  </div>

  <!-- 카카오 로그인 로딩 -->
  <div class="kakao-loading" id="kakaoLoading">
    <div class="spinner"></div>
    <p>카카오 로그인 중...</p>
  </div>

  <!-- ════════════ 오로라 배경 (Welcome 전용) ════════════ -->
  <div class="aurora-bg">
    <div class="aurora-blob b1"></div>
    <div class="aurora-blob b2"></div>
    <div class="aurora-blob b3"></div>
    <div class="aurora-blob b4"></div>
    <div class="aurora-blob b5"></div>
    <div class="aurora-blob b6"></div>
  </div>

  <!-- ════════════ 환영 화면 ════════════ -->
  <div class="screen active" id="screenWelcome">
    <div class="welcome-wrap">
      <div class="welcome-brand">건강어때</div>

      <div class="welcome-content">
        <!-- 재방문 인사 모드 -->
        <div id="welcomeReturn" style="display:none">
          <div class="welcome-greet" id="welcomeGreet">안녕하세요</div>
          <div class="welcome-name"><span id="welcomeName">고객</span>님 <span class="welcome-wave">👋</span></div>
          <div class="welcome-sub">오늘도 건강한 하루 보내세요</div>
        </div>

        <!-- 첫 방문: 통합 가입 폼 -->
        <div id="welcomeFirst" style="display:none">
          <div class="welcome-greet">건강 관리의 시작</div>
          <div class="welcome-name">건강어때에 오신 걸<br>환영해요</div>
          <div class="welcome-sub">한 번만 입력하면 식단 분석 · 소변검사 · 맞춤 영양 조언까지 모두 자동으로 적용돼요</div>

          <div class="signup-form">
            <div class="signup-field">
              <label>이름 <span class="req">*</span></label>
              <input type="text" id="su_name" placeholder="예: 김민수" maxlength="20"/>
            </div>
            <div class="signup-field">
              <label>휴대폰번호 <span class="req">*</span></label>
              <input type="tel" id="su_phone" placeholder="010-1234-5678" maxlength="13" oninput="formatPhone(this)"/>
            </div>
            <div class="signup-field">
              <label>성별 <span class="req">*</span></label>
              <div class="signup-radio-row">
                <label class="signup-radio"><input type="radio" name="su_gender" value="male"/> <span>남성</span></label>
                <label class="signup-radio"><input type="radio" name="su_gender" value="female"/> <span>여성</span></label>
              </div>
            </div>
            <div class="signup-field">
              <label>생년월일 <span class="req">*</span></label>
              <div class="signup-date-row">
                <input type="number" id="su_year" placeholder="년도" min="1920" max="2025" oninput="updateAgeHint()"/>
                <input type="number" id="su_month" placeholder="월" min="1" max="12"/>
                <input type="number" id="su_day" placeholder="일" min="1" max="31"/>
              </div>
              <div id="su_ageHint" class="signup-hint"></div>
            </div>
            <div class="signup-field">
              <label>키 / 몸무게 <span class="opt">선택</span></label>
              <div class="signup-hw-row">
                <input type="number" id="su_height" placeholder="170 (cm)" min="50" max="250"/>
                <input type="number" id="su_weight" placeholder="65 (kg)" min="20" max="200"/>
              </div>
            </div>

            <div class="signup-consent">
              <label class="signup-check">
                <input type="checkbox" id="su_consent_age"/>
                <span><strong>(필수)</strong> 만 14세 이상입니다</span>
              </label>
              <label class="signup-check">
                <input type="checkbox" id="su_consent_privacy"/>
                <span><strong>(필수)</strong> 개인정보 수집 및 이용 동의 <a href="privacy.html" target="_blank" class="consent-link">[보기]</a></span>
              </label>
              <label class="signup-check">
                <input type="checkbox" id="su_consent_terms"/>
                <span><strong>(필수)</strong> 서비스 이용약관 동의 <a href="terms.html" target="_blank" class="consent-link">[보기]</a></span>
              </label>
              <label class="signup-check">
                <input type="checkbox" id="su_consent_medical"/>
                <span><strong>(필수)</strong> 본 서비스가 의학적 진단·치료가 아님을 이해합니다</span>
              </label>
              <label class="signup-check">
                <input type="checkbox" id="su_consent_marketing"/>
                <span>(선택) 마케팅 정보 수신 동의</span>
              </label>
            </div>

            <button class="signup-submit" onclick="submitSignup()">전체 동의 후 가입하기</button>
            <div class="signup-help">개인정보는 안전하게 암호화되어 저장돼요</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════════ 홈 화면 (Minimal Apple Style) ════════════ -->
  <div class="screen" id="screenHome">
    <div class="home-wrap">

      <!-- 다음 검사 리마인더 배너 -->
      <div class="reminder-banner" id="reminderBanner" style="display:none">
        <div class="ic">⏰</div>
        <div class="txt">
          <strong>마지막 검사 후 <span id="reminderDays">30</span>일 지났어요!</strong><br>
          정기적인 검사로 건강 변화를 체크하세요.
        </div>
        <button class="close-btn" onclick="dismissReminder()">✕</button>
      </div>
      <!-- 상단 행: 포인트 + 설정 (오른쪽 정렬) -->
      <div class="home-top-bar">
        <button class="points-badge" onclick="goPoints()" id="homePointsBadge">
          <span class="gem">💎</span> <span id="homePointsNum">0</span>P
        </button>
        <button class="settings-btn" onclick="openSettings()" aria-label="설정">
          <i class="ph-bold ph-gear-six" style="font-size:20px"></i>
        </button>
      </div>

      <!-- 인사 + 새 슬로건 -->
      <div class="home-hello">
        <h1>건강한 하루,<br>오늘도 응원해요</h1>
        <div class="sub">AI 영양사가 식단 · 물 · 체질까지<br>하루를 똑똑하게 챙겨드려요</div>
      </div>

      <!-- 오늘의 미션 — 물 위젯 -->
      <div id="homeWaterWidget"></div>

      <div class="home-cards">

        <!-- 1) 사람 (내 건강) -->
        <button class="home-card human" onclick="enterHuman()">
          <div class="card-top">
            <div class="hc-icon-wrap">
              <svg class="hc-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none">
                <circle cx="16" cy="11" r="5"/>
                <path d="M6 27 C 6 21, 10 17.5, 16 17.5 C 22 17.5, 26 21, 26 27"/>
              </svg>
            </div>
            <div class="hc-content">
              <h3>내 건강 체크</h3>
              <p>소변검사 키트로<br>주요 건강 지표 확인</p>
            </div>
            <svg class="hc-arrow" viewBox="0 0 9 14"><path d="M1.5 1.5 L7 7 L1.5 12.5"/></svg>
          </div>
          <div class="card-footer">
            <span class="card-pill subj-pill"><span class="dot"></span><span id="humanLastInfo">마지막 기록 없음</span></span>
            <span class="card-pill time-pill">
              <svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5"/><path d="M7 4 V 7 L 9 8.5"/></svg>
              약 1분
            </span>
          </div>
        </button>

        <!-- 식단 분석 (NEW) -->
        <button class="home-card food" onclick="enterFood()">
          <div class="card-top">
            <div class="hc-icon-wrap">
              <svg class="hc-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none">
                <!-- 그릇 + 밥 -->
                <path d="M5 17 Q 5 23, 16 23 Q 27 23, 27 17"/>
                <path d="M5 17 L 27 17"/>
                <ellipse cx="16" cy="14" rx="9" ry="3"/>
                <circle cx="13" cy="13" r=".6" data-fill/>
                <circle cx="16" cy="13" r=".6" data-fill/>
                <circle cx="19" cy="13" r=".6" data-fill/>
                <!-- 김 -->
                <path d="M11 10 Q 10 7, 11 5"/>
                <path d="M16 9 Q 15 5, 16 3"/>
                <path d="M21 10 Q 22 7, 21 5"/>
              </svg>
            </div>
            <div class="hc-content">
              <h3>🍽 식단 분석</h3>
              <p>음식 사진 한 장으로<br>칼로리·영양 분석</p>
            </div>
            <svg class="hc-arrow" viewBox="0 0 9 14"><path d="M1.5 1.5 L7 7 L1.5 12.5"/></svg>
          </div>
          <div class="card-footer">
            <span class="card-pill subj-pill"><span class="dot"></span><span id="foodLastInfo">기록 없음</span></span>
            <span class="card-pill time-pill">
              <svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5"/><path d="M7 4 V 7 L 9 8.5"/></svg>
              약 30초
            </span>
          </div>
        </button>

        <!-- 2) 반려동물 -->
        <button class="home-card pet" onclick="enterPet()">
          <div class="card-top">
            <div class="hc-icon-wrap">
              <svg class="hc-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none">
                <!-- 강아지 -->
                <path d="M7.2 12 C 6 13.5, 6 15.5, 7.5 16.2"/>
                <path d="M13.8 12 C 15 13.5, 15 15.5, 13.5 16.2"/>
                <circle cx="10.5" cy="16" r="3.5"/>
                <circle cx="9.3" cy="15.5" r=".35" data-fill/>
                <circle cx="11.7" cy="15.5" r=".35" data-fill/>
                <ellipse cx="10.5" cy="17" rx=".45" ry=".38" data-fill/>
                <path d="M9.9 17.7 C 10.2 18.2, 10.8 18.2, 11.1 17.7"/>
                <!-- 고양이 -->
                <path d="M18 13.4 L 18.6 10.4 L 20.2 12.7"/>
                <path d="M23.4 13.4 L 22.8 10.4 L 21.2 12.7"/>
                <circle cx="20.7" cy="16" r="3.5"/>
                <circle cx="19.5" cy="15.5" r=".35" data-fill/>
                <circle cx="21.9" cy="15.5" r=".35" data-fill/>
                <path d="M20.7 16.7 L 21 17 L 20.4 17 Z" data-fill/>
                <path d="M20.1 17.5 C 20.35 18, 20.7 18, 20.7 17.7 C 20.7 18, 21.05 18, 21.3 17.5"/>
                <line x1="17.4" y1="16.4" x2="18.6" y2="16.4"/>
                <line x1="22.8" y1="16.4" x2="24" y2="16.4"/>
              </svg>
            </div>
            <div class="hc-content">
              <h3>반려동물 건강 체크</h3>
              <p>우리 아이의 건강 신호를<br>집에서 확인</p>
            </div>
            <svg class="hc-arrow" viewBox="0 0 9 14"><path d="M1.5 1.5 L7 7 L1.5 12.5"/></svg>
          </div>
          <div class="card-footer">
            <span class="card-pill subj-pill"><span class="dot"></span><span id="petLastInfo">최근 기록 없음</span></span>
            <span class="card-pill time-pill">
              <svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5"/><path d="M7 4 V 7 L 9 8.5"/></svg>
              약 1분
            </span>
          </div>
        </button>

      </div>

      <!-- 최근 검사 기록 -->
      <div class="recent-section">
        <div class="recent-title">최근 검사 기록</div>
        <button class="recent-empty" id="recentEmpty" onclick="goHistory()">
          <div class="recent-icon">
            <svg viewBox="0 0 24 24">
              <path d="M9 4 H 15 V 7 H 9 V 4 Z"/>
              <path d="M7 5 H 5 V 21 H 19 V 5 H 17"/>
              <path d="M8 11 H 16 M 8 14 H 13 M 8 17 H 14"/>
            </svg>
          </div>
          <div class="recent-text">
            <div class="empty-title" id="recentTitle">아직 저장된 검사 기록이 없어요</div>
            <div class="empty-sub" id="recentSub">첫 건강 체크를 시작해보세요</div>
          </div>
        </button>
      </div>

      <!-- 📊 종합 영양 리포트 진입 -->
      <button class="kit-purchase" onclick="goReport()" style="border:none;background:linear-gradient(135deg,#FEF3C7,#FCD34D);width:100%;cursor:pointer;font-family:inherit">
        <div class="kit-emoji">📊</div>
        <div class="kit-text">
          <div class="kit-title">오늘·이번 주 영양 리포트</div>
          <div class="kit-sub">식단 데이터로 만든 종합 분석</div>
        </div>
        <svg class="kit-arrow" viewBox="0 0 9 14"><path d="M1.5 1.5 L7 7 L1.5 12.5"/></svg>
      </button>

      <!-- 키트 구매 카드 -->
      <a class="kit-purchase" href="https://smartstore.naver.com/checkmyhealth/category/ALL?cp=1" target="_blank" rel="noopener">
        <div class="kit-emoji">🧪</div>
        <div class="kit-text">
          <div class="kit-title">검사 키트 더 필요하세요?</div>
          <div class="kit-sub"><span class="smartstore-badge">N</span>스마트스토어에서 정품 키트 구매하기</div>
        </div>
        <svg class="kit-arrow" viewBox="0 0 9 14"><path d="M1.5 1.5 L7 7 L1.5 12.5"/></svg>
      </a>

      <!-- 하단 면책 -->
      <div class="bottom-disclaimer">
        <svg viewBox="0 0 24 24">
          <path d="M12 3 L 19 5.5 V 12 C 19 16, 16 19.5, 12 21 C 8 19.5, 5 16, 5 12 V 5.5 L 12 3 Z"/>
        </svg>
        <span>검사 결과는 확진이 아닌 건강관리 참고용입니다.</span>
      </div>

    </div>
  </div>

  <!-- ════════════ 포인트 페이지 ════════════ -->
  <div class="screen" id="screenPoints">
    <div class="points-wrap">
      <div class="points-top">
        <button class="points-back" onclick="goHome()">← 홈으로</button>
        <span style="font-size:13px;color:#94A3B8;font-weight:600">💎 포인트</span>
      </div>
      <!-- Hero: 현재 포인트 -->
      <div class="points-hero">
        <div class="points-hero-label">MY POINTS</div>
        <div class="points-hero-num"><span id="pointsHeroNum">0</span> P</div>
        <div class="points-hero-sub">건강 체크할 때마다 포인트가 쌓여요</div>
      </div>
      <!-- 출석 체크 -->
      <div class="checkin-card">
        <div class="checkin-emoji">📅</div>
        <div class="checkin-info">
          <div class="checkin-title">매일 출석 체크</div>
          <div class="checkin-sub" id="checkinSub">매일 출석하면 50P, 7일 연속이면 200P 보너스!</div>
          <div class="streak-row" id="streakRow"></div>
        </div>
        <button class="checkin-btn" id="checkinBtn" onclick="doCheckIn()">출석</button>
      </div>
      <!-- 오늘 적립 가능 한도 -->
      <div style="background:#fff;border-radius:14px;padding:13px 15px;margin-bottom:18px;box-shadow:0 1px 6px rgba(0,0,0,.04);font-size:11.5px;color:#475569;line-height:1.7">
        <div style="font-weight:700;color:#1D1D1F;margin-bottom:4px">📊 오늘 적립 가능</div>
        <div>🔬 검사 분석 <span id="todayTestLeft" style="color:#6366f1;font-weight:700">3</span>회 남음 (+100P × 회)</div>
        <div>👨‍👩‍👧 프로필 추가 <span id="todayProfileLeft" style="color:#6366f1;font-weight:700">5</span>명 남음 (+50P × 명)</div>
      </div>
      <!-- 보상 카탈로그 -->
      <div class="reward-section">
        <div class="reward-section-title">🎁 포인트로 받을 수 있는 보상</div>
        <div class="reward-grid" id="rewardGrid"></div>
      </div>
      <!-- 적립/사용 내역 -->
      <div class="reward-section">
        <div class="reward-section-title">📜 적립·사용 내역</div>
        <div id="pointHistoryList"></div>
      </div>
    </div>
  </div>

  <!-- ════════════ 쿠폰 발급 모달 ════════════ -->
  <div class="coupon-overlay" id="couponOverlay" onclick="if(event.target===this)closeCoupon()">
    <div class="coupon-modal">
      <button class="coupon-close" onclick="closeCoupon()">✕</button>
      <!-- 디지털 쿠폰 발급 화면 -->
      <div id="couponDigital" style="display:none">
        <div class="coupon-celebrate">🎉</div>
        <div class="coupon-title">쿠폰 발급 완료!</div>
        <div class="coupon-subtitle" id="couponSubtitle">스마트스토어에서 바로 사용하세요</div>
        <div class="coupon-code-box">
          <div class="coupon-code-label">COUPON CODE</div>
          <div class="coupon-code" id="couponCode" onclick="copyCoupon()">XXXX-XXXX</div>
          <div class="coupon-copy-hint">탭하면 복사돼요</div>
        </div>
        <div class="coupon-instruction">
          📌 <strong>사용 방법</strong><br>
          1. 아래 버튼으로 스마트스토어 이동<br>
          2. 키트 선택 → 결제 진행<br>
          3. <strong>주문서 작성 시 "주문자 요청사항"</strong>에 위 쿠폰 코드 입력<br>
          4. 운영자가 확인 후 환불·할인 처리해드려요
        </div>
        <a class="coupon-link-btn" href="https://smartstore.naver.com/checkmyhealth/category/ALL?cp=1" target="_blank" rel="noopener">스마트스토어 바로가기 →</a>
        <button class="settings-btn settings-btn-secondary" onclick="closeCoupon()">닫기</button>
      </div>
      <!-- 실물 상품 배송 신청 화면 -->
      <div id="couponShipping" style="display:none">
        <div class="coupon-celebrate">📦</div>
        <div class="coupon-title">배송 정보를 입력해주세요</div>
        <div class="coupon-subtitle" id="shippingItemName">상품명</div>
        <div class="shipping-form">
          <div class="field"><label>받는 분 이름 *</label><input type="text" id="shipName" placeholder="홍길동"/></div>
          <div class="field"><label>연락처 *</label><input type="tel" id="shipPhone" placeholder="010-0000-0000" maxlength="13" oninput="formatPhone(this)"/></div>
          <div class="field"><label>주소 *</label><input type="text" id="shipAddress1" placeholder="기본 주소"/></div>
          <div class="field"><label>상세 주소</label><input type="text" id="shipAddress2" placeholder="동/호수 등"/></div>
          <div class="field"><label>요청 사항 (선택)</label><textarea id="shipMemo" placeholder="문 앞에 두고 가주세요 등"></textarea></div>
        </div>
        <div style="font-size:11px;color:#94A3B8;background:#F7F7F5;border-radius:8px;padding:9px 11px;margin-bottom:8px;text-align:center;line-height:1.5">
          💡 <strong style="color:#475569">신청 완료 시</strong> 포인트가 차감돼요. 취소하면 차감 안 돼요!
        </div>
        <button class="settings-btn settings-btn-primary" onclick="submitShipping()" style="margin-top:0">신청 완료 (포인트 차감)</button>
        <button class="settings-btn settings-btn-secondary" onclick="closeCoupon()">취소 (차감 X)</button>
      </div>
      <!-- 신청 완료 화면 -->
      <div id="couponDone" style="display:none">
        <div class="coupon-celebrate">✅</div>
        <div class="coupon-title">신청이 완료됐어요!</div>
        <div class="coupon-subtitle">2~5일 안에 발송해드릴게요</div>
        <div class="coupon-instruction">
          📦 <strong>주문 번호</strong>: <span id="orderNum"></span><br><br>
          📱 발송 시작되면 등록한 번호로 알림 드려요.<br>
          ❓ 문의: 카카오톡 채널 "건강어때" 검색
        </div>
        <button class="settings-btn settings-btn-primary" onclick="closeCoupon()">확인</button>
      </div>
    </div>
  </div>

  <!-- ════════════ 프로필 선택 화면 (사람/반려동물 공통) ════════════ -->
  <div class="screen" id="screenProfilePicker">
    <div class="profile-wrap">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
        <div class="profile-header" style="margin-bottom:0">
          <h2 id="profilePickerTitle">누구의 건강을<br>확인할까요?</h2>
          <p id="profilePickerSub">프로필을 선택하거나 새로 추가하세요</p>
        </div>
        <button class="profile-edit-toggle" id="profileEditToggle" onclick="toggleProfileEdit()" style="display:none">편집</button>
      </div>
      <div class="profile-list" id="profileList"></div>
      <button class="profile-add" onclick="addNewProfileFlow()">
        <span style="font-size:18px;line-height:1">＋</span>
        <span id="profileAddLabel">새 프로필 추가</span>
      </button>
      <button class="btn-outline" style="margin-top:14px" onclick="goHome()">← 홈으로</button>
    </div>
  </div>

  <!-- ════════════ 반려동물 폼 화면 ════════════ -->
  <div class="screen" id="screenPetForm">

    <div class="feature-section-label">✨ 반려동물 특별 기능</div>
    <div class="feature-grid">
      <a class="feature-card mbti" href="pet-mbti.html">
        <div class="fc-icon">🧠</div>
        <div class="fc-title">반려동물 MBTI</div>
        <div class="fc-desc">우리 아이 성격 유형 알아보기</div>
      </a>
      <a class="feature-card idcard" href="pet-idcard.html">
        <div class="fc-icon">🪪</div>
        <div class="fc-title">반려동물 ID 카드</div>
        <div class="fc-desc">AI 픽사 변환 + 인스타 공유</div>
      </a>
    </div>

    <div class="step-indicator">
      <div class="step-dot active"></div>
      <div class="step-dot"></div>
      <div class="step-dot"></div>
    </div>

    <div class="section-title">🐾 반려동물 정보</div>
    <div class="card">
      <div class="pet-row">
        <button class="pet-btn" id="btnDog" onclick="selectPet('dog')">🐶<span>강아지</span></button>
        <button class="pet-btn" id="btnCat" onclick="selectPet('cat')">🐱<span>고양이</span></button>
      </div>
      <div class="field">
        <label>반려동물 이름</label>
        <input type="text" id="petName" placeholder="예: 뽀삐"/>
      </div>
      <div class="field">
        <label>품종</label>
        <input type="text" id="petBreed" placeholder="예: 말티즈, 페르시안, 믹스 등"/>
      </div>
      <div class="field">
        <label>성별</label>
        <div class="row2">
          <button type="button" class="env-btn" id="genderMale" onclick="selectGender('수컷')" style="font-size:16px">♂<span>수컷</span></button>
          <button type="button" class="env-btn" id="genderFemale" onclick="selectGender('암컷')" style="font-size:16px">♀<span>암컷</span></button>
          <button type="button" class="env-btn" id="genderNeutered" onclick="selectGender('중성화')" style="font-size:14px">✂️<span>중성화</span></button>
        </div>
      </div>
      <div class="field">
        <label>반려동물 생년월 <span style="color:#94a3b8;font-weight:400">(건강 체질 분석에 활용)</span></label>
        <div class="row2">
          <select id="petBirthYear">
            <option value="">출생연도</option>
          </select>
          <select id="petBirthMonth">
            <option value="">출생월</option>
            <option value="1">1월</option><option value="2">2월</option>
            <option value="3">3월</option><option value="4">4월</option>
            <option value="5">5월</option><option value="6">6월</option>
            <option value="7">7월</option><option value="8">8월</option>
            <option value="9">9월</option><option value="10">10월</option>
            <option value="11">11월</option><option value="12">12월</option>
          </select>
        </div>
      </div>
    </div>

    <div class="section-title">🏠 생활 환경</div>
    <div class="card">
      <div class="field">
        <label>사는 지역</label>
        <select id="region">
          <option value="">지역 선택</option>
          <option>서울</option><option>경기</option><option>인천</option>
          <option>부산</option><option>대구</option><option>광주</option>
          <option>대전</option><option>울산</option><option>세종</option>
          <option>강원</option><option>충북</option><option>충남</option>
          <option>전북</option><option>전남</option><option>경북</option>
          <option>경남</option><option>제주</option><option>기타</option>
        </select>
      </div>
      <div class="field">
        <label>생활 환경</label>
        <div class="env-row" style="margin-bottom:0">
          <button class="env-btn" id="envIndoor" onclick="selectEnv('실내')">🏠<span>실내</span></button>
          <button class="env-btn" id="envOutdoor" onclick="selectEnv('실외')">🌳<span>실외</span></button>
          <button class="env-btn" id="envMixed" onclick="selectEnv('실내+실외')">🔄<span>실내+실외</span></button>
        </div>
      </div>
    </div>

    <div class="section-title">👤 보호자 정보</div>
    <div class="card">
      <div class="field">
        <label>연락처 <span style="color:#ef4444">*</span></label>
        <input type="tel" id="petContact" placeholder="010-0000-0000" maxlength="13" oninput="formatPhone(this)"/>
      </div>
      <div class="consent-box">
        <div class="consent-row">
          <input type="checkbox" id="petConsentMarketing"/>
          <label for="petConsentMarketing">
            <strong>[선택] 마케팅 정보 수신 동의</strong><br>
            신제품 출시, 프로모션, 건강 정보 등 유용한 소식을 받아보겠습니다.
          </label>
        </div>
        <div class="consent-row">
          <input type="checkbox" id="petConsentPrivacy" required/>
          <label for="petConsentPrivacy">
            <strong>[필수] 개인정보 수집 및 이용 동의</strong><br>
            검사 결과 분석 및 서비스 제공 목적으로 입력하신 정보를 수집합니다.
          </label>
        </div>
      </div>
    </div>

    <button class="btn-primary" onclick="goCapture('pet')">다음 — 사진 촬영 →</button>
    <button class="btn-outline" onclick="goHome()">← 홈으로</button>
  </div>

  <!-- ════════════ 사람 폼 화면 ════════════ -->
  <div class="screen" id="screenHumanForm">

    <div class="step-indicator">
      <div class="step-dot active"></div>
      <div class="step-dot"></div>
      <div class="step-dot"></div>
    </div>

    <div class="section-title">🧑 본인 정보</div>
    <div class="card">
      <div class="field">
        <label>이름 (또는 별명)</label>
        <input type="text" id="humanName" placeholder="예: 홍길동"/>
      </div>
      <div class="field">
        <label>성별</label>
        <div class="row2">
          <button type="button" class="env-btn" id="hGenderMale" onclick="selectHumanGender('male')" style="font-size:16px">♂<span>남성</span></button>
          <button type="button" class="env-btn" id="hGenderFemale" onclick="selectHumanGender('female')" style="font-size:16px">♀<span>여성</span></button>
        </div>
      </div>
      <div class="field">
        <label>생년월 <span style="color:#94a3b8;font-weight:400">(건강 체질 분석에 활용)</span></label>
        <div class="row2">
          <select id="humanBirthYear">
            <option value="">출생연도</option>
          </select>
          <select id="humanBirthMonth">
            <option value="">출생월</option>
            <option value="1">1월</option><option value="2">2월</option>
            <option value="3">3월</option><option value="4">4월</option>
            <option value="5">5월</option><option value="6">6월</option>
            <option value="7">7월</option><option value="8">8월</option>
            <option value="9">9월</option><option value="10">10월</option>
            <option value="11">11월</option><option value="12">12월</option>
          </select>
        </div>
      </div>
    </div>

    <div class="section-title">🏠 생활 패턴</div>
    <div class="card">
      <div class="field">
        <label>사는 지역</label>
        <select id="humanRegion">
          <option value="">지역 선택</option>
          <option>서울</option><option>경기</option><option>인천</option>
          <option>부산</option><option>대구</option><option>광주</option>
          <option>대전</option><option>울산</option><option>세종</option>
          <option>강원</option><option>충북</option><option>충남</option>
          <option>전북</option><option>전남</option><option>경북</option>
          <option>경남</option><option>제주</option><option>기타</option>
        </select>
      </div>
      <div class="field">
        <label>평소 활동량</label>
        <div class="env-row" style="margin-bottom:0;flex-wrap:wrap">
          <button class="env-btn" id="lsSedentary" onclick="selectLifestyle('sedentary')">💺<span>좌식·사무</span></button>
          <button class="env-btn" id="lsMixed" onclick="selectLifestyle('mixed')">🚶<span>보통</span></button>
          <button class="env-btn" id="lsActive" onclick="selectLifestyle('active')">🏃<span>활동적</span></button>
          <button class="env-btn" id="lsShift" onclick="selectLifestyle('shift')">🌙<span>교대·불규칙</span></button>
        </div>
      </div>
    </div>

    <div class="section-title">👤 연락처</div>
    <div class="card">
      <div class="field">
        <label>연락처 <span style="color:#ef4444">*</span></label>
        <input type="tel" id="humanContact" placeholder="010-0000-0000" maxlength="13" oninput="formatPhone(this)"/>
      </div>
      <div class="consent-box">
        <div class="consent-row">
          <input type="checkbox" id="humanConsentMarketing"/>
          <label for="humanConsentMarketing">
            <strong>[선택] 마케팅 정보 수신 동의</strong><br>
            신제품 출시, 프로모션, 건강 정보 등 유용한 소식을 받아보겠습니다.
          </label>
        </div>
        <div class="consent-row">
          <input type="checkbox" id="humanConsentPrivacy" required/>
          <label for="humanConsentPrivacy">
            <strong>[필수] 개인정보 수집 및 이용 동의</strong><br>
            검사 결과 분석 및 서비스 제공 목적으로 입력하신 정보를 수집합니다.
          </label>
        </div>
      </div>
    </div>

    <button class="btn-primary" onclick="goCapture('human')">다음 — 사진 촬영 →</button>
    <button class="btn-outline" onclick="goHome()">← 홈으로</button>
  </div>

  <!-- ════════════ AI 영양사 채팅 ════════════ -->
  <div class="screen" id="screenChat">
    <div class="chat-header">
      <button class="chat-back" onclick="exitChat()">← 결과로</button>
      <h2>🤖 AI 영양사<span class="sub">검사 결과 기반 맞춤 답변</span></h2>
      <button class="chat-back" onclick="goHome()" style="font-size:11px">🏠 홈</button>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-suggestions" id="chatSuggestions">
      <button class="chat-suggest" onclick="sendSuggest('이번 검사 결과 더 자세히 설명해줘')">결과 자세히</button>
      <button class="chat-suggest" onclick="sendSuggest('오늘 점심 메뉴 추천해줘')">점심 추천</button>
      <button class="chat-suggest" onclick="sendSuggest('가장 시급한 영양제 1개만 추천')">영양제 1개</button>
      <button class="chat-suggest" onclick="sendSuggest('운동 추천해줘')">운동 추천</button>
      <button class="chat-suggest" onclick="sendSuggest('피해야 할 음식은?')">피할 음식</button>
    </div>
    <div class="chat-input-bar">
      <input type="text" id="chatInput" placeholder="궁금한 거 물어보세요..." onkeydown="if(event.key==='Enter')sendChatMessage()"/>
      <button onclick="sendChatMessage()" id="chatSendBtn">↑</button>
    </div>
  </div>

  <!-- ════════════ 식단 사진 업로드 화면 ════════════ -->
  <div class="screen" id="screenFoodCapture">
    <div class="page-header">
      <button class="back-btn" onclick="goHome()" aria-label="홈으로">←</button>
      <div class="page-title">🍽 식단 분석</div>
    </div>
    <!-- 🧬 맞춤 분석 프로필 (사진 찍기 전 입력) -->
    <div id="captureProfileBanner" style="margin-bottom:12px"></div>
    <div class="card">
      <div class="field">
        <label>어떤 식사·사료인가요?</label>
        <div class="meal-time-row" style="margin-bottom:10px">
          <button class="meal-time-btn active" id="ftHuman" onclick="selectFoodTarget('human')">🧑<br>사람 식사</button>
          <button class="meal-time-btn" id="ftPet" onclick="selectFoodTarget('pet')">🐾<br>반려동물 사료</button>
        </div>
        <label id="mealTimeLabel">언제 드신 식사예요?</label>
        <div class="meal-time-row">
          <button class="meal-time-btn" id="mtBreakfast" onclick="selectMealTime('아침')">🌅<br>아침</button>
          <button class="meal-time-btn" id="mtLunch" onclick="selectMealTime('점심')">☀️<br>점심</button>
          <button class="meal-time-btn" id="mtDinner" onclick="selectMealTime('저녁')">🌙<br>저녁</button>
          <button class="meal-time-btn" id="mtSnack" onclick="selectMealTime('간식')">🍪<br>간식</button>
        </div>
      </div>
    </div>
    <div class="warning-banner" style="background:#FFF7ED;border-color:#FDBA74">
      <div class="wtitle" style="color:#9A3412">📸 사진 촬영 팁</div>
      <ul style="color:#7C2D12">
        <li>음식 전체가 잘 보이게 위에서 촬영</li>
        <li>식기·그릇 함께 찍으면 양 추정에 도움됨</li>
        <li>밝은 조명 아래에서</li>
        <li>한 식사의 음식 전부 다 한 사진에</li>
      </ul>
    </div>
    <button class="upload-btn accent" style="border-color:#F59E0B" onclick="safeCameraClick('foodCameraInput')">
      <div class="icon">📷</div>
      <div class="lbl" style="color:#F59E0B">카메라로 촬영</div>
      <div class="sub">지금 바로 식사 사진을 찍어주세요</div>
    </button>
    <button class="upload-btn" onclick="openFileInput('foodGalleryInput')">
      <div class="icon">🖼️</div>
      <div class="lbl">갤러리에서 선택</div>
      <div class="sub">저장된 사진을 불러오세요</div>
    </button>
    <button class="btn-outline" onclick="goHome()">← 홈으로</button>
  </div>

  <!-- ════════════ 식단 미리보기 ════════════ -->
  <div class="screen" id="screenFoodPreview">
    <div class="preview-wrap">
      <img id="foodPreviewImg" src="" alt="식단 이미지"/>
      <button class="btn-close-img" onclick="showScreen('screenFoodCapture')">×</button>
    </div>
    <div class="error-box" id="foodErrorBox"></div>
    <button class="btn-primary" id="btnFoodAnalyze" onclick="analyzeFood()" style="background:linear-gradient(135deg,#F59E0B,#EA580C);box-shadow:0 4px 14px rgba(245,158,11,.40)">🤖 AI 식단 분석 시작</button>
    <div class="loading-box" id="foodLoadingBox">
      <div class="emoji">🍴</div>
      <p>AI 영양사가 분석 중이에요...</p>
      <small>음식 종류, 칼로리, 영양소를 계산하고 있어요</small>
    </div>
  </div>

  <!-- ════════════ 🔍 음식 인식 확인 화면 ════════════ -->
  <div class="screen" id="screenFoodConfirm">
    <div class="confirm-hero">
      <h2>🔍 인식한 음식·재료가 맞나요?</h2>
      <p>틀리면 직접 수정해주세요. 정확할수록 더 좋은 분석!</p>
    </div>
    <div id="confirmFoodList"></div>
    <div class="confirm-actions">
      <button class="btn-primary" style="background:linear-gradient(135deg,#F59E0B,#EA580C)" onclick="confirmAndAnalyze()">✅ 이대로 정확하게 분석하기</button>
      <button class="btn-outline" onclick="showScreen('screenFoodPreview')">📷 다시 찍기</button>
    </div>
  </div>

  <!-- ════════════ 📊 종합 리포트 화면 ════════════ -->
  <div class="screen" id="screenReport">
    <div class="report-wrap">
      <button class="report-back" onclick="goHome()">← 홈으로</button>
      <div style="font-size:21px;font-weight:800;color:var(--gray-900);margin-bottom:6px">종합 영양 리포트</div>
      <div style="font-size:12px;color:#6E6E73;margin-bottom:18px">식단 데이터 기반 자동 리포트</div>
      <div class="report-tabs">
        <button class="report-tab active" id="rtToday" onclick="switchReport('today')">오늘</button>
        <button class="report-tab" id="rtWeek" onclick="switchReport('week')">이번 주</button>
      </div>
      <div id="reportContent"></div>
    </div>
  </div>

  <!-- ════════════ 식단 결과 화면 ════════════ -->
  <div class="screen" id="screenFoodResult">
    <div id="foodResultCapture">
      <!-- 총 칼로리 Hero -->
      <div class="calorie-hero">
        <div class="calorie-label" id="foodMealTimeLabel">점심 · 분석 결과</div>
        <div class="calorie-num"><span id="foodTotalCal">0</span><span class="calorie-unit">kcal</span></div>
        <div class="calorie-sub" id="foodGradeLabel">영양 균형: 양호 (B)</div>
      </div>
      <!-- 📊 일주일/한달 리포트 버튼 (점수 바로 아래) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 10px">
        <button class="report-btn" onclick="showFoodReport('week')">일주일 리포트</button>
        <button class="report-btn" onclick="showFoodReport('month')">한달 리포트</button>
      </div>
      <!-- 🧬 맞춤 분석 카드 -->
      <div id="personalAnalysisCard" style="margin-bottom:14px"></div>
      <!-- 💧 물 섭취 위젯 (결과 페이지) -->
      <div id="waterWidget" style="margin-bottom:14px"></div>
      <!-- 인식된 음식 -->
      <div class="food-list">
        <div class="nutri-title">🍴 인식된 음식</div>
        <div id="foodItemsList"></div>
      </div>
      <!-- 영양소 막대 -->
      <div class="nutri-grid">
        <div class="nutri-title">📊 영양소 분석</div>
        <div id="foodNutriItems"></div>
      </div>
      <!-- 종합 평가 -->
      <div class="card" style="background:#FAFCFF">
        <div class="nutri-title">💬 영양사 코멘트</div>
        <div id="foodSummary" style="font-size:13px;color:#475569;line-height:1.7"></div>
      </div>
      <!-- 잘된 점/주의점 -->
      <div id="foodHighlights" style="margin-bottom:14px"></div>
      <!-- 부족/과다 -->
      <div class="env-health-box" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-color:#fbbf24" id="foodMissingBox">
        <div class="etitle" style="color:var(--gray-700)">영양소 균형</div>
        <div class="env-health-item" id="foodMissingItem" style="display:none">
          <div class="elabel" style="color:var(--gray-600)">더 필요한 영양소</div>
          <div id="foodMissingText"></div>
        </div>
        <div class="env-health-item" id="foodExcessiveItem" style="display:none">
          <div class="elabel" style="color:#9F1239">과다 섭취</div>
          <div id="foodExcessiveText"></div>
        </div>
      </div>
      <!-- 다음 식사 -->
      <div class="saju-box" id="foodNextMealBox" style="display:none">
        <div class="stitle">다음 식사 추천</div>
        <div id="foodNextMeal" style="font-size:13px;color:#1E40AF;line-height:1.7"></div>
      </div>
      <!-- 추천 영양제 -->
      <div class="reco-section" id="foodSuppSection" style="display:none">
        <div class="reco-header">
          <span class="reco-icon">💊</span>
          <span class="reco-title">이 식단에 추가 권장 영양제</span>
        </div>
        <div id="foodSuppList"></div>
      </div>
      <!-- 팁 -->
      <div class="tips-box" id="foodTipsBox" style="display:none">
        <div class="ttitle">💡 관리 팁</div>
        <div id="foodTipsList"></div>
      </div>
      <img id="foodResultImg" src="" alt="식단 이미지" style="width:100%;border-radius:12px;margin-bottom:14px"/>
    </div>
    <div style="margin-top:14px">
      <button class="btn-download" style="background:linear-gradient(135deg,#F59E0B,#EA580C);box-shadow:0 3px 10px rgba(245,158,11,.35)" onclick="downloadFoodResult()">📥 결과 이미지 저장</button>
      <div class="action-row">
        <button class="btn-retake" style="border-color:#F59E0B;color:#F59E0B" onclick="showScreen('screenFoodCapture')">📷 다시 찍기</button>
        <button class="btn-new" style="background:linear-gradient(135deg,#F59E0B,#EA580C);box-shadow:0 3px 10px rgba(245,158,11,.35)" onclick="goHome()">🏠 홈으로</button>
      </div>
    </div>
  </div>

  <!-- 🧬 맞춤 분석 정보 입력 모달 (최소 입력만) -->
  <div id="personalProfileModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);overflow-y:auto;padding:16px" onclick="if(event.target===this)closePersonalProfile()">
    <div style="background:#fff;border-radius:20px;max-width:430px;margin:20px auto;padding:20px;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.3)">
      <button onclick="closePersonalProfile()" style="position:absolute;top:12px;right:12px;background:#F1F5F9;border:none;font-size:18px;width:34px;height:34px;border-radius:50%;cursor:pointer">✕</button>
      <h2 style="font-size:18px;margin:0 0 6px;color:#1F2937">🧬 내 정보 입력</h2>
      <div style="font-size:12px;color:#64748B;margin-bottom:16px;line-height:1.55">간단한 정보만 입력하시면 BMI·권장 칼로리·사상체질·사주 영양 조언을 <strong>자동으로 분석</strong>해드려요.</div>
      <div class="field"><label>성별</label>
        <select id="pp_gender" style="width:100%;padding:10px;border-radius:10px;border:1.5px solid #E2E8F0;font-size:14px">
          <option value="">선택</option>
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>
      </div>
      <div class="field"><label>생년월일</label>
        <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px">
          <input id="pp_birthYear" type="number" placeholder="1990" style="padding:10px;border-radius:10px;border:1.5px solid #E2E8F0;font-size:14px" oninput="updateAgePreview()"/>
          <input id="pp_birthMonth" type="number" placeholder="월" min="1" max="12" style="padding:10px;border-radius:10px;border:1.5px solid #E2E8F0;font-size:14px"/>
          <input id="pp_birthDay" type="number" placeholder="일" min="1" max="31" style="padding:10px;border-radius:10px;border:1.5px solid #E2E8F0;font-size:14px"/>
        </div>
        <div id="pp_agePreview" style="font-size:11.5px;color:#6366F1;margin-top:5px;font-weight:600"></div>
      </div>
      <div class="field"><label>키 / 몸무게</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input id="pp_height" type="number" placeholder="170 (cm)" style="padding:10px;border-radius:10px;border:1.5px solid #E2E8F0;font-size:14px"/>
          <input id="pp_weight" type="number" placeholder="65 (kg)" style="padding:10px;border-radius:10px;border:1.5px solid #E2E8F0;font-size:14px"/>
        </div>
      </div>
      <div style="margin-top:14px;padding:11px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:10px;font-size:11.5px;color:#075985;line-height:1.55">
        💡 사상체질(태양인·태음인·소양인·소음인)은 BMI와 사주 오행으로 자동 추정됩니다.
      </div>
      <button onclick="savePersonalProfile()" style="width:100%;margin-top:12px;padding:13px;border:none;border-radius:14px;background:linear-gradient(135deg,#8B5CF6,#6366F1);color:#fff;font-size:14px;font-weight:800;cursor:pointer">저장 후 맞춤 분석 보기</button>
    </div>
  </div>

  <!-- 📊 식단 리포트 모달 -->
  <div id="foodReportModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);overflow-y:auto;padding:16px" onclick="if(event.target===this)closeFoodReport()">
    <div style="background:#fff;border-radius:20px;max-width:480px;margin:20px auto;padding:18px;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.3)">
      <button onclick="closeFoodReport()" style="position:absolute;top:12px;right:12px;background:#F1F5F9;border:none;font-size:18px;width:34px;height:34px;border-radius:50%;cursor:pointer">✕</button>
      <div id="foodReportContent"></div>
    </div>
  </div>

  <!-- ════════════ 촬영 화면 ════════════ -->
  <div class="screen" id="screenCapture">
    <div class="step-indicator">
      <div class="step-dot done"></div>
      <div class="step-dot active"></div>
      <div class="step-dot"></div>
    </div>

    <div class="warning-banner">
      <div class="wtitle">📸 촬영 전 꼭 확인하세요!</div>
      <ul>
        <li>검사 후 <strong>60~120초 후</strong>에 촬영하세요</li>
        <li><strong>빛의 밝기와 주변 환경</strong>에 따라 색상이 다르게 찍혀 결과가 달라질 수 있습니다</li>
        <li>직사광선을 피하고 <strong>형광등 아래 평평한 곳</strong>에서 촬영하세요</li>
        <li>키트 전체가 <strong>화면에 꽉 차게</strong> 찍어야 정확합니다</li>
        <li>그림자와 반사광이 없도록 해주세요</li>
      </ul>
    </div>

    <button class="upload-btn accent" onclick="safeCameraClick('cameraInput')">
      <div class="icon">📷</div>
      <div class="lbl">카메라로 촬영</div>
      <div class="sub">지금 바로 검사 키트를 찍어주세요</div>
    </button>
    <button class="upload-btn" onclick="openFileInput('galleryInput')">
      <div class="icon">🖼️</div>
      <div class="lbl">갤러리에서 선택</div>
      <div class="sub">저장된 사진을 불러오세요</div>
    </button>

    <button class="btn-outline" onclick="backToForm()">← 이전으로</button>
  </div>

  <!-- ════════════ 미리보기 화면 ════════════ -->
  <div class="screen" id="screenPreview">
    <div class="step-indicator">
      <div class="step-dot done"></div>
      <div class="step-dot active"></div>
      <div class="step-dot"></div>
    </div>

    <div class="preview-wrap">
      <img id="previewImg" src="" alt="검사 이미지"/>
      <button class="btn-close-img" onclick="showScreen('screenCapture')">×</button>
    </div>

    <div class="error-box" id="errorBox"></div>
    <div class="friendly-error" id="friendlyError">
      <div class="err-title" id="friendlyErrorTitle">😢 분석을 완료하지 못했어요</div>
      <div class="err-body" id="friendlyErrorBody"></div>
      <div class="err-action">
        <button class="err-btn primary" onclick="showScreen('screenCapture')">📷 다시 촬영</button>
        <button class="err-btn" onclick="hideFriendlyError()">닫기</button>
      </div>
    </div>

    <button class="btn-primary" id="btnAnalyze" onclick="analyze()">🔬 AI 분석 시작</button>

    <div class="loading-box" id="loadingBox">
      <div class="emoji">🤖</div>
      <p>건강어때 AI가 종합 분석 중입니다</p>
      <small>소변 수치 + 프로필 정보를 함께 분석하고 있어요...</small>
    </div>
  </div>

  <!-- ════════════ 결과 화면 ════════════ -->
  <div class="screen" id="screenResult">
    <div id="resultCapture">
      <div class="step-indicator">
        <div class="step-dot done"></div>
        <div class="step-dot done"></div>
        <div class="step-dot active"></div>
      </div>

      <!-- 🎯 검사 변화 비교 (이전 검사 있을 때만) -->
      <div id="compareWrap"></div>

      <!-- 건강 종합 점수 카드 -->
      <div class="health-score-card" id="healthScoreCard">
        <div class="score-label">HEALTH SCORE</div>
        <div class="score-main">
          <span class="score-num" id="scoreNum">--</span>
          <span class="score-unit">/100</span>
        </div>
        <div class="score-grade-wrap">
          <span class="score-grade A" id="scoreGrade">A</span>
          <span class="score-grade-label" id="scoreGradeLabel">최상</span>
        </div>
        <div class="score-bars" id="scoreBars"></div>
        <div class="score-message" id="scoreMessage">정상 범위의 건강 상태예요</div>
        <div class="score-trend-hint" id="scoreTrendHint" style="display:none">
          <span id="scoreTrendIcon">↑</span> <span id="scoreTrendText">지난번보다 +5점</span>
        </div>
      </div>

      <!-- 결과 배너 (기존) -->
      <div class="result-banner" id="resultBanner">
        <div class="big-icon" id="resultIcon">✅</div>
        <h2 id="resultTitle">종합 결과</h2>
        <div class="pet-sub" id="resultPetSub"></div>
        <div class="summary-txt" id="resultSummary"></div>
        <div class="percentile-badge" id="percentileBadge" style="display:none">
          🏅 <span id="percentileText">상위 20%</span>
        </div>
      </div>

      <div class="rec-box" id="recBox"></div>

      <!-- 🤖 AI 영양사·약사 채팅 진입 -->
      <button class="chat-btn-row" onclick="enterChat()">
        <span class="chat-btn-ic">🤖</span>
        <div class="chat-btn-text">
          <div class="chat-btn-title">AI 영양사한테 물어보기</div>
          <div class="chat-btn-sub">이번 결과 기반으로 답변해드려요</div>
        </div>
        <span class="chat-btn-arrow">›</span>
      </button>

      <!-- 📅 이번 주 액션 플랜 -->
      <div id="actionPlanWrap"></div>

      <!-- 📋 검사 결과 상세 (펼침 기본) -->
      <div class="collapse-card open" id="collapseDetail">
        <div class="collapse-header" onclick="toggleCollapse(this)">
          <div class="collapse-header-left">
            <div class="collapse-title-row">📋 검사 결과 상세 <span class="collapse-badge" id="detailBadge"></span></div>
            <div class="collapse-preview">항목별 수치 · 의료 안내 · 패턴 분석</div>
          </div>
          <span class="collapse-icon">▾</span>
        </div>
        <div class="collapse-body">

      <div class="medical-disclaimer-box" id="medicalDisclaimerBox" style="display:none">
        ⚠️ <strong>의료 안내:</strong> <span id="medicalDisclaimerText">본 결과는 의학적 진단이 아닌 일반 건강 정보입니다. 증상이 지속되거나 우려되는 경우 반드시 의료 전문가의 진료를 받으세요.</span>
      </div>

      <div class="saju-box" id="sajuBox" style="display:none">
        <div class="stitle">🔬 검사 기반 체질 건강 포인트</div>
        <div class="saju-organ" id="sajuOrgan"></div>
        <div id="sajuTips"></div>
        <div class="saju-month" id="sajuMonth"></div>
      </div>

      <div class="env-health-box" id="envHealthBox" style="display:none">
        <div class="etitle">🔍 수치 패턴 종합 분석</div>
        <div class="env-health-item" id="envAnalysisItem" style="display:none">
          <div class="elabel">📊 생활 패턴 감지 결과</div>
          <div id="envAnalysisText"></div>
        </div>
        <div class="env-health-item" id="breedAgeItem" style="display:none">
          <div class="elabel">📈 체질·연령대 수치 특이사항</div>
          <div id="breedAgeText"></div>
        </div>
      </div>

      <div class="section-title">📊 항목별 검사 결과</div>
      <div id="resultItems"></div>

        </div>
      </div>

      <!-- 💊 맞춤 처방 & 영양 관리 (접힘 기본) -->
      <div class="collapse-card" id="collapseRx">
        <div class="collapse-header" onclick="toggleCollapse(this)">
          <div class="collapse-header-left">
            <div class="collapse-title-row">💊 맞춤 처방 & 영양 관리 <span class="collapse-badge good">상세</span></div>
            <div class="collapse-preview">약사 영양제 처방 · 식단 · 운동 · 체질 분석</div>
          </div>
          <span class="collapse-icon">▾</span>
        </div>
        <div class="collapse-body">

      <div class="tips-box" id="tipsBox" style="display:none">
        <div class="ttitle">💡 관리 팁</div>
        <div id="tipsList"></div>
      </div>

      <div class="reco-section" id="suppSection" style="display:none">
        <div class="reco-header">
          <span class="reco-icon">💊</span>
          <span class="reco-title">검사 결과 맞춤 영양제</span>
        </div>
        <div id="suppList"></div>
      </div>

      <div class="reco-section" id="foodSection" style="display:none">
        <div class="reco-header">
          <span class="reco-icon" id="foodEmoji">🍖</span>
          <span class="reco-title" id="foodTitle">검사 결과 맞춤 사료 & 식단</span>
        </div>
        <div id="foodCard"></div>
      </div>

      <div class="reco-section" id="exerciseSection" style="display:none">
        <div class="reco-header">
          <span class="reco-icon">🏃</span>
          <span class="reco-title">검사 결과 맞춤 운동 & 활동</span>
        </div>
        <div id="exerciseCard"></div>
      </div>

        </div>
      </div>

      <!-- 📸 검사 이미지 & 입력 정보 (접힘 기본) -->
      <div class="collapse-card" id="collapsePhoto">
        <div class="collapse-header" onclick="toggleCollapse(this)">
          <div class="collapse-header-left">
            <div class="collapse-title-row">📸 검사 이미지 & 입력 정보</div>
            <div class="collapse-preview">촬영한 키트 사진 · 입력 정보</div>
          </div>
          <span class="collapse-icon">▾</span>
        </div>
        <div class="collapse-body">

      <img id="resultImg" src="" alt="검사 이미지" style="width:100%;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.10);margin-bottom:14px"/>

      <div class="card" id="infoSummary" style="font-size:12px;color:#64748b;line-height:2"></div>

      <div class="disclaimer">
        ⚠️ <strong style="color:#64748b">안내:</strong> 이 결과는 AI가 이미지를 분석한 참고용 정보입니다. 정확한 진단을 위해서는 반드시 <span id="disclaimerExpert">수의사</span>와 상담하시기 바랍니다. 촬영 환경(빛, 각도)에 따라 결과가 달라질 수 있습니다.
      </div>

        </div>
      </div>
    </div>

    <div style="margin-top:14px">
      <!-- SNS 공유 -->
      <div class="share-row">
        <button class="share-btn kakao" onclick="shareKakao()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path fill="#1A1A1A" d="M9 1C4.58 1 1 3.84 1 7.34c0 2.23 1.45 4.19 3.65 5.31l-.92 3.39c-.08.3.25.54.51.36l4.04-2.69c.24.02.48.04.72.04 4.42 0 8-2.84 8-6.41C17 3.84 13.42 1 9 1z"/>
          </svg>
          카카오톡 공유
        </button>
        <button class="share-btn image" onclick="downloadResult()">
          📸 인스타용 이미지
        </button>
      </div>
      <!-- 다음 검사용 키트 CTA -->
      <a class="kit-cta" href="https://smartstore.naver.com/checkmyhealth/category/ALL?cp=1" target="_blank" rel="noopener">
        <div class="cta-emoji">🛒</div>
        <div class="cta-text">
          <div class="cta-title">다음 검사용 키트, 미리 받아보세요</div>
          <div class="cta-sub">스마트스토어에서 정품 키트 주문하기 →</div>
        </div>
        <span class="cta-arrow">›</span>
      </a>
      <button class="btn-download" onclick="downloadResult()">📥 결과 이미지 저장</button>
      <button class="btn-download" style="background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 3px 10px rgba(16,185,129,.35)" onclick="downloadPDF()">📄 PDF 리포트 다운로드 (병원용)</button>
      <div class="action-row">
        <button class="btn-retake" onclick="showScreen('screenCapture')">📷 재촬영</button>
        <button class="btn-new" onclick="resetAll()">🏠 새 검사</button>
      </div>
    </div>
  </div>

  <!-- ════════════ 기록 화면 ════════════ -->
  <div class="screen" id="screenHistory">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div class="section-title" style="margin-bottom:0">📋 검사 기록</div>
      <button onclick="goHome()" style="background:none;border:none;color:#6366f1;font-size:13px;font-weight:700;cursor:pointer">🏠 홈으로</button>
    </div>
    <!-- 추세 그래프 (검사 2회 이상일 때만 표시) -->
    <div class="trend-section" id="trendSection" style="display:none">
      <div class="trend-header">
        <div class="trend-title">📊 건강 점수 추세</div>
        <span class="trend-count" id="trendCount">3회</span>
      </div>
      <div class="trend-tabs" id="trendTabs">
        <button class="trend-tab active" onclick="switchTrend('all')">전체</button>
        <button class="trend-tab" onclick="switchTrend('pet')">🐾 반려동물</button>
        <button class="trend-tab" onclick="switchTrend('human')">🧑 사람</button>
      </div>
      <div class="trend-chart-wrap">
        <canvas id="trendChart"></canvas>
      </div>
    </div>
    <div id="historyList"></div>
  </div>

</div>

<!-- Android/Chrome 홈화면 추가 배너 -->
<div id="installBanner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:14px 16px;
  align-items:center;gap:12px;box-shadow:0 -4px 20px rgba(0,0,0,.2)">
  <span style="font-size:28px">🩺</span>
  <div style="flex:1">
    <div style="font-size:13px;font-weight:800;color:#fff">건강어때 — 홈화면에 추가하기</div>
    <div style="font-size:11px;color:rgba(255,255,255,.85);margin-top:2px">아이콘을 탭하면 앱처럼 바로 실행돼요</div>
  </div>
  <button onclick="installApp()" style="background:#fff;border:none;border-radius:10px;
    padding:8px 14px;font-size:12px;font-weight:800;color:#6366f1;cursor:pointer;white-space:nowrap">추가</button>
  <button onclick="dismissInstall()" style="background:none;border:none;color:rgba(255,255,255,.7);
    font-size:20px;cursor:pointer;padding:0 4px">×</button>
</div>

<!-- iOS Safari 홈화면 추가 안내 배너 -->
<div id="iosBanner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;
  background:#1e293b;padding:16px;align-items:flex-start;gap:12px;
  box-shadow:0 -4px 20px rgba(0,0,0,.3);border-radius:16px 16px 0 0">
  <span style="font-size:28px;flex-shrink:0">🩺</span>
  <div style="flex:1">
    <div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:6px">홈화면에 앱으로 추가하는 방법</div>
    <div style="font-size:12px;color:#94a3b8;line-height:1.8">
      1️⃣ 하단 <strong style="color:#fff">공유 버튼(□↑)</strong> 탭<br>
      2️⃣ <strong style="color:#fff">"홈 화면에 추가"</strong> 선택<br>
      3️⃣ 오른쪽 위 <strong style="color:#fff">"추가"</strong> 탭 → 완료!
    </div>
  </div>
  <button onclick="document.getElementById('iosBanner').style.display='none'"
    style="background:none;border:none;color:#64748b;font-size:22px;cursor:pointer;padding:0">×</button>
</div>

<!-- 촬영 팁 모달 (첫 검사 시 자동 표시) -->
<div class="tip-overlay" id="tipOverlay" onclick="if(event.target===this)closeTip()">
  <div class="tip-modal">
    <h3>📸 사진 촬영 꿀팁</h3>
    <div class="tip-item">
      <span class="tip-emoji">⏱</span>
      <div class="tip-text"><strong>60~120초</strong> 사이에 촬영하세요. 너무 빠르면 색이 안 변하고, 너무 늦으면 변색돼요.</div>
    </div>
    <div class="tip-item">
      <span class="tip-emoji">💡</span>
      <div class="tip-text"><strong>형광등 아래 평평한 곳</strong>에서. 직사광선 ×</div>
    </div>
    <div class="tip-item">
      <span class="tip-emoji">🎯</span>
      <div class="tip-text"><strong>키트 전체가 화면에 꽉 차게.</strong> 그림자·반사광 없이</div>
    </div>
    <div class="tip-item">
      <span class="tip-emoji">⚠️</span>
      <div class="tip-text">빛 환경에 따라 결과가 다를 수 있어요. 참고용으로 활용하세요.</div>
    </div>
    <button class="tip-confirm" onclick="closeTip()">확인했어요!</button>
  </div>
</div>

<!-- 설정 모달 -->
<div class="settings-overlay" id="settingsOverlay" onclick="if(event.target===this)closeSettings()">
  <div class="settings-modal">
    <button class="settings-close" onclick="closeSettings()" aria-label="닫기">✕</button>
    <h3>설정</h3>
    <div class="settings-sub">이름 변경 및 데이터 관리</div>
    <div class="settings-current">
      <div>
        <div class="settings-current-label">현재 이름</div>
        <div class="settings-current-value" id="settingsCurrentName">-</div>
      </div>
    </div>
    <input type="text" class="settings-input" id="settingsNameInput" placeholder="새 이름 입력 (예: 진영)" maxlength="10" onkeydown="if(event.key==='Enter')saveNewName()"/>
    <button class="settings-btn settings-btn-primary" onclick="saveNewName()">이름 변경</button>
    <button class="settings-btn settings-btn-secondary" onclick="closeSettings()">취소</button>
    <div class="settings-divider"></div>
    <button class="settings-btn settings-btn-secondary" onclick="manageProfilesFromSettings()">프로필 관리 (가족·반려동물)</button>
    <a href="privacy.html" target="_blank" class="settings-btn settings-btn-secondary" style="display:block;text-decoration:none;text-align:center">개인정보 처리방침</a>
    <a href="terms.html" target="_blank" class="settings-btn settings-btn-secondary" style="display:block;text-decoration:none;text-align:center">서비스 이용약관</a>
    <button class="settings-btn settings-btn-danger" onclick="resetAllData()">모든 기록·이름 초기화</button>
  </div>
</div>

<input type="file" id="foodCameraInput" accept="image/*" capture="environment" style="position:fixed;left:-9999px;top:-9999px;opacity:0;width:1px;height:1px;pointer-events:none" aria-hidden="true" onchange="handleFoodFile(this)"/>
<input type="file" id="foodGalleryInput" accept="image/*" style="position:fixed;left:-9999px;top:-9999px;opacity:0;width:1px;height:1px;pointer-events:none" aria-hidden="true" onchange="handleFoodFile(this)"/>
<input type="file" id="cameraInput"  accept="image/*" capture="environment" style="position:fixed;left:-9999px;top:-9999px;opacity:0;width:1px;height:1px;pointer-events:none" aria-hidden="true" onchange="handleFile(this)"/>
<input type="file" id="galleryInput" accept="image/*" style="position:fixed;left:-9999px;top:-9999px;opacity:0;width:1px;height:1px;pointer-events:none" aria-hidden="true" onchange="handleFile(this)"/>

<script>
// ══════════════════════════════════════
// PWA 서비스워커 등록
// ══════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // 캐시 전부 비우기 (옛 SW가 캐싱한 망가진 응답 제거)
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      // 새 SW 발견 시 즉시 활성화
      reg.update();
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch(e) { /* 무시 */ }
  });
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBanner').style.display = 'flex';
});
function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById('installBanner').style.display = 'none';
    });
  }
}
function dismissInstall() { document.getElementById('installBanner').style.display = 'none'; }
window.addEventListener('load', () => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if (isIOS && !isStandalone) {
    setTimeout(() => {
      document.getElementById('iosBanner').style.display = 'flex';
    }, 3000);
  }
});

// ══════════════════════════════════════
// 상태
// ══════════════════════════════════════
let subjectMode    = null;   // 'pet' | 'human'
let selectedPet    = null;
let selectedEnv    = null;
let selectedGender = null;
let humanGender    = null;
let humanLifestyle = null;
let imageB64       = null;
let imageSrc       = null;
let currentResult  = null;

// ══════════════════════════════════════
// 화면 전환
// ══════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// 📸 파일 input 안정적으로 열기 (Android WebView 호환)
// ════════════════════════════════════════════════════════════════
function openFileInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) {
    console.warn('[openFileInput] 못 찾음:', inputId);
    return;
  }
  // Android WebView 호환성: 값 초기화 + 살짝 지연시켜 click
  try {
    input.value = ''; // 같은 파일 두 번 선택 가능하게
  } catch(e) {}
  // 약간의 지연을 줘서 onclick 이벤트 핸들러가 끝난 후 트리거
  setTimeout(() => {
    try {
      input.click();
    } catch(e) {
      console.error('[openFileInput] click 실패:', e);
      alert('파일 선택을 열 수 없어요. 앱을 다시 실행해주세요.');
    }
  }, 50);
}

// ════════════════════════════════════════════════════════════════
// 📸 카메라 권한 안전 호출 (iOS WKWebView 호환 — 사용자 제스처 유지)
// ════════════════════════════════════════════════════════════════
function safeCameraClick(inputId) {
  // ⚡ iOS WKWebView는 await 후 input.click()을 막음 → 동기적으로 즉시 호출!
  const input = document.getElementById(inputId);
  if (!input) {
    console.warn('[safeCameraClick] input 없음:', inputId);
    return;
  }

  try { input.value = ''; } catch(e) {}

  // 첫 사용자 안내 토스트 (비동기로 — 제스처 영향 X)
  if (!localStorage.getItem('cameraGuideShown')) {
    localStorage.setItem('cameraGuideShown', '1');
    setTimeout(() => showCameraFirstTimeToast(), 0);
  }

  // ⚡ 사용자 제스처 안에서 즉시 click — iOS 호환!
  try {
    input.click();
  } catch(e) {
    console.error('[safeCameraClick] click 실패:', e);
    showCameraPermissionGuide();
  }
}

// 첫 카메라 사용자에게 짧은 안내 토스트
function showCameraFirstTimeToast() {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-10px);background:linear-gradient(135deg,#10B981,#059669);color:#fff;padding:12px 18px;border-radius:14px;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(16,185,129,.45);z-index:99999;letter-spacing:-.2px;max-width:90%;text-align:center;line-height:1.5;opacity:0;transition:opacity .3s,transform .3s;';
  toast.innerHTML = '📸 카메라 권한 알림이 뜨면<br><strong>"허용"</strong>을 눌러주세요!';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// 권한 거부 시 친절한 안내 모달
function showCameraPermissionGuide() {
  if (document.getElementById('cameraPermissionGuide')) return; // 중복 방지

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const stepsHtml = isIOS ? '\n    1. <strong>설정</strong> 앱 열기<br>\n    2. 아래로 스크롤 → <strong>건강어때</strong> 선택<br>\n    3. <strong>카메라</strong>를 <strong>"켜기"</strong>로 변경<br>\n    4. 앱으로 돌아와서 다시 시도\n  ' : '\n    1. 휴대폰 <strong>설정</strong> 앱 열기<br>\n    2. <strong>애플리케이션</strong> 또는 <strong>앱</strong> 선택<br>\n    3. <strong>건강어때</strong> 찾기<br>\n    4. <strong>권한</strong> → <strong>카메라</strong><br>\n    5. <strong>"허용"</strong>으로 변경<br>\n    6. 앱 다시 실행\n  ';

  const modal = document.createElement('div');
  modal.id = 'cameraPermissionGuide';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;animation:fadeSlideIn .3s ease-out';
  modal.innerHTML = '<div style="background:#fff;border-radius:22px;padding:28px 24px 20px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:inherit">' +
    '<div style="font-size:48px;text-align:center;margin-bottom:10px">📷</div>' +
    '<div style="font-size:18px;font-weight:800;text-align:center;color:#065F46;margin-bottom:8px;letter-spacing:-.3px">카메라 권한이 필요해요</div>' +
    '<div style="font-size:13px;color:#475569;text-align:center;margin-bottom:18px;line-height:1.55">사진 촬영을 위해<br>카메라 권한을 허용해주세요</div>' +
    '<div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:14px;padding:15px 17px;margin-bottom:14px;font-size:13px;color:#166534;line-height:1.85">' +
      '<div style="font-weight:800;color:#065F46;margin-bottom:8px;font-size:13px">📱 설정 방법</div>' +
      stepsHtml +
    '</div>' +
    '<div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:10px;padding:10px 13px;margin-bottom:16px;font-size:11.5px;color:#92400E;line-height:1.55">💡 <strong>갤러리 기능은 권한 없이도</strong> 사용할 수 있어요. 갤러리에 저장된 사진으로 분석할 수도 있습니다.</div>' +
    '<button onclick="document.getElementById(\'cameraPermissionGuide\').remove()" style="width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;letter-spacing:-.2px;box-shadow:0 4px 14px rgba(16,185,129,.4)">확인했어요</button>' +
  '</div>';
  document.body.appendChild(modal);
  // 배경 클릭 시 닫기
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // 홈 버튼은 홈 화면 외에서 보임
  document.getElementById('btnBackHome').style.display = (id === 'screenHome' || id === 'screenWelcome') ? 'none' : 'inline-block';
  // body 클래스 (배경색 제어)
  document.body.classList.toggle('home-active', id === 'screenHome');
  document.body.classList.toggle('welcome-active', id === 'screenWelcome');
  // 홈 진입 시 카드 정보·최근 기록 갱신 + 리마인더 체크 + 물 위젯
  if (id === 'screenHome') { updateHomeStats(); refreshPointsBadge(); checkReminder(); try{ renderHomeWaterWidget(); }catch(e){} }
  // 촬영 화면 첫 진입 시 팁 표시
  if (id === 'screenCapture') maybeShowCaptureTip();
  // 식단 사진 화면 진입 시 프로필 배너 렌더링
  if (id === 'screenFoodCapture') { try { renderCaptureProfileBanner(); } catch(e){} }
  // 헤더 부제목 (홈 외 화면)
  const headerSub = document.getElementById('headerSub');
  if (headerSub) {
    if (subjectMode === 'pet')        headerSub.textContent = '반려동물 건강검진';
    else if (subjectMode === 'human') headerSub.textContent = '본인 건강검진';
    else                              headerSub.textContent = 'AI 소변검사 키트 분석';
  }
  window.scrollTo(0, 0);
}

// ════════════════════════════════════════════════════════════════
// 홈 카드 footer + 최근 검사 기록 영역 갱신
// ════════════════════════════════════════════════════════════════
function timeAgo(iso) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)        return '방금 전';
  if (sec < 3600)      return Math.floor(sec/60) + '분 전';
  if (sec < 86400)     return Math.floor(sec/3600) + '시간 전';
  if (sec < 86400*7)   return Math.floor(sec/86400) + '일 전';
  if (sec < 86400*30)  return Math.floor(sec/(86400*7)) + '주 전';
  return Math.floor(sec/(86400*30)) + '개월 전';
}
function updateHomeStats() {
  try {
    const all = [
      ...JSON.parse(localStorage.getItem('urineHistoryV2')||'[]'),
      ...JSON.parse(localStorage.getItem('petUrineHistory')||'[]').map(h=>({...h,subject:'pet'}))
    ].sort((a,b)=> new Date(b.date)-new Date(a.date));

    const lastHuman = all.find(h=>h.subject==='human');
    const lastPet   = all.find(h=>h.subject==='pet'||!h.subject);

    document.getElementById('humanLastInfo').textContent =
      lastHuman ? `마지막 기록 ${timeAgo(lastHuman.date)}` : '마지막 기록 없음';
    document.getElementById('petLastInfo').textContent =
      lastPet ? `최근 기록 ${timeAgo(lastPet.date)}` : '최근 기록 없음';
    // 식단 기록
    try {
      const foodH = JSON.parse(localStorage.getItem('foodHistoryV1')||'[]');
      const lastFood = foodH[0];
      const foodEl = document.getElementById('foodLastInfo');
      if (foodEl) foodEl.textContent = lastFood ? `최근 ${timeAgo(lastFood.date)}` : '아직 기록 없음';
    } catch(e) {}

    // 최근 검사 기록 카드
    const recent = all[0];
    if (recent) {
      const subj = recent.subject === 'human' ? '🧑 ' : (recent.petType==='dog'?'🐶 ':recent.petType==='cat'?'🐱 ':'🐾 ');
      document.getElementById('recentTitle').textContent = subj + (recent.name || '이름 없음') + ' · ' + timeAgo(recent.date);
      const STAT = { normal:'정상', warning:'주의', danger:'이상' };
      document.getElementById('recentSub').textContent = (STAT[recent.overallStatus] || '결과 없음') + ' · ' + (recent.summary || '결과 보기').slice(0,28);
    } else {
      document.getElementById('recentTitle').textContent = '아직 저장된 검사 기록이 없어요';
      document.getElementById('recentSub').textContent = '첫 건강 체크를 시작해보세요';
    }
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════
// ★ 환영 화면 로직
// ════════════════════════════════════════════════════════════════
function timeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12)  return '좋은 아침이에요';
  if (h >= 12 && h < 18) return '좋은 오후예요';
  if (h >= 18 && h < 22) return '좋은 저녁이에요';
  return '안녕하세요';
}

async function initWelcome() {
  // 카카오 콜백으로 돌아왔는지 확인
  const came = await handleKakaoCallback();
  if (came) return;

  // 통합 프로필 V2가 있으면 = 가입 완료된 사용자
  const v2 = getUserProfile();
  const name = v2?.name || localStorage.getItem('userName');

  if (!name || !v2) {
    // 신규 또는 옛 사용자(이름만 있는) → 통합 가입 폼
    document.getElementById('welcomeFirst').style.display = 'block';
    document.getElementById('welcomeReturn').style.display = 'none';
    // 옛 사용자면 이름 미리 채워줌
    if (name && !v2) {
      const nameInput = document.getElementById('su_name');
      if (nameInput) nameInput.value = name;
    }
  } else {
    // 가입 완료된 사용자 → 인사 후 홈
    document.getElementById('welcomeReturn').style.display = 'block';
    document.getElementById('welcomeFirst').style.display = 'none';
    document.getElementById('welcomeGreet').textContent = timeGreeting();
    document.getElementById('welcomeName').textContent = name;
    // Supabase에 last_active 갱신
    try { syncUserToSupabase(v2); } catch(e){}
    setTimeout(() => goHome(), 2000);
  }
}

// ════════════════════════════════════════════════════════════════
// ★ 카카오 로그인
// ════════════════════════════════════════════════════════════════
function loginWithKakao() {
  if (!window.Kakao || !Kakao.isInitialized()) {
    alert('카카오 SDK를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    return;
  }
  // 로그인 시작 시점의 URL을 저장 (콜백 후 동일 URL을 사용해야 함)
  const redirectUri = window.location.origin + window.location.pathname;
  sessionStorage.setItem('kakao_redirect_uri', redirectUri);

  // 모바일 환경 감지 (iOS/Android)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // 모바일이면 카카오톡 앱과 연동(throughTalk), 데스크탑은 카카오 계정 페이지
  Kakao.Auth.authorize({
    redirectUri: redirectUri,
    scope: 'profile_nickname,profile_image',
    throughTalk: isMobile  // ← 모바일에서 카카오톡 앱이 있으면 자동 로그인
  });
}

async function handleKakaoCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return false;

  // URL에서 code 제거
  window.history.replaceState({}, document.title, window.location.pathname);

  document.getElementById('kakaoLoading').classList.add('show');

  try {
    // 로그인 시작 시 저장한 URI를 우선 사용 (콜백 후 path가 바뀌어도 매칭됨)
    const redirectUri = sessionStorage.getItem('kakao_redirect_uri')
      || (window.location.origin + window.location.pathname);
    sessionStorage.removeItem('kakao_redirect_uri');

    // 서버 함수 호출 (CORS 우회 + 토큰 교환 + 사용자 조회 한 번에)
    const res = await fetch('/api/kakao-callback', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ code, redirectUri })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || '로그인 실패');

    const name = data.nickname || '사용자';
    const profileImg = data.profileImage;
    const kakaoId = data.kakaoId;

    localStorage.setItem('userName', name);
    localStorage.setItem('kakaoId', String(kakaoId));
    localStorage.setItem('loginProvider', 'kakao');
    maybeEarnSignupBonus();
    if (profileImg) localStorage.setItem('userProfileImg', profileImg);
    if (data.email) localStorage.setItem('userEmail', data.email);

    document.getElementById('kakaoLoading').classList.remove('show');

    // 환영 인사 → 홈
    document.getElementById('welcomeFirst').style.display = 'none';
    document.getElementById('welcomeReturn').style.display = 'block';
    document.getElementById('welcomeGreet').textContent = '반가워요';
    document.getElementById('welcomeName').textContent = name;
    setTimeout(() => goHome(), 2200);
    return true;
  } catch(e) {
    document.getElementById('kakaoLoading').classList.remove('show');
    alert('카카오 로그인에 실패했어요: ' + e.message);
    return false;
  }
}

function saveName() {
  const inp = document.getElementById('nameInput');
  const v = (inp.value || '').trim();
  if (!v) {
    inp.focus();
    return;
  }
  localStorage.setItem('userName', v);
  // 첫 가입 보너스 +500P (1회만)
  maybeEarnSignupBonus();
  // 인사 모드로 부드럽게 전환
  document.getElementById('welcomeFirst').style.display = 'none';
  document.getElementById('welcomeReturn').style.display = 'block';
  document.getElementById('welcomeGreet').textContent = '반가워요';
  document.getElementById('welcomeName').textContent = v;
  // 애니메이션 재실행을 위해 reflow
  void document.getElementById('welcomeReturn').offsetWidth;
  setTimeout(() => goHome(), 2200);
}

function goHome() {
  subjectMode = null;
  showScreen('screenHome');
}
function goHistory() {
  renderHistory();
  showScreen('screenHistory');
  // 추세 그래프도 함께 렌더
  setTimeout(() => renderTrendChart(), 100);
}

// ════════════════════════════════════════════════════════════════
// 💎 포인트 시스템
// ════════════════════════════════════════════════════════════════
const POINTS_KEY = 'userPoints';
const POINT_HISTORY_KEY = 'pointHistoryV1';
const CHECKIN_KEY = 'lastCheckIn';
const STREAK_KEY = 'streakCount';
const EARNED_FLAGS_KEY = 'earnedFlags';
const ORDERS_KEY = 'rewardOrdersV1';

// 보상 카탈로그 (운영자가 여기서 수정 — id/cost/name/desc 자유롭게)
const REWARD_CATALOG = [
  // 기프티콘 (카카오톡 선물하기로 발송 — 폰번호만 필요)
  { id:'mega',  type:'gifticon', cost:1000,  emoji:'☕', name:'메가커피 아메리카노', desc:'카카오톡으로 받아요' },
  { id:'star',  type:'gifticon', cost:2500,  emoji:'⭐', name:'스타벅스 아메리카노', desc:'카카오톡으로 받아요' },
  // 키트 할인 쿠폰 (스마트스토어 결제 시 사용)
  { id:'c5k',   type:'coupon',   cost:3000,  emoji:'🎟️', name:'키트 5,000원 할인 쿠폰', desc:'스마트스토어 결제 시 사용' },
  // 실물 배송
  { id:'freekit', type:'physical', cost:5000, emoji:'🎁', name:'키트 1박스 무료 (배송)', desc:'정품 키트 1박스 무료 발송' },
  { id:'sample',  type:'physical', cost:7000, emoji:'💊', name:'영양제 샘플팩', desc:'엄선된 영양제 샘플 1세트' },
  { id:'snack',   type:'physical', cost:10000, emoji:'🥨', name:'반려동물 간식 박스', desc:'프리미엄 간식 모음' },
];

function getPoints() { return parseInt(localStorage.getItem(POINTS_KEY) || '0', 10); }
function setPoints(p) { localStorage.setItem(POINTS_KEY, String(Math.max(0, p))); refreshPointsBadge(); }
function getPointHistory() { try { return JSON.parse(localStorage.getItem(POINT_HISTORY_KEY) || '[]'); } catch(e) { return []; } }
function getEarnedFlags() { try { return JSON.parse(localStorage.getItem(EARNED_FLAGS_KEY) || '{}'); } catch(e) { return {}; } }
function setEarnedFlag(key) { const f = getEarnedFlags(); f[key] = true; localStorage.setItem(EARNED_FLAGS_KEY, JSON.stringify(f)); }
function hasEarnedFlag(key) { return !!getEarnedFlags()[key]; }

function addPoints(amount, reason) {
  const cur = getPoints();
  setPoints(cur + amount);
  const history = getPointHistory();
  history.unshift({
    date: new Date().toISOString(),
    amount,
    reason: reason || '',
  });
  localStorage.setItem(POINT_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  // 짧은 토스트 (있을 때만)
  if (amount > 0) showPointToast(`+${amount}P 적립! (${reason})`);
}
function showPointToast(msg) {
  let toast = document.getElementById('pointToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pointToast';
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#fff;padding:11px 18px;border-radius:999px;font-size:13px;font-weight:800;box-shadow:0 8px 24px rgba(251,191,36,.45);z-index:99999;letter-spacing:-.2px;opacity:0;transition:opacity .3s,transform .3s';
    document.body.appendChild(toast);
  }
  toast.textContent = '💎 ' + msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
  }, 2500);
}
function refreshPointsBadge() {
  const num = getPoints();
  const homeBadge = document.getElementById('homePointsNum');
  if (homeBadge) homeBadge.textContent = num.toLocaleString();
  const heroNum = document.getElementById('pointsHeroNum');
  if (heroNum) heroNum.textContent = num.toLocaleString();
}
function goPoints() {
  renderPointsPage();
  showScreen('screenPoints');
}
function renderPointsPage() {
  refreshPointsBadge();
  // 오늘 적립 가능 한도 표시
  const tLeft = document.getElementById('todayTestLeft');
  const pLeft = document.getElementById('todayProfileLeft');
  if (tLeft) tLeft.textContent = remainingToday('test');
  if (pLeft) pLeft.textContent = remainingToday('profile');
  // 출석 상태
  const lastCheckIn = localStorage.getItem(CHECKIN_KEY);
  const today = new Date().toISOString().split('T')[0];
  const streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
  const checkinBtn = document.getElementById('checkinBtn');
  const checkinSub = document.getElementById('checkinSub');
  if (lastCheckIn === today) {
    checkinBtn.textContent = '오늘 완료';
    checkinBtn.disabled = true;
    checkinSub.textContent = `${streak}일 연속 출석 중! 내일 또 만나요`;
  } else {
    checkinBtn.textContent = '+50P 받기';
    checkinBtn.disabled = false;
    checkinSub.textContent = '매일 출석 50P · 7일 연속 200P 보너스';
  }
  // 스트릭 도트 (7개)
  const streakRow = document.getElementById('streakRow');
  const todayDone = lastCheckIn === today;
  const baseStreak = todayDone ? streak : streak;
  streakRow.innerHTML = Array.from({length:7}, (_,i) => {
    const done = i < (baseStreak % 7 || (baseStreak > 0 && baseStreak % 7 === 0 ? 7 : 0));
    return `<div class="streak-dot${done ? ' done' : ''}">${done ? '✓' : i+1}</div>`;
  }).join('');
  // 보상 카탈로그
  const cur = getPoints();
  const grid = document.getElementById('rewardGrid');
  grid.innerHTML = REWARD_CATALOG.map(r => {
    const canAfford = cur >= r.cost;
    return `<button class="reward-card ${r.type === 'physical' ? 'physical' : ''}" ${canAfford ? `onclick="redeemReward('${r.id}')"` : 'disabled'}>
      <div class="reward-icon-wrap">${r.emoji}</div>
      <div class="reward-info">
        <div class="reward-name">${r.name}<span class="reward-type ${r.type === 'physical' ? 'physical' : ''}">${r.type === 'physical' ? '실물' : '쿠폰'}</span></div>
        <div class="reward-desc">${r.desc}</div>
        <div class="reward-cost">💎 ${r.cost.toLocaleString()}P</div>
      </div>
    </button>`;
  }).join('');
  // 히스토리
  const history = getPointHistory();
  const histList = document.getElementById('pointHistoryList');
  if (history.length === 0) {
    histList.innerHTML = '<div style="text-align:center;color:#94A3B8;padding:24px;font-size:12px">아직 적립 내역이 없어요</div>';
  } else {
    histList.innerHTML = history.slice(0, 15).map(h => {
      const d = new Date(h.date);
      const dateStr = `${d.getMonth()+1}.${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      const isMinus = h.amount < 0;
      return `<div class="point-history-item">
        <div>
          <div class="point-history-text">${h.reason}</div>
          <div class="point-history-date">${dateStr}</div>
        </div>
        <div class="point-history-amount ${isMinus ? 'minus' : ''}">${isMinus ? '' : '+'}${h.amount.toLocaleString()}P</div>
      </div>`;
    }).join('');
  }
}

function doCheckIn() {
  const today = new Date().toISOString().split('T')[0];
  const lastCheckIn = localStorage.getItem(CHECKIN_KEY);
  if (lastCheckIn === today) return;
  // 어제였으면 streak +1, 아니면 reset
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
  streak = (lastCheckIn === yesterday) ? streak + 1 : 1;
  localStorage.setItem(CHECKIN_KEY, today);
  localStorage.setItem(STREAK_KEY, String(streak));
  let earned = 50;
  let reason = '출석 체크';
  if (streak > 0 && streak % 7 === 0) {
    earned += 200;
    reason = `${streak}일 연속 출석 보너스 🔥`;
  }
  addPoints(earned, reason);
  renderPointsPage();
}

// ── 일일 한도 관리 (어뷰징 방지) ──
const DAILY_LIMITS = {
  test: 3,      // 검사 적립 하루 3회까지
  profile: 5,   // 프로필 추가 적립 하루 5명까지
};
const DAILY_COUNTS_KEY = 'dailyCountsV1';
function getTodayKey() { return new Date().toISOString().split('T')[0]; }
function getDailyCounts() {
  try {
    const data = JSON.parse(localStorage.getItem(DAILY_COUNTS_KEY) || '{}');
    if (data.date !== getTodayKey()) return { date: getTodayKey() };
    return data;
  } catch(e) { return { date: getTodayKey() }; }
}
function incrementDailyCount(action) {
  const data = getDailyCounts();
  data[action] = (data[action] || 0) + 1;
  localStorage.setItem(DAILY_COUNTS_KEY, JSON.stringify(data));
  return data[action];
}
function canEarn(action) {
  const counts = getDailyCounts();
  const cur = counts[action] || 0;
  return cur < (DAILY_LIMITS[action] || 99);
}
function remainingToday(action) {
  const counts = getDailyCounts();
  const cur = counts[action] || 0;
  return Math.max(0, (DAILY_LIMITS[action] || 99) - cur);
}

// 검사 완료 시 100P (하루 3회 한도)
function earnFromTest() {
  if (canEarn('test')) {
    incrementDailyCount('test');
    const remaining = remainingToday('test');
    const suffix = remaining > 0 ? ` · 오늘 ${remaining}회 더 가능` : ' · 오늘 한도 도달';
    addPoints(100, '소변검사 분석 완료' + suffix);
  } else {
    showPointToast('오늘 검사 적립 한도 도달 (내일 다시!)');
  }
}
// 프로필 추가 시 50P (하루 5명 한도)
function earnFromNewProfile(name) {
  if (canEarn('profile')) {
    incrementDailyCount('profile');
    addPoints(50, `새 프로필 추가 (${name})`);
  }
}
// 첫 가입 보너스 500P
function maybeEarnSignupBonus() {
  if (hasEarnedFlag('signup_bonus')) return;
  setEarnedFlag('signup_bonus');
  addPoints(500, '🎁 첫 가입 환영 보너스!');
}

// 보상 교환
let pendingReward = null;
function redeemReward(rewardId) {
  const reward = REWARD_CATALOG.find(r => r.id === rewardId);
  if (!reward) return;
  if (getPoints() < reward.cost) return;
  if (!confirm(`${reward.name} (${reward.cost.toLocaleString()}P)\n교환하시겠어요?`)) return;
  pendingReward = reward;
  if (reward.type === 'coupon') {
    // 쿠폰: 코드 발급 즉시 차감 (코드 받은 시점에 확정)
    addPoints(-reward.cost, `🎁 ${reward.name}`);
    showCouponModal(reward);
  } else if (reward.type === 'gifticon') {
    // 기프티콘: 폼 제출 후 차감
    showGifticonForm(reward);
  } else {
    // 실물: 폼 제출 후 차감
    showShippingForm(reward);
  }
}

function showGifticonForm(reward) {
  // 기프티콘은 폰번호만 필요 (카톡 선물하기)
  document.getElementById('couponDigital').style.display = 'none';
  document.getElementById('couponShipping').style.display = 'block';
  document.getElementById('couponDone').style.display = 'none';
  document.getElementById('shippingItemName').textContent = reward.name + ' 💌 카톡으로 받기';
  // 주소 필드 숨기고 폰번호만
  const ship1 = document.getElementById('shipAddress1').closest('.field');
  const ship2 = document.getElementById('shipAddress2').closest('.field');
  const memo = document.getElementById('shipMemo').closest('.field');
  if (ship1) ship1.style.display = 'none';
  if (ship2) ship2.style.display = 'none';
  if (memo) memo.style.display = 'none';
  // 이전 폰번호 자동 채우기
  const lastOrder = getOrders().find(o => o.shipPhone);
  if (lastOrder) {
    document.getElementById('shipName').value = lastOrder.shipName || '';
    document.getElementById('shipPhone').value = lastOrder.shipPhone || '';
  }
  document.getElementById('couponOverlay').classList.add('show');
}
function generateCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return 'HC-' + code;
}
function showCouponModal(reward) {
  const code = generateCouponCode();
  // 발급 기록 저장
  const orders = getOrders();
  orders.unshift({
    id: 'O' + Date.now(),
    type: 'coupon',
    rewardId: reward.id,
    rewardName: reward.name,
    couponCode: code,
    date: new Date().toISOString(),
    status: 'issued'
  });
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  document.getElementById('couponDigital').style.display = 'block';
  document.getElementById('couponShipping').style.display = 'none';
  document.getElementById('couponDone').style.display = 'none';
  document.getElementById('couponSubtitle').textContent = reward.name;
  document.getElementById('couponCode').textContent = code;
  document.getElementById('couponOverlay').classList.add('show');
}
function showShippingForm(reward) {
  document.getElementById('couponDigital').style.display = 'none';
  document.getElementById('couponShipping').style.display = 'block';
  document.getElementById('couponDone').style.display = 'none';
  document.getElementById('shippingItemName').textContent = reward.name;
  // 실물 신청은 모든 필드 보이게
  const ship1 = document.getElementById('shipAddress1').closest('.field');
  const ship2 = document.getElementById('shipAddress2').closest('.field');
  const memo = document.getElementById('shipMemo').closest('.field');
  if (ship1) ship1.style.display = '';
  if (ship2) ship2.style.display = '';
  if (memo) memo.style.display = '';
  // 이전 주소 자동 채우기
  const lastOrder = getOrders().find(o => o.type === 'physical' && o.shipName);
  if (lastOrder) {
    document.getElementById('shipName').value = lastOrder.shipName || '';
    document.getElementById('shipPhone').value = lastOrder.shipPhone || '';
    document.getElementById('shipAddress1').value = lastOrder.shipAddress1 || '';
    document.getElementById('shipAddress2').value = lastOrder.shipAddress2 || '';
  }
  document.getElementById('couponOverlay').classList.add('show');
}
function getOrders() { try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch(e) { return []; } }
function submitShipping() {
  const name = document.getElementById('shipName').value.trim();
  const phone = document.getElementById('shipPhone').value.trim();
  const addr1 = document.getElementById('shipAddress1').value.trim();
  const addr2 = document.getElementById('shipAddress2').value.trim();
  const memo = document.getElementById('shipMemo').value.trim();
  const isGifticon = pendingReward.type === 'gifticon';
  // 기프티콘: 이름+폰번호만 / 실물: 이름+폰번호+주소
  if (!name || !phone) { alert('이름, 연락처는 필수예요!'); return; }
  if (!isGifticon && !addr1) { alert('주소는 필수예요!'); return; }
  // 최종 제출 시점에 포인트 차감 (도중 닫으면 차감 안 됨)
  if (getPoints() < pendingReward.cost) {
    alert('포인트가 부족해요. 다시 시도해주세요.');
    return;
  }
  addPoints(-pendingReward.cost, `🎁 ${pendingReward.name}`);
  const orderId = 'O' + Date.now();
  const orders = getOrders();
  orders.unshift({
    id: orderId,
    type: pendingReward.type,
    rewardId: pendingReward.id,
    rewardName: pendingReward.name,
    shipName: name, shipPhone: phone,
    shipAddress1: addr1, shipAddress2: addr2,
    shipMemo: memo,
    date: new Date().toISOString(),
    status: 'pending'
  });
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  // 운영자에게 신청 정보 전송 (서버 API 있으면 호출)
  try {
    fetch('/api/reward-order', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        orderId, rewardId: pendingReward.id, rewardName: pendingReward.name,
        userName: localStorage.getItem('userName') || '익명',
        shipName: name, shipPhone: phone,
        shipAddress: addr1 + ' ' + addr2, shipMemo: memo
      })
    }).catch(()=>{});
  } catch(e) {}
  document.getElementById('couponDigital').style.display = 'none';
  document.getElementById('couponShipping').style.display = 'none';
  document.getElementById('couponDone').style.display = 'block';
  document.getElementById('orderNum').textContent = orderId;
}
function closeCoupon() {
  document.getElementById('couponOverlay').classList.remove('show');
  renderPointsPage();
}
function copyCoupon() {
  const code = document.getElementById('couponCode').textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      showPointToast(`쿠폰 코드 복사됨! ${code}`);
    });
  }
}

// ════════════════════════════════════════════════════════════════
// 🏠 프로필 시스템 (가족·여러 반려동물 관리)
// ════════════════════════════════════════════════════════════════
const PROFILES_KEY = 'profilesV1';
let activeProfile = null;
let profileEditMode = false;

function getProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); }
  catch(e) { return []; }
}
function saveProfiles(arr) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(arr));
}
function addProfile(profile) {
  const profiles = getProfiles();
  profile.id = 'p_' + Date.now();
  profile.createdAt = new Date().toISOString();
  profiles.push(profile);
  saveProfiles(profiles);
  return profile;
}
function deleteProfile(id) {
  if (!confirm('이 프로필을 삭제할까요?\n(과거 검사 기록은 그대로 유지됩니다)')) return;
  const profiles = getProfiles().filter(p => p.id !== id);
  saveProfiles(profiles);
  renderProfileList();
}
function toggleProfileEdit() {
  profileEditMode = !profileEditMode;
  document.getElementById('profileEditToggle').textContent = profileEditMode ? '완료' : '편집';
  renderProfileList();
}
function renderProfileList() {
  const list = document.getElementById('profileList');
  const profiles = getProfiles().filter(p => p.type === subjectMode);
  const editBtn = document.getElementById('profileEditToggle');
  editBtn.style.display = profiles.length > 0 ? 'block' : 'none';
  if (profiles.length === 0) {
    list.innerHTML = `<div class="profile-empty">아직 ${subjectMode==='human'?'사람':'반려동물'} 프로필이 없어요.<br>새로 추가해 보세요!</div>`;
    return;
  }
  list.innerHTML = profiles.map(p => {
    let avatar, meta;
    if (p.type === 'pet') {
      avatar = p.petType === 'dog' ? '🐶' : p.petType === 'cat' ? '🐱' : '🐾';
      const parts = [];
      if (p.breed) parts.push(p.breed);
      if (p.birthYear) {
        const age = new Date().getFullYear() - parseInt(p.birthYear);
        parts.push(`${age}살`);
      }
      if (p.gender) parts.push(p.gender);
      if (p.region) parts.push(p.region);
      meta = parts.join(' · ') || '정보 없음';
    } else {
      avatar = '🧑';
      const parts = [];
      if (p.gender) parts.push(p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : p.gender);
      if (p.birthYear) {
        const age = new Date().getFullYear() - parseInt(p.birthYear);
        parts.push(`${age}살`);
      }
      if (p.region) parts.push(p.region);
      meta = parts.join(' · ') || '정보 없음';
    }
    const clickAttr = profileEditMode ? '' : `onclick="useProfile('${p.id}')"`;
    return `
      <button class="profile-card ${profileEditMode ? 'edit-mode' : ''}" ${clickAttr}>
        <div class="profile-avatar ${p.type}">${avatar}</div>
        <div class="profile-info">
          <div class="profile-name">${p.name || '이름 없음'}</div>
          <div class="profile-meta">${meta}</div>
        </div>
        <svg class="arrow" viewBox="0 0 9 14"><path d="M1.5 1.5 L7 7 L1.5 12.5"/></svg>
        <button class="delete-btn" onclick="event.stopPropagation();deleteProfile('${p.id}')" aria-label="삭제">✕</button>
      </button>`;
  }).join('');
}
function useProfile(id) {
  const p = getProfiles().find(x => x.id === id);
  if (!p) return;
  activeProfile = p;
  // 폼 자동 채우기
  if (p.type === 'pet') {
    if (p.petType) { selectedPet = p.petType; setTimeout(()=>selectPet(p.petType), 50); selectedPet = p.petType; }
    document.getElementById('petName').value = p.name || '';
    document.getElementById('petBreed').value = p.breed || '';
    if (p.gender) { selectedGender = p.gender; setTimeout(()=>selectGender(p.gender), 50); selectedGender = p.gender; }
    document.getElementById('petBirthYear').value = p.birthYear || '';
    document.getElementById('petBirthMonth').value = p.birthMonth || '';
    document.getElementById('region').value = p.region || '';
    if (p.environment) { selectedEnv = p.environment; setTimeout(()=>selectEnv(p.environment), 50); selectedEnv = p.environment; }
    document.getElementById('petContact').value = p.contact || '';
    showScreen('screenPetForm');
  } else {
    document.getElementById('humanName').value = p.name || '';
    if (p.gender) { humanGender = p.gender; setTimeout(()=>selectHumanGender(p.gender), 50); humanGender = p.gender; }
    document.getElementById('humanBirthYear').value = p.birthYear || '';
    document.getElementById('humanBirthMonth').value = p.birthMonth || '';
    document.getElementById('humanRegion').value = p.region || '';
    if (p.lifestyle) { humanLifestyle = p.lifestyle; setTimeout(()=>selectLifestyle(p.lifestyle), 50); humanLifestyle = p.lifestyle; }
    document.getElementById('humanContact').value = p.contact || '';
    showScreen('screenHumanForm');
  }
}
function addNewProfileFlow() {
  activeProfile = null;
  // 빈 폼으로 이동
  if (subjectMode === 'pet') {
    document.getElementById('petName').value = '';
    document.getElementById('petBreed').value = '';
    document.getElementById('petBirthYear').value = '';
    document.getElementById('petBirthMonth').value = '';
    document.getElementById('region').value = '';
    document.getElementById('petContact').value = '';
    selectedPet = null; selectedGender = null; selectedEnv = null;
    document.querySelectorAll('#screenPetForm .active').forEach(el => el.classList.remove('active'));
    showScreen('screenPetForm');
  } else {
    document.getElementById('humanName').value = '';
    document.getElementById('humanBirthYear').value = '';
    document.getElementById('humanBirthMonth').value = '';
    document.getElementById('humanRegion').value = '';
    document.getElementById('humanContact').value = '';
    humanGender = null; humanLifestyle = null;
    document.querySelectorAll('#screenHumanForm .active').forEach(el => el.classList.remove('active'));
    showScreen('screenHumanForm');
  }
}

// 검사 후 프로필 자동 저장/업데이트
function saveOrUpdateProfile(recordData, subject) {
  if (!recordData.name && !recordData.petName) return null;
  const profiles = getProfiles();
  const name = subject === 'human' ? recordData.name : recordData.petName;
  // 같은 type + 같은 이름이면 업데이트
  const existing = profiles.find(p => p.type === subject && p.name === name);
  if (existing) {
    Object.assign(existing, {
      petType: recordData.petType, breed: recordData.breed,
      gender: recordData.gender, birthYear: recordData.birthYear,
      birthMonth: recordData.birthMonth, region: recordData.region,
      environment: recordData.environment, lifestyle: recordData.lifestyle,
      contact: recordData.contact, updatedAt: new Date().toISOString()
    });
    saveProfiles(profiles);
    return existing;
  } else {
    return addProfile({
      type: subject,
      name: name,
      petType: recordData.petType, breed: recordData.breed,
      gender: recordData.gender, birthYear: recordData.birthYear,
      birthMonth: recordData.birthMonth, region: recordData.region,
      environment: recordData.environment, lifestyle: recordData.lifestyle,
      contact: recordData.contact
    });
  }
}

// ★ 홈에서 선택 → 프로필 선택 화면으로 (없으면 바로 폼)
function enterPet() {
  subjectMode = 'pet';
  const profiles = getProfiles().filter(p => p.type === 'pet');
  if (profiles.length === 0) {
    addNewProfileFlow();
  } else {
    document.getElementById('profilePickerTitle').innerHTML = '어떤 반려동물의<br>건강을 확인할까요?';
    document.getElementById('profilePickerSub').textContent = '프로필을 선택하거나 새로 추가하세요';
    document.getElementById('profileAddLabel').textContent = '새 반려동물 추가';
    profileEditMode = false;
    renderProfileList();
    showScreen('screenProfilePicker');
  }
}
function enterHuman() {
  subjectMode = 'human';
  const profiles = getProfiles().filter(p => p.type === 'human');
  if (profiles.length === 0) {
    addNewProfileFlow();
  } else {
    document.getElementById('profilePickerTitle').innerHTML = '누구의<br>건강을 확인할까요?';
    document.getElementById('profilePickerSub').textContent = '프로필을 선택하거나 새로 추가하세요';
    document.getElementById('profileAddLabel').textContent = '새 가족 추가';
    profileEditMode = false;
    renderProfileList();
    showScreen('screenProfilePicker');
  }
}

// ════════════════════════════════════════════════════════════════
// 🍽 식단 분석 시스템
// ════════════════════════════════════════════════════════════════
let foodImageB64 = null;
let foodImageSrc = null;
let selectedMealTime = null;
let currentFoodResult = null;

// ════════════════════════════════════════════════════════════════
// 📂 접기·펼치기 토글
// ════════════════════════════════════════════════════════════════
function toggleCollapse(headerEl) {
  const card = headerEl.closest('.collapse-card');
  if (card) card.classList.toggle('open');
}
function updateCollapseBadges(r) {
  // 검사 항목 개수
  const detailBadge = document.getElementById('detailBadge');
  if (detailBadge) {
    const itemCount = (r.testItems || []).length;
    const warningCount = (r.testItems || []).filter(i => i.status === 'warning' || i.status === 'danger').length;
    if (warningCount > 0) {
      detailBadge.textContent = `${itemCount}개 항목 · ${warningCount} 주의`;
      detailBadge.className = 'collapse-badge alert';
    } else {
      detailBadge.textContent = `${itemCount}개 항목 · 모두 정상`;
      detailBadge.className = 'collapse-badge good';
    }
  }
}

// ════════════════════════════════════════════════════════════════
// 🎯 검사 변화 비교 카드
// ════════════════════════════════════════════════════════════════
function renderCompareCard(r, info) {
  const wrap = document.getElementById('compareWrap');
  wrap.innerHTML = '';
  try {
    const history = JSON.parse(localStorage.getItem('urineHistoryV2')||'[]');
    // 같은 subject·같은 이름의 이전 검사 찾기
    const currentName = info.subject === 'human' ? info.humanName : info.petName;
    const prev = history.find(h => h.fullResult && h.subject === info.subject && h.name === currentName);
    if (!prev || !prev.fullResult) return;
    const curScore = calculateHealthScore(r.testItems);
    const prevScore = calculateHealthScore(prev.fullResult.testItems);
    if (curScore === null || prevScore === null) return;
    const diff = curScore - prevScore;
    // 같은 항목 변화 분석 (있는 항목만)
    const itemChanges = [];
    const STATS = { normal:3, warning:2, danger:1 };
    (r.testItems || []).forEach(curItem => {
      const prevItem = (prev.fullResult.testItems || []).find(p => p.name === curItem.name);
      if (!prevItem) return;
      const curStat = STATS[curItem.status] || 2;
      const prevStat = STATS[prevItem.status] || 2;
      const change = curStat - prevStat;
      if (change !== 0) {
        itemChanges.push({ name: curItem.name, curStatus: curItem.status, prevStatus: prevItem.status, change });
      }
    });
    const daysSince = Math.floor((Date.now() - new Date(prev.date).getTime()) / (1000*60*60*24));
    const cardClass = diff > 0 ? '' : diff < 0 ? 'declined' : 'same';
    const arrow = diff > 0 ? '↗' : diff < 0 ? '↘' : '→';
    const diffText = diff > 0 ? `+${diff}점 개선!` : diff < 0 ? `${diff}점` : '동일';
    let message = '';
    if (diff > 10) message = '✨ 정말 큰 개선이에요! 그동안의 노력이 보여요. 이대로 유지!';
    else if (diff > 0) message = '💪 조금씩 좋아지고 있어요. 지금 흐름 계속 가요!';
    else if (diff === 0) message = '✅ 안정적으로 유지되고 있어요.';
    else if (diff > -10) message = '⚠️ 약간 떨어졌네요. 최근 식단·생활 점검이 필요해요.';
    else message = '🏥 큰 변화예요. 전문가 상담을 권장합니다.';
    const itemsHtml = itemChanges.length > 0 ? `
      <div class="compare-items">
        ${itemChanges.slice(0,4).map(c => {
          const cls = c.change > 0 ? 'up' : c.change < 0 ? 'down' : 'flat';
          const ic = c.change > 0 ? '✨ 개선' : c.change < 0 ? '⚠️ 악화' : '동일';
          const STAT = { normal:'정상', warning:'주의', danger:'이상' };
          return `<div class="compare-item-row">
            <span class="compare-item-name">${c.name}</span>
            <span class="compare-item-change ${cls}">${STAT[c.prevStatus]} → ${STAT[c.curStatus]} ${ic}</span>
          </div>`;
        }).join('')}
      </div>` : '';
    wrap.innerHTML = `
      <div class="compare-card ${cardClass}">
        <div class="compare-title">🎯 한 달 전 vs 지금</div>
        <div class="compare-score-row">
          <div class="compare-score-item">
            <div class="compare-score-label">이전</div>
            <div class="compare-score-num">${prevScore}</div>
          </div>
          <div class="compare-arrow">${arrow}</div>
          <div class="compare-score-item">
            <div class="compare-score-label">현재</div>
            <div class="compare-score-num">${curScore}</div>
            <div class="compare-diff">${diffText}</div>
          </div>
        </div>
        ${itemsHtml}
        <div class="compare-message">${message}</div>
        <div class="compare-period">📅 ${daysSince}일 전 검사와 비교</div>
      </div>`;
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════
// 📅 이번 주 액션 플랜 자동 생성
// ════════════════════════════════════════════════════════════════
function renderActionPlan(r, info) {
  const wrap = document.getElementById('actionPlanWrap');
  if (!wrap) return;
  const focus = r.focusAreas?.[0] || '신장·방광';
  const isHuman = info.subject === 'human';
  // 기본 7일 플랜 (요일별)
  const days = ['일','월','화','수','목','금','토'];
  const today = new Date().getDay();
  const plans = isHuman ? [
    '💧 물 2L 충분히 + 가벼운 산책 20분',
    '🥗 채소 위주 식단 + 단백질 살짝',
    '🏃 유산소 30분 (걷기/자전거)',
    '🥘 한식 (저염) + 영양제 챙기기',
    '🧘 충분한 수면 7시간 이상',
    '🍱 식이섬유 풍부한 식단',
    '🛌 휴식 + 일주일 컨디션 점검'
  ] : [
    '💧 충분한 신선한 물 + 짧은 산책',
    '🍽 균형 잡힌 사료 + 가벼운 놀이',
    '🐕 산책 30분 (관절 부담 X)',
    '💊 영양제 챙기기 + 식사 시간 일정',
    '🛌 충분한 휴식 + 깨끗한 잠자리',
    '🪥 양치질 + 털 관리',
    '🏥 한 주 컨디션 점검'
  ];
  const dayItems = days.map((d, i) => {
    const isToday = i === today;
    return `
      <div class="action-plan-day ${isToday ? 'today' : ''}">
        <div class="action-plan-dow">${d}${isToday ? ' (오늘)' : ''}</div>
        <div class="action-plan-text">${plans[i]}</div>
        <button class="action-plan-check" onclick="this.classList.toggle('done');this.textContent=this.classList.contains('done')?'✓':''"></button>
      </div>`;
  }).join('');
  wrap.innerHTML = `
    <div class="action-plan">
      <div class="action-plan-title">📅 이번 주 맞춤 액션 플랜</div>
      ${dayItems}
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// 🤖 AI 영양사·약사 채팅
// ════════════════════════════════════════════════════════════════
let chatMessages = [];
function exitChat() {
  // 검사 결과 있으면 결과 화면으로, 없으면 홈으로
  if (currentResult) {
    showScreen('screenResult');
  } else {
    goHome();
  }
}
function enterChat() {
  chatMessages = [];
  document.getElementById('chatMessages').innerHTML = '';
  showScreen('screenChat');
  // 인사 메시지 + 결과 요약
  if (currentResult) {
    const score = calculateHealthScore(currentResult.testItems) || 0;
    addChatBubble('ai', `안녕하세요! 검사 결과를 보고 답변해드릴 영양사예요. 🙂\n\n이번 종합 점수는 **${score}점**이고, ${currentResult.summary?.slice(0, 60) || '분석 완료됐어요'}\n\n궁금한 거 편하게 물어보세요!`);
  } else {
    addChatBubble('ai', '안녕하세요! 영양 관련해서 궁금한 거 편하게 물어보세요. 🙂');
  }
}
function addChatBubble(role, text) {
  const c = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.textContent = text;
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
  chatMessages.push({ role, text });
}
function showTyping() {
  const c = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.id = 'typingIndicator';
  div.className = 'chat-msg typing';
  div.innerHTML = '<div class="chat-typing-dots"><span></span><span></span><span></span></div>';
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}
function hideTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}
function sendSuggest(text) {
  document.getElementById('chatInput').value = text;
  sendChatMessage();
}
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addChatBubble('user', text);
  showTyping();
  document.getElementById('chatSendBtn').disabled = true;
  try {
    const res = await fetch('/api/chat-nutritionist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        context: {
          result: currentResult,
          subject: subjectMode,
          userName: localStorage.getItem('userName') || '',
          history: chatMessages.slice(-6)  // 최근 6개 메시지만
        }
      })
    });
    const data = await res.json();
    hideTyping();
    if (data.error) {
      addChatBubble('ai', '⚠️ ' + data.error);
    } else {
      addChatBubble('ai', data.reply || '답변을 받지 못했어요. 다시 시도해주세요.');
    }
  } catch(e) {
    hideTyping();
    addChatBubble('ai', '⚠️ 통신 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
  } finally {
    document.getElementById('chatSendBtn').disabled = false;
  }
}

// ════════════════════════════════════════════════════════════════
// 🐾 식단/사료 대상 선택
// ════════════════════════════════════════════════════════════════
let foodTarget = 'human';  // 'human' or 'pet'
function selectFoodTarget(target) {
  foodTarget = target;
  document.getElementById('ftHuman').classList.toggle('active', target === 'human');
  document.getElementById('ftPet').classList.toggle('active', target === 'pet');
  // 사료면 시간 라벨 변경
  document.getElementById('mealTimeLabel').textContent =
    target === 'pet' ? '언제 주는 사료예요?' : '언제 드신 식사예요?';
}

function enterFood() {
  subjectMode = 'food';
  foodTarget = 'human';
  selectFoodTarget('human');
  selectedMealTime = guessMealTime();
  ['Breakfast','Lunch','Dinner','Snack'].forEach(t => {
    const map = { Breakfast:'아침', Lunch:'점심', Dinner:'저녁', Snack:'간식' };
    document.getElementById('mt'+t).classList.toggle('active', map[t] === selectedMealTime);
  });
  showScreen('screenFoodCapture');
}
function guessMealTime() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return '아침';
  if (h >= 11 && h < 15) return '점심';
  if (h >= 17 && h < 22) return '저녁';
  return '간식';
}
function selectMealTime(time) {
  selectedMealTime = time;
  const map = { '아침':'Breakfast', '점심':'Lunch', '저녁':'Dinner', '간식':'Snack' };
  ['Breakfast','Lunch','Dinner','Snack'].forEach(t => {
    document.getElementById('mt'+t).classList.toggle('active', t === map[time]);
  });
}

function handleFoodFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    // 이미지 압축 (반찬 많은 사진 대응 — Request Too Large 방지)
    // 1000px / 70% 품질 = 안전한 사이즈 (Vercel 4.5MB 한도 안전 통과)
    compressImageForUpload(e.target.result, 1000, 0.7).then(compressed => {
      foodImageSrc = compressed;
      foodImageB64 = compressed.split(',')[1];
      document.getElementById('foodPreviewImg').src = compressed;
      document.getElementById('foodErrorBox').classList.remove('show');
      showScreen('screenFoodPreview');
    });
  };
  reader.readAsDataURL(file);
  input.value = '';
}

// 이미지 압축 — 반찬 많은 사진도 안정적으로 분석
function compressImageForUpload(dataUrl, maxDim=1200, quality=0.78) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = h * maxDim / w; w = maxDim; }
        else { w = w * maxDim / h; h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      try { resolve(canvas.toDataURL('image/jpeg', quality)); }
      catch(e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// 1단계: AI가 음식·재료 인식 → 확인 화면으로
let detectedFoodsData = null;
let originalDetectedFoodsData = null; // detect 원본 (사용자 수정 추적용)
async function analyzeFood() {
  if (!foodImageB64) return;
  const btn = document.getElementById('btnFoodAnalyze');
  const loading = document.getElementById('foodLoadingBox');
  btn.disabled = true;
  btn.textContent = '🔍 음식 인식 중...';
  loading.classList.add('show');
  document.getElementById('foodErrorBox').classList.remove('show');
  try {
    const res = await fetch('/api/analyze-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageB64: foodImageB64, target: foodTarget, mode: 'detect' })
    });
    // 응답이 JSON인지 안전하게 확인
    const txt = await res.text();
    let result;
    try { result = JSON.parse(txt); }
    catch(e) {
      throw new Error('서버 응답 오류 — 사진 크기가 너무 크거나 일시적 오류일 수 있어요. 다시 시도해주세요.');
    }
    if (result.error) throw new Error(result.error);
    detectedFoodsData = result.detectedFoods || [];
    // 원본 깊은 복사 (사용자 수정 후 비교용)
    try { originalDetectedFoodsData = JSON.parse(JSON.stringify(detectedFoodsData)); } catch(e) { originalDetectedFoodsData = null; }
    renderConfirmFoods();
    showScreen('screenFoodConfirm');
  } catch (err) {
    const box = document.getElementById('foodErrorBox');
    box.textContent = '⚠️ ' + (err.message || '인식 실패');
    box.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 AI 식단 분석 시작';
    loading.classList.remove('show');
  }
}

// 확인 화면 렌더링
function renderConfirmFoods() {
  const list = document.getElementById('confirmFoodList');
  list.innerHTML = detectedFoodsData.map((food, fi) => `
    <div class="confirm-food-card">
      <div class="confirm-food-name">
        <span style="font-size:20px">🍽</span>
        <input type="text" value="${escapeHtml(food.name)}" oninput="updateFoodName(${fi}, this.value)"/>
      </div>
      <div class="confirm-ingredients-label">재료 (수정·삭제·추가)</div>
      <div id="ingredients-${fi}">
        ${(food.ingredients || []).map((ing, ii) => `
          <span class="confirm-ing-chip">
            <input type="text" value="${escapeHtml(ing)}" oninput="updateIngredient(${fi}, ${ii}, this.value)" style="width:${Math.max(ing.length*8, 40)}px"/>
            <button onclick="removeIngredient(${fi}, ${ii})">✕</button>
          </span>
        `).join('')}
        <button class="confirm-add-btn" onclick="addIngredient(${fi})">＋ 재료 추가</button>
      </div>
    </div>
  `).join('');
}
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function updateFoodName(fi, val) { if (detectedFoodsData[fi]) detectedFoodsData[fi].name = val; }
function updateIngredient(fi, ii, val) { if (detectedFoodsData[fi] && detectedFoodsData[fi].ingredients) detectedFoodsData[fi].ingredients[ii] = val; }
function removeIngredient(fi, ii) {
  if (detectedFoodsData[fi] && detectedFoodsData[fi].ingredients) {
    detectedFoodsData[fi].ingredients.splice(ii, 1);
    renderConfirmFoods();
  }
}
function addIngredient(fi) {
  const val = prompt('추가할 재료 이름:');
  if (val && val.trim()) {
    detectedFoodsData[fi].ingredients = detectedFoodsData[fi].ingredients || [];
    detectedFoodsData[fi].ingredients.push(val.trim());
    renderConfirmFoods();
  }
}

// 2단계: 확인된 데이터로 풀 분석
async function confirmAndAnalyze() {
  const btn = event.target;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '🤖 AI 영양사 분석 중...';
  // 사용자 프로필
  const humanProfiles = getProfiles().filter(p => p.type === 'human');
  const userProfile = humanProfiles[0] || null;
  // 오늘 다른 식사들 (개인화)
  const todayMeals = getTodayMeals();
  try {
    // 28초 timeout 보호 (Vercel 10초 + Service Worker 여유)
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 28000);
    let res;
    try {
      res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 🚀 분석 단계엔 이미지 안 보냄! 확정 음식·재료만 텍스트로
          // → body 크기 4.5MB 안 넘고, AI도 5~10배 빨라짐
          mealTime: selectedMealTime, userProfile,
          target: foodTarget, mode: 'analyze',
          confirmedFoods: detectedFoodsData,
          todayMeals
        }),
        signal: ctrl.signal,
        cache: 'no-store' // Service Worker 캐시 무시
      });
    } catch(netErr) {
      clearTimeout(timeoutId);
      if (netErr.name === 'AbortError') {
        throw new Error('⏱ 서버 응답이 너무 느려요 (28초 초과). 반찬이 많아 AI가 헐떡거리는 중. 잠시 후 다시 시도해주세요.');
      }
      throw new Error('🌐 네트워크 오류: ' + (netErr.message || '연결 확인 후 다시 시도해주세요.'));
    }
    clearTimeout(timeoutId);
    const txt = await res.text();
    let result;
    try { result = JSON.parse(txt); }
    catch(e) {
      console.error('JSON parse 실패. 응답 일부:', txt.slice(0, 300));
      throw new Error('AI가 분석하는데 어려움을 겪었어요. 반찬이 너무 많거나 사진이 복잡할 수 있어요. 더 가까이서 다시 찍어보세요.');
    }
    if (result.error) throw new Error(result.error);
    // 디버깅: 응답 필드 확인
    console.log('[식단 분석 응답]', {
      hasFoodPairings: !!result.foodPairings,
      foodPairingsLen: result.foodPairings?.length,
      hasLightTips: !!result.lightTips,
      lightTipsLen: result.lightTips?.length,
      hasNextMeal: !!result.nextMeal,
      nextMealType: typeof result.nextMeal,
      hasKeyNutrients: result.foods?.some(f => f.keyNutrients?.length)
    });
    // 🎯 사용자가 수정한 재료를 결과에 강제 덮어쓰기 (AI 자체 판단 무시)
    if (detectedFoodsData && Array.isArray(result.foods)) {
      detectedFoodsData.forEach((confirmed, i) => {
        if (!result.foods[i]) return;
        if (Array.isArray(confirmed.ingredients) && confirmed.ingredients.length > 0) {
          result.foods[i].ingredients = confirmed.ingredients
            .filter(s => s && String(s).trim())
            .map(s => ({ name: String(s).trim() }));
          if (confirmed.name && confirmed.name.trim()) {
            result.foods[i].name = confirmed.name.trim();
          }
        }
      });
    }

    // 🚫 사용자가 detect 결과에서 삭제·교체한 재료들 = 제외 리스트
    // 음식별로 비교해서, 어디든 사용자가 삭제한 재료는 다 exclude
    // (예: 시금치나물에서 시금치→참나물로 바꿨으면 잡채의 시금치도 제외)
    try {
      const removedSet = new Set();
      const minLen = Math.min(
        (originalDetectedFoodsData || []).length,
        (detectedFoodsData || []).length
      );
      for (let i = 0; i < minLen; i++) {
        const origIngs = new Set(((originalDetectedFoodsData[i]?.ingredients) || [])
          .map(s => String(s).trim()).filter(Boolean));
        const curIngs = new Set(((detectedFoodsData[i]?.ingredients) || [])
          .map(s => String(s).trim()).filter(Boolean));
        origIngs.forEach(item => {
          if (!curIngs.has(item)) removedSet.add(item);
        });
      }
      result.__excludeIngs = [...removedSet];
      console.log('[제외 재료 (어디든 사용자가 삭제한 것)]:', [...removedSet]);

      // 🚫 모든 음식의 ingredients에서 excluded 재료 자동 제거
      // (예: 잡채의 ingredients에 시금치가 있어도 시금치=excluded면 제거)
      if (removedSet.size > 0 && Array.isArray(result.foods)) {
        result.foods.forEach(f => {
          if (Array.isArray(f.ingredients)) {
            f.ingredients = f.ingredients.filter(ing => {
              const name = String((typeof ing === 'string' ? ing : (ing && ing.name)) || '').trim();
              if (!name) return false;
              // 정확/부분 매칭으로 차단
              for (const ex of removedSet) {
                if (name === ex || name.includes(ex) || ex.includes(name)) return false;
              }
              return true;
            });
          }
        });
      }
    } catch(e) { result.__excludeIngs = []; }
    currentFoodResult = result;
    renderFoodResult(result);
    saveFoodHistory(result);
    if (canEarn('test')) { incrementDailyCount('test'); addPoints(100, '식단 분석 완료'); }
    showScreen('screenFoodResult');
  } catch (err) {
    alert('분석 실패: ' + (err.message || ''));
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function getTodayMeals() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const history = JSON.parse(localStorage.getItem('foodHistoryV1') || '[]');
    return history
      .filter(h => h.date && h.date.startsWith(today))
      .slice(0, 5)
      .map(h => ({ mealTime: h.mealTime, foods: h.foods, totalCalories: h.totalCalories }));
  } catch(e) { return []; }
}

// 🍱 한식 재료 궁합 사전 — 영양소 흡수·생리 작용만 (풍미·미식적 제외)
const ING_PAIRING_DICT = {
  '소고기': {
    good: [{'with':'무', reason:'무 효소가 단백질 분해·소화를 촉진해요'}],
    bad:  [{'with':'밤', reason:'밤의 타닌이 철분 흡수를 방해해요'}]
  },
  '돼지고기': {
    good: [{'with':'마늘', reason:'알리신이 비타민B1 흡수를 2배 높여줘요'}, {'with':'새우젓', reason:'새우젓 효소가 단백질 소화를 도와요'}],
    bad:  []
  },
  '닭가슴살': {
    good: [{'with':'브로콜리', reason:'단백질·항산화 영양소 시너지'}],
    bad:  []
  },
  '미역': {
    good: [{'with':'참기름', reason:'지방이 미네랄·요오드 흡수를 도와요'}],
    bad:  [{'with':'녹차', reason:'녹차 탄닌이 철분 흡수를 막아요'}]
  },
  '시금치': {
    good: [{'with':'참기름', reason:'지용성 비타민 A·K 흡수율 ↑'}, {'with':'레몬', reason:'비타민C가 철분 흡수를 도와요'}],
    bad:  [{'with':'두부', reason:'시금치 옥살산이 두부 칼슘 흡수를 방해'}]
  },
  '계란': {
    good: [{'with':'시금치', reason:'콜린 + 엽산이 세포·뇌 대사 시너지'}],
    bad:  [{'with':'감', reason:'감 타닌이 단백질과 결합해 소화 방해'}]
  },
  '토마토': {
    good: [{'with':'올리브유', reason:'지방이 라이코펜 흡수를 4배 높여요'}],
    bad:  [{'with':'오이', reason:'오이 효소가 토마토 비타민C를 파괴'}]
  },
  '두부': {
    good: [{'with':'미역', reason:'식물성 단백질 + 해조 미네랄 시너지'}],
    bad:  [{'with':'시금치', reason:'시금치 옥살산이 두부 칼슘 흡수를 방해'}]
  },
  '마늘': {
    good: [{'with':'돼지고기', reason:'알리신이 비타민B1 흡수를 2배 ↑'}, {'with':'올리브유', reason:'지방이 알리신을 안정화해 흡수↑'}],
    bad:  []
  },
  '양파': {
    good: [{'with':'견과류', reason:'견과 지방이 케르세틴 흡수를 도와요'}],
    bad:  []
  },
  '브로콜리': {
    good: [{'with':'올리브유', reason:'지방이 설포라판 활성을 높여요'}],
    bad:  []
  },
  '당근': {
    good: [{'with':'기름', reason:'지방이 베타카로틴 흡수를 8배 ↑'}],
    bad:  [{'with':'무', reason:'당근 아스코르비나아제가 무 비타민C 파괴'}]
  },
  '김치': {
    good: [{'with':'두부', reason:'유산균 + 식물성 단백질 시너지'}, {'with':'돼지고기', reason:'유산균이 지방·단백질 소화를 도와요'}],
    bad:  []
  },
  '고추장': {
    good: [{'with':'우유', reason:'유지방이 캡사이신 자극을 완화'}],
    bad:  []
  },
  '쌀': {
    good: [{'with':'콩', reason:'쌀+콩이 만나면 완전 단백질 형성'}, {'with':'잡곡', reason:'식이섬유와 미네랄을 보충'}],
    bad:  []
  },
  '흰쌀': {
    good: [{'with':'콩', reason:'쌀+콩이 만나면 완전 단백질 형성'}],
    bad:  []
  },
  '잡곡': {
    good: [{'with':'콩', reason:'단백질과 식이섬유 시너지'}],
    bad:  []
  },
  '고사리': {
    good: [{'with':'소고기', reason:'식이섬유 + 단백질 보완'}],
    bad:  [{'with':'생것', reason:'생고사리는 독성 — 반드시 데쳐서 드세요'}]
  },
  '오이': {
    good: [{'with':'미역', reason:'칼륨·미네랄 시너지'}],
    bad:  [{'with':'토마토', reason:'오이 효소가 토마토 비타민C를 파괴'}]
  },
  '연어': {
    good: [{'with':'아보카도', reason:'오메가3 + 좋은 지방으로 흡수율↑'}, {'with':'레몬', reason:'비타민C가 오메가3 산화를 방지'}],
    bad:  []
  },
  '가지': {
    good: [{'with':'들기름', reason:'지방이 안토시아닌 흡수를 도와요'}],
    bad:  []
  },
  '오징어': {
    good: [{'with':'마늘', reason:'타우린 + 알리신 항산화 시너지'}],
    bad:  [{'with':'감', reason:'감 타닌이 단백질을 굳혀 소화 방해'}]
  },
  '새우': {
    good: [{'with':'아보카도', reason:'양질 단백질 + 좋은 지방 시너지'}],
    bad:  [{'with':'감', reason:'감 타닌이 새우 단백질을 굳혀요'}]
  },
  '감자': {
    good: [{'with':'버터', reason:'지방이 지용성 비타민A·D 흡수↑'}],
    bad:  []
  },
  '고구마': {
    good: [{'with':'견과류', reason:'좋은 지방이 베타카로틴 흡수↑'}],
    bad:  []
  },
  '콩나물': {
    good: [{'with':'고춧가루', reason:'캡사이신이 비타민C 활성↑'}],
    bad:  []
  },
  '버섯': {
    good: [{'with':'들기름', reason:'지방이 비타민D 흡수를 도와요'}],
    bad:  []
  },
  '무': {
    good: [{'with':'소고기', reason:'무 효소가 단백질 소화를 촉진'}],
    bad:  [{'with':'당근', reason:'당근 효소가 무 비타민C를 파괴'}]
  },
  '깻잎': {
    good: [{'with':'고기', reason:'깻잎 폴리페놀이 지방 산화를 줄여요'}],
    bad:  []
  },
  '면': {
    good: [{'with':'계란', reason:'탄수 + 단백질 균형'}],
    bad:  []
  },
  '떡': {
    good: [{'with':'견과류', reason:'단백질·지방이 혈당 급상승을 막아요'}, {'with':'우유', reason:'부족한 단백질 보충'}],
    bad:  []
  },
  '참기름': {
    good: [{'with':'시금치', reason:'지용성 비타민 흡수↑'}, {'with':'미역', reason:'미네랄 흡수를 도와요'}],
    bad:  []
  },
  '들기름': {
    good: [{'with':'나물', reason:'오메가3 + 항산화 영양소 시너지'}, {'with':'가지', reason:'안토시아닌 흡수를 도와요'}],
    bad:  []
  },
};

// 음식 단위 궁합 사전 — reason은 친절하게 풀어서
const DISH_PAIRING_DICT = {
  '미역국': {
    good: [{'with':'잡곡밥', reason:'미역 미네랄 + 잡곡 식이섬유 보완'}],
    bad:  [{'with':'녹차', reason:'녹차 탄닌이 미역 철분 흡수를 막아요'}]
  },
  '소고기 미역국': {
    good: [{'with':'잡곡밥', reason:'단백질·미네랄·식이섬유 영양 보완'}],
    bad:  [{'with':'녹차', reason:'녹차 탄닌이 철분 흡수를 막아요'}]
  },
  '제육볶음': {
    good: [{'with':'상추쌈', reason:'식이섬유가 지방 흡수를 조절'}, {'with':'된장국', reason:'유산균이 지방·단백질 소화를 도와요'}],
    bad:  [{'with':'탄산음료', reason:'위산 분비를 자극해 소화 부담↑'}]
  },
  '잡채': {
    good: [{'with':'된장국', reason:'유산균이 당면 탄수 소화를 도와요'}],
    bad:  []
  },
  '비빔밥': {
    good: [{'with':'미역국', reason:'미네랄·요오드 보충'}],
    bad:  []
  },
  '김치찌개': {
    good: [{'with':'두부', reason:'식물성 단백질 보충'}, {'with':'잡곡밥', reason:'식이섬유 보충'}],
    bad:  []
  },
  '된장찌개': {
    good: [{'with':'쌈채소', reason:'식이섬유 + 비타민↑'}, {'with':'생선구이', reason:'단백질·오메가3 보완'}],
    bad:  []
  },
  '불고기': {
    good: [{'with':'상추쌈', reason:'식이섬유가 지방 흡수를 조절'}, {'with':'잡곡밥', reason:'섬유질 보충'}],
    bad:  [{'with':'탄산음료', reason:'기름진 음식 소화 방해'}]
  },
  '김밥': {
    good: [{'with':'단무지', reason:'단무지 효소가 탄수화물 소화를 도와요'}],
    bad:  []
  },
  '라면': {
    good: [{'with':'계란', reason:'부족한 단백질 보충'}, {'with':'김치', reason:'유산균이 소화를 도와요'}],
    bad:  [{'with':'밥', reason:'탄수화물 과다 — 혈당 급상승'}]
  },
  '국밥': {
    good: [{'with':'깍두기', reason:'유산균이 지방·단백질 소화 도움'}],
    bad:  []
  },
  '냉면': {
    good: [{'with':'편육', reason:'부족한 단백질 보충'}],
    bad:  []
  },
  '흰쌀밥': {
    good: [{'with':'단백질 반찬', reason:'단백질이 혈당 급상승을 완화'}],
    bad:  []
  },
  '잡곡밥': {
    good: [{'with':'나물', reason:'식이섬유 + 미량 영양소 시너지'}],
    bad:  []
  },
  '고사리나물': {
    good: [{'with':'잡곡밥', reason:'식이섬유 시너지'}],
    bad:  []
  },
  '미역줄기볶음': {
    good: [],
    bad:  [{'with':'녹차', reason:'녹차 탄닌이 미역 철분 흡수를 방해'}]
  },
  '시금치나물': {
    good: [{'with':'참기름', reason:'지용성 비타민 A·K 흡수율↑'}],
    bad:  [{'with':'두부', reason:'시금치 옥살산이 두부 칼슘 흡수를 방해'}]
  },
  '계란말이': {
    good: [{'with':'시금치나물', reason:'콜린 + 엽산 세포 대사 시너지'}],
    bad:  []
  },
  '깻잎장아찌': {
    good: [{'with':'고기', reason:'깻잎 폴리페놀이 지방 산화를 줄여요'}],
    bad:  []
  },
  '깍두기': {
    good: [{'with':'국밥', reason:'유산균이 지방·단백질 소화 도움'}],
    bad:  []
  },
  '단무지': {
    good: [{'with':'김밥', reason:'단무지 효소가 탄수화물 소화 도움'}],
    bad:  []
  },
  '오이무침': {
    good: [],
    bad:  [{'with':'토마토', reason:'오이 효소가 토마토 비타민C를 파괴해요'}]
  },
  '무말랭이무침': {
    good: [{'with':'잡곡밥', reason:'식이섬유 보충'}],
    bad:  []
  },
  '우엉조림': {
    good: [{'with':'생선구이', reason:'단백질·오메가3 보완'}],
    bad:  []
  },
  '멸치볶음': {
    good: [{'with':'잡곡밥', reason:'칼슘 + 식이섬유 시너지'}, {'with':'견과류', reason:'미네랄과 좋은 지방 시너지'}],
    bad:  []
  },
  '콩나물무침': {
    good: [{'with':'잡곡밥', reason:'아미노산·식이섬유 보충'}],
    bad:  []
  },
  '나물': {
    good: [{'with':'들기름', reason:'지방이 지용성 비타민 흡수를 도와요'}],
    bad:  []
  },
  '장아찌': {
    good: [],
    bad:  []
  },
};

// 🧬 음식 → 비타민·미네랄 1인분 추정 (AI 응답 없을 때 폴백)
const FOOD_MICRO_DICT = {
  // 단백질
  '소고기':   { vitaminB:2.0,  iron:2.5, zinc:4.0 },
  '돼지고기': { vitaminB:1.5,  vitaminD:0.5, iron:1.0, zinc:2.5 },
  '닭가슴살': { vitaminB:1.2,  magnesium:27, zinc:0.7 },
  '닭고기':   { vitaminB:1.0,  zinc:0.8 },
  '연어':     { vitaminD:11,   vitaminB:4.7, vitaminE:1.5, magnesium:29 },
  '계란':     { vitaminA:89,   vitaminB:0.5, vitaminD:1.0, calcium:50, iron:1.2, folate:47 },
  '두부':     { calcium:200,   magnesium:30, iron:1.5, zinc:0.8 },
  '오징어':   { vitaminB:1.3,  zinc:1.5, magnesium:33 },
  '새우':     { vitaminB:1.1,  zinc:1.4, calcium:50 },
  // 채소·나물
  '시금치':   { vitaminA:470,  vitaminC:28, folate:194, iron:2.7, magnesium:79, potassium:558, calcium:99 },
  '브로콜리': { vitaminC:89,   folate:63, vitaminA:31, calcium:47, potassium:316 },
  '당근':     { vitaminA:835,  vitaminC:6, potassium:320, vitaminE:0.7 },
  '토마토':   { vitaminA:42,   vitaminC:14, potassium:237, folate:15, vitaminE:0.5 },
  '오이':     { vitaminC:3,    potassium:147 },
  '양파':     { vitaminC:7,    folate:19, potassium:146 },
  '마늘':     { vitaminC:31,   vitaminB:1.2, magnesium:25 },
  '버섯':     { vitaminD:0.2,  vitaminB:3.6, potassium:318, folate:17 },
  '콩나물':   { vitaminC:13,   folate:172, vitaminB:0.7 },
  '깻잎':     { vitaminA:354,  vitaminC:12, calcium:296, iron:2.2, folate:150 },
  '고사리':   { folate:50,     calcium:30, iron:1.5 },
  '가지':     { vitaminC:2,    folate:22, potassium:229 },
  // 해조류
  '미역':     { calcium:152,   iron:3.0, magnesium:107, folate:196, potassium:50 },
  '김치':     { vitaminC:18,   vitaminA:220, calcium:33, folate:40, vitaminB:0.3 },
  // 탄수화물
  '잡곡밥':   { magnesium:80,  vitaminB:0.3, iron:1.0, folate:20 },
  '흰쌀밥':   { magnesium:12,  vitaminB:0.1 },
  '쌀':       { magnesium:25,  vitaminB:0.1 },
  '잡곡':     { magnesium:80,  vitaminB:0.3, iron:1.5 },
  '흰쌀':     { magnesium:12,  vitaminB:0.1 },
  '고구마':   { vitaminA:709,  vitaminC:2, potassium:337, magnesium:25 },
  '감자':     { vitaminC:20,   potassium:421, folate:18 },
  '면':       { magnesium:18,  vitaminB:0.2 },
  '당면':     { iron:1.5 },
  // 양념·기름
  '참기름':   { vitaminE:5.0 },
  '들기름':   { vitaminE:4.0 },
  '올리브유': { vitaminE:14 },
  '고추장':   { vitaminC:5,    vitaminA:50 },
  // 과일·견과
  '견과류':   { vitaminE:7,    magnesium:75, zinc:1.0 },
  '아보카도': { vitaminE:2,    vitaminB:0.3, potassium:485, magnesium:29, folate:81 },
  '바나나':   { vitaminC:10,   potassium:358, vitaminB:0.4 },
  '사과':     { vitaminC:8,    potassium:195 },
  '오렌지':   { vitaminC:70,   folate:39, calcium:43 },
  '레몬':     { vitaminC:51 },
  '키위':     { vitaminC:90,   vitaminE:1.5, potassium:215 },
  // 유제품
  '우유':     { calcium:300,   vitaminD:2.5, vitaminB:0.4 },
  '치즈':     { calcium:200,   vitaminA:80, zinc:1.0 },
  '요거트':   { calcium:180,   vitaminB:0.3 },
  // 기타
  '깍두기':   { vitaminC:10,   calcium:25 },
  '단무지':   { vitaminC:5 },
  '깻잎장아찌':{ vitaminA:200,  vitaminC:7, calcium:200, iron:1.5 },
  '무말랭이무침':{ vitaminC:8,  calcium:30 },
  '미역줄기볶음':{ calcium:120, iron:2.5, magnesium:80 },
  '미역줄기': { calcium:100,   iron:2.0, magnesium:60 },
  '우엉':     { folate:23,     magnesium:54, potassium:308 },
  '멸치':     { calcium:902,   vitaminD:3, vitaminB:0.9 }
};

// AI가 micronutrients 안 보냈을 때 음식 기반 추정으로 보완
function estimateMicronutrients(foods) {
  const totals = { vitaminA:0, vitaminC:0, vitaminD:0, vitaminE:0, vitaminB:0, folate:0, calcium:0, iron:0, magnesium:0, zinc:0, potassium:0 };
  const strip = (s) => String(s || '').replace(/\s*\([A-Za-z][^)]*\)\s*/g, '').trim();
  // 🛡 옛 데이터 호환: string·null·undefined 다 처리
  let foodsArr = foods;
  if (typeof foodsArr === 'string') foodsArr = foodsArr.split(/[,、+·]/).map(s => s.trim()).filter(Boolean);
  if (!Array.isArray(foodsArr)) foodsArr = [];
  foodsArr.forEach(f => {
    const fname = strip(typeof f === 'string' ? f : (f && f.name));
    if (!fname) return;
    // 정확 매칭
    let m = FOOD_MICRO_DICT[fname];
    // 부분 매칭
    if (!m) {
      const key = Object.keys(FOOD_MICRO_DICT).find(k => fname.includes(k) || k.includes(fname));
      if (key) m = FOOD_MICRO_DICT[key];
    }
    if (m) Object.keys(m).forEach(k => { if (totals[k] !== undefined) totals[k] += m[k]; });
    // 재료들로도 추가 (30% 가중) — 안전 처리
    let ings = (typeof f === 'object' && f) ? f.ingredients : null;
    if (!Array.isArray(ings)) ings = [];
    ings.forEach(ing => {
      const iname = strip(typeof ing === 'string' ? ing : (ing && ing.name));
      const im = FOOD_MICRO_DICT[iname];
      if (im) Object.keys(im).forEach(k => { if (totals[k] !== undefined) totals[k] += im[k] * 0.3; });
    });
  });
  Object.keys(totals).forEach(k => totals[k] = Math.round(totals[k] * 10) / 10);
  return totals;
}

// 한식 음식 → 일반적 재료 사전 (재료 추정 강화)
const FOOD_TO_INGS = {
  '소고기 미역국': ['소고기', '미역'],
  '미역국': ['미역'],
  '제육볶음': ['돼지고기', '고추장', '마늘', '양파'],
  '잡채': ['당면', '시금치', '당근', '버섯', '소고기'],
  '비빔밥': ['쌀', '시금치', '당근', '계란', '고추장'],
  '김치찌개': ['김치', '돼지고기', '두부'],
  '된장찌개': ['된장', '두부', '호박', '양파'],
  '불고기': ['소고기', '양파', '마늘'],
  '김밥': ['쌀', '계란', '시금치', '당근', '단무지'],
  '라면': ['면', '계란', '파'],
  '국밥': ['쌀', '소고기'],
  '냉면': ['면', '오이', '계란'],
  '흰쌀밥': ['쌀', '흰쌀'],
  '잡곡밥': ['쌀', '잡곡', '콩'],
  '고사리나물': ['고사리', '들기름'],
  '미역줄기볶음': ['미역', '참기름'],
  '시금치나물': ['시금치', '참기름'],
  '계란말이': ['계란', '파'],
  '깻잎장아찌': ['깻잎'],
  '깍두기': ['무'],
  '단무지': ['무'],
  '오이무침': ['오이', '고춧가루'],
  '무말랭이무침': ['무'],
  '우엉조림': ['우엉', '간장'],
  '멸치볶음': ['멸치', '견과류'],
  '콩나물무침': ['콩나물', '마늘'],
  '나물반찬': ['들기름'],
  '나물': ['들기름'],
  '쌈장': ['된장', '고추장', '마늘'],
};

// 영양소명 → 대표 재료 매핑 (재료 추정용)
const NUT_TO_ING = {
  '요오드':'미역', '철분':'소고기', '비타민B1':'돼지고기', '비타민 B1':'돼지고기',
  '알리신':'마늘', '캡사이신':'고추장', '라이코펜':'토마토', '안토시아닌':'가지',
  '베타카로틴':'당근', '오메가3':'연어', 'DHA':'연어', 'EPA':'연어',
  '엽산':'시금치', '콜린':'계란', '이소플라본':'두부', '프로바이오틱스':'김치',
  '케르세틴':'양파', '설포라판':'브로콜리', '셀레늄':'견과류'
};

// 음식 결과에 궁합 자동 채우기 (AI가 못 만들면 사전이 채움)
function enrichWithPairings(r) {
  if (!r || !r.foods) return r;
  const stripEng2 = (s) => (s || '').replace(/\s*\([A-Za-z][^)]*\)\s*/g, '').trim();
  // 🚫 사용자가 삭제·교체한 재료 (excludeIngs) — 자동 추출 시 제외
  const excludeSet = new Set((r.__excludeIngs || []).map(stripEng2));
  const isExcluded = (name) => {
    const n = stripEng2(name);
    if (excludeSet.has(n)) return true;
    // 부분 매칭도 제외 (예: '시금치나물'에서 시금치가 excluded면 차단)
    for (const ex of excludeSet) {
      if (ex && (n === ex || n.includes(ex) || ex.includes(n))) return true;
    }
    return false;
  };
  r.foods.forEach(f => {
    const fname = stripEng2(f.name);

    // 1) dishPairings 비어있으면 사전에서 찾기
    const hasDish = f.dishPairings && (f.dishPairings.good?.length || f.dishPairings.bad?.length);
    if (!hasDish) {
      // 정확 매칭 → 부분 매칭 순
      let dishMatch = DISH_PAIRING_DICT[fname];
      if (!dishMatch) {
        const key = Object.keys(DISH_PAIRING_DICT).find(k => fname.includes(k) || k.includes(fname));
        if (key) dishMatch = DISH_PAIRING_DICT[key];
      }
      if (dishMatch) f.dishPairings = dishMatch;
    }

    // 2) ingredients 처리
    // 🎯 사용자가 명시한 재료가 있으면 그것만 우선시 (음식 이름 자동 추출 무시)
    const userIngNames = (f.ingredients || [])
      .map(i => stripEng2(typeof i === 'string' ? i : (i && i.name) || ''))
      .filter(Boolean);

    if (userIngNames.length > 0) {
      // 사용자가 명시한 재료 → 사전 매칭으로 pairings 부여 (없으면 이름만)
      const finalIngs = [];
      userIngNames.forEach(iname => {
        if (finalIngs.find(g => g.name === iname)) return;
        // 정확 매칭 우선
        if (ING_PAIRING_DICT[iname]) {
          finalIngs.push({ name: iname, pairings: ING_PAIRING_DICT[iname] });
          return;
        }
        // 부분 매칭
        const matchKey = Object.keys(ING_PAIRING_DICT).find(k => iname.includes(k) || k.includes(iname));
        if (matchKey) {
          finalIngs.push({ name: iname, pairings: ING_PAIRING_DICT[matchKey] });
        } else {
          // 사전에 없으면 이름만 (궁합 데이터 없음 — 표시 안 됨)
          finalIngs.push({ name: iname });
        }
      });
      f.ingredients = finalIngs.slice(0, 8);
    } else {
      // 사용자 명시 재료 없을 때만 음식 이름·영양소에서 자동 추출
      const guessed = [];
      const addIfHasPair = (ing) => {
        if (!ing) return;
        if (isExcluded(ing)) return; // 🚫 제외 리스트 차단
        if (guessed.find(g => g.name === ing)) return;
        if (ING_PAIRING_DICT[ing]) {
          guessed.push({ name: ing, pairings: ING_PAIRING_DICT[ing] });
        }
      };
      let foodIngs = FOOD_TO_INGS[fname];
      if (!foodIngs) {
        const key = Object.keys(FOOD_TO_INGS).find(k => fname.includes(k) || k.includes(fname));
        if (key) foodIngs = FOOD_TO_INGS[key];
      }
      (foodIngs || []).forEach(addIfHasPair);
      Object.keys(ING_PAIRING_DICT).forEach(ing => {
        if (fname.includes(ing)) addIfHasPair(ing);
      });
      (f.keyNutrients || []).forEach(n => {
        const cleanN = stripEng2(n.name);
        for (const k of Object.keys(NUT_TO_ING)) {
          if (cleanN.includes(k)) { addIfHasPair(NUT_TO_ING[k]); break; }
        }
      });
      if (guessed.length > 0) f.ingredients = guessed.slice(0, 6);
    }
  });
  return r;
}

function renderFoodResult(r) {
  // 🍱 궁합·상극이 비어있으면 사전에서 자동 채우기 (AI 보완용)
  try { r = enrichWithPairings(r); } catch(e) { console.error('enrichWithPairings 에러:', e); }
  // 🧬 맞춤 분석 카드 렌더링
  try { renderPersonalAnalysis(r); } catch(e) { console.error('맞춤 분석 에러:', e); }
  // 💧 물 섭취 위젯
  try { renderWaterWidget(); } catch(e) { console.error('물 위젯 에러:', e); }
  // 게임화된 Hero (영양사 캐릭터 + 점수 원형)
  const score = r.balanceScore || 0;
  const grade = r.balanceGrade || 'B';
  const label = r.balanceLabel || '양호';
  const stars = score >= 90 ? '⭐⭐⭐⭐⭐' : score >= 80 ? '⭐⭐⭐⭐' : score >= 70 ? '⭐⭐⭐' : score >= 60 ? '⭐⭐' : '⭐';
  // 원형 진행률 (radius 52, circumference ≈ 327)
  const circ = 327;
  const offset = circ - (score / 100) * circ;
  // 영양사 캐릭터 말풍선 (요약 코멘트)
  const charHero = `
    <div class="nutritionist-talk">
      <div class="nutri-char">👩‍⚕️</div>
      <div class="speech-bubble">
        <div class="speech-name">AI 영양사</div>
        <div class="speech-text">${r.summary || '맛있는 한 끼였네요! 분석 결과를 확인해보세요 😊'}</div>
      </div>
    </div>`;
  const scoreCard = `
    <div class="game-score-card">
      <div class="game-rank-badge">${selectedMealTime} · ${label}</div>
      <div class="game-score-ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle class="ring-bg" cx="60" cy="60" r="52"></circle>
          <circle class="ring-fill" cx="60" cy="60" r="52" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="game-score-num">${score}</div>
      </div>
      <div class="game-score-label">영양 균형 [${grade}]</div>
      <div class="game-grade-stars" style="display:none">${stars}</div>
    </div>`;
  // 기존 자리에 안 보이게 처리 + 위에 새 디자인 삽입
  const oldHero = document.querySelector('.calorie-hero');
  if (oldHero) oldHero.style.display = 'none';
  let heroWrap = document.getElementById('foodGameHero');
  if (!heroWrap) {
    heroWrap = document.createElement('div');
    heroWrap.id = 'foodGameHero';
    document.getElementById('foodResultCapture').prepend(heroWrap);
  }
  heroWrap.innerHTML = charHero + scoreCard;
  // 호환용 (PDF에서도 보이게 옛 데이터 유지)
  document.getElementById('foodMealTimeLabel').textContent = `${selectedMealTime} · 분석 결과`;
  document.getElementById('foodTotalCal').textContent = (r.totalCalories || 0).toLocaleString();
  document.getElementById('foodGradeLabel').textContent = `영양 균형: ${label} (${grade}) · ${r.balanceScore || 0}점`;
  // 🎮 음식 게임 카드 + 스킬 뱃지 + 재료별 궁합 (한 카드에 통합!)
  const stripEng = (s) => (s || '').replace(/\s*\([A-Za-z][^)]*\)\s*/g, '').trim();

  // 🚫 사용자가 detect에서 삭제·교체한 재료들 — set에 절대 안 넣음
  const excludeSetForItems = new Set((r.__excludeIngs || []).map(stripEng));
  const isExcludedItem = (name) => {
    const n = stripEng(name);
    if (excludeSetForItems.has(n)) return true;
    for (const ex of excludeSetForItems) {
      if (ex && (n === ex || n.includes(ex) || ex.includes(n))) return true;
    }
    return false;
  };

  // 📸 사진 안에 있는 모든 음식·재료 set 구축 (궁합 필터링용)
  const itemsInPhoto = new Set();
  const safeAdd = (v) => { if (v && !isExcludedItem(v)) itemsInPhoto.add(v); };
  (r.foods || []).forEach(f => {
    const hasUserIngs = f.ingredients && f.ingredients.length > 0;
    if (f.name) {
      const fname = stripEng(f.name);
      itemsInPhoto.add(fname); // 음식 이름 자체는 그대로
      // 사용자 명시 재료 없을 때만 음식 이름에서 자동 추출
      if (!hasUserIngs) {
        let foodIngs = FOOD_TO_INGS[fname];
        if (!foodIngs) {
          const key = Object.keys(FOOD_TO_INGS).find(k => fname.includes(k) || k.includes(fname));
          if (key) foodIngs = FOOD_TO_INGS[key];
        }
        (foodIngs || []).forEach(safeAdd);
        Object.keys(ING_PAIRING_DICT).forEach(k => {
          if (fname.includes(k)) safeAdd(k);
        });
      }
    }
    // 사용자가 명시(또는 enrich가 채운)한 ingredients
    (f.ingredients || []).forEach(ing => {
      if (ing.name) safeAdd(stripEng(ing.name));
    });
    // keyNutrients 역추정도 사용자 명시 없을 때만
    if (!hasUserIngs) {
      (f.keyNutrients || []).forEach(n => {
        const cleanN = stripEng(n.name);
        for (const k of Object.keys(NUT_TO_ING)) {
          if (cleanN.includes(k)) safeAdd(NUT_TO_ING[k]);
        }
      });
    }
  });
  // 사진 안 음식·재료와 매칭되는지 체크 (정확/부분 매칭)
  const isInPhoto = (candidate) => {
    const w = stripEng(candidate || '').trim();
    if (!w) return false;
    for (const item of itemsInPhoto) {
      const i = String(item).trim();
      if (!i) continue;
      if (i === w) return true;
      if (w.length >= 2 && i.includes(w)) return true;
      if (i.length >= 2 && w.includes(i)) return true;
    }
    return false;
  };

  // 궁합 디버그 (에러 나도 페이지 죽지 않게)
  try {
    console.log('[사진 안 재료]', Array.from(itemsInPhoto));
  } catch(e) { /* ignore */ }
  const items = (r.foods || []).map(f => {
    const skills = (f.keyNutrients || []).slice(0, 4).map(n =>
      `<span class="skill-badge">${stripEng(n.name)}</span>`
    ).join('');
    const skillDetails = (f.keyNutrients || []).slice(0, 3).map(n =>
      `<div class="food-game-skill-detail"><strong>${stripEng(n.name)}</strong> — ${stripEng(n.benefit)}</div>`
    ).join('');

    // 음식 카드 내 궁합 섹션은 비움 — 사진 전체 통합 박스에 한 번에 표시
    const pairingsSection = '';

    return `<div class="food-game-card">
      <div class="food-game-top">
        <div>
          <div class="food-game-name">${f.name}</div>
          <div class="food-game-amount">${f.amount || ''}</div>
        </div>
        <div class="food-game-cal-badge">${(f.calories || 0).toLocaleString()} kcal</div>
      </div>
      ${skills ? `<div class="food-game-skills">${skills}</div>` : ''}
      ${skillDetails || ''}
      ${pairingsSection}
    </div>`;
  }).join('');
  document.getElementById('foodItemsList').innerHTML = items || '<div style="color:#94A3B8;font-size:12px;padding:8px">음식 인식 결과 없음</div>';

  // 🍱 다음 식사 (게임 캐릭터 스타일)
  let nextMealHtml = '';
  if (r.nextMeal && typeof r.nextMeal === 'object') {
    nextMealHtml = `<div class="next-meal-game">
      <div class="next-meal-game-emoji" style="display:none">🍱</div>
      <div class="next-meal-game-text">
        <div class="next-meal-game-label">NEXT MEAL · 다음 식사 추천</div>
        <div class="next-meal-game-menu">${r.nextMeal.menu || ''}</div>
        <div class="next-meal-game-reason">💬 ${r.nextMeal.reason || ''}</div>
      </div>
    </div>`;
  } else if (r.nextMeal) {
    nextMealHtml = `<div class="next-meal-game">
      <div class="next-meal-game-emoji" style="display:none">🍱</div>
      <div class="next-meal-game-text">
        <div class="next-meal-game-label">NEXT MEAL</div>
        <div class="next-meal-game-menu">${r.nextMeal}</div>
      </div>
    </div>`;
  }
  // 🎮 궁합 VS 카드 (음식 nested 우선, 옛 foodPairings 호환)
  // 궁합은 위에서 각 음식 카드에 통합 표시했으니 별도 박스 비움
  let pairingsHtml = '';
  const hasNested = (r.foods || []).some(f =>
    (f.dishPairings && (f.dishPairings.good?.length || f.dishPairings.bad?.length)) ||
    (f.ingredients && f.ingredients.some(i => i.pairings && (i.pairings.good?.length || i.pairings.bad?.length)))
  );
  // 별도 ⚔️ 궁합 매칭 박스는 안 보여줌 — 이미 각 음식 카드에 표시
  if (false) {
    pairingsHtml = `<div class="pairings-box"><div class="pairings-title">⚔️ 궁합 매칭</div>`;
    (r.foods || []).forEach(f => {
      const fname = stripEng(f.name);
      // 음식 단위
      if (f.dishPairings && (f.dishPairings.good?.length || f.dishPairings.bad?.length)) {
        pairingsHtml += `<div class="pair-section-header">🍴 ${fname}</div>`;
        (f.dishPairings.good || []).forEach(g => {
          pairingsHtml += `<div class="pair-vs-card good">
            <span class="pair-side">${fname}</span>
            <span class="pair-vs-icon">💚</span>
            <span class="pair-side">${stripEng(g.with)}</span>
            <span class="pair-vs-reason">${stripEng(g.reason)}</span>
          </div>`;
        });
        (f.dishPairings.bad || []).forEach(b => {
          pairingsHtml += `<div class="pair-vs-card bad">
            <span class="pair-side">${fname}</span>
            <span class="pair-vs-icon">💔</span>
            <span class="pair-side">${stripEng(b.with)}</span>
            <span class="pair-vs-reason">${stripEng(b.reason)}</span>
          </div>`;
        });
      }
      // 재료별
      (f.ingredients || []).forEach(ing => {
        if (!ing.pairings || (!ing.pairings.good?.length && !ing.pairings.bad?.length)) return;
        const iname = stripEng(ing.name);
        pairingsHtml += `<div class="pair-section-header">🌿 ${iname}</div>`;
        (ing.pairings.good || []).forEach(g => {
          pairingsHtml += `<div class="pair-vs-card good">
            <span class="pair-side">${iname}</span>
            <span class="pair-vs-icon">💚</span>
            <span class="pair-side">${stripEng(g.with)}</span>
            <span class="pair-vs-reason">${stripEng(g.reason)}</span>
          </div>`;
        });
        (ing.pairings.bad || []).forEach(b => {
          pairingsHtml += `<div class="pair-vs-card bad">
            <span class="pair-side">${iname}</span>
            <span class="pair-vs-icon">💔</span>
            <span class="pair-side">${stripEng(b.with)}</span>
            <span class="pair-vs-reason">${stripEng(b.reason)}</span>
          </div>`;
        });
      });
    });
    pairingsHtml += `</div>`;
  } else if (r.foodPairings && r.foodPairings.length > 0) {
    const dishes = r.foodPairings.filter(fp => fp.type === '음식' || (!fp.type && fp.food));
    const ingredients = r.foodPairings.filter(fp => fp.type === '재료');
    const renderVS = (fp) => {
      const itemName = fp.item || fp.food;
      let cards = '';
      (fp.good || []).forEach(g => {
        cards += `<div class="pair-vs-card good">
          <span class="pair-side">${itemName}</span>
          <span class="pair-vs-icon">💚</span>
          <span class="pair-side">${g.with}</span>
          <span class="pair-vs-reason">${g.reason}</span>
        </div>`;
      });
      (fp.bad || []).forEach(b => {
        cards += `<div class="pair-vs-card bad">
          <span class="pair-side">${itemName}</span>
          <span class="pair-vs-icon">💔</span>
          <span class="pair-side">${b.with}</span>
          <span class="pair-vs-reason">${b.reason}</span>
        </div>`;
      });
      return cards;
    };
    pairingsHtml = `<div class="pairings-box"><div class="pairings-title">⚔️ 궁합 매칭</div>`;
    if (dishes.length > 0) {
      pairingsHtml += `<div class="pair-section-header">🍽 음식 단위</div>` +
        dishes.map(fp => renderVS(fp)).join('');
    }
    if (ingredients.length > 0) {
      pairingsHtml += `<div class="pair-section-header">🌿 재료 단위</div>` +
        ingredients.map(fp => renderVS(fp)).join('');
    }
    pairingsHtml += `</div>`;
  } else if (r.pairings && (r.pairings.good?.length || r.pairings.warning?.length)) {
    // 옛 포맷 호환 (이미 분석한 결과들)
    const goods = (r.pairings.good||[]).map(p => `<div class="pair-item good"><div class="pair-combo">✨ ${p.combo}</div><div class="pair-reason">${p.benefit}</div></div>`).join('');
    const warns = (r.pairings.warning||[]).map(p => `<div class="pair-item warning"><div class="pair-combo">⚠️ ${p.combo}</div><div class="pair-reason">${p.reason}</div></div>`).join('');
    pairingsHtml = `<div class="pairings-box"><div class="pairings-title">🤝 음식 궁합 분석</div>${goods}${warns}</div>`;
  } else if (r.foods && r.foods.length > 0) {
    // 궁합 데이터가 아예 없을 때 친절한 안내
    pairingsHtml = `<div class="pairings-box" style="background:linear-gradient(135deg,#FEF3C7 0%,#FFE4E6 100%);">
      <div class="pairings-title">⚔️ 궁합 매칭</div>
      <div style="padding:12px;color:#92400E;font-size:13px;line-height:1.5;">
        💭 이번엔 AI가 궁합 데이터를 못 만들었어요.<br>
        한 번 더 분석하시면 보일 거예요 🙏
      </div>
    </div>`;
  }
  // 오늘 비교
  const todayHtml = r.todayComparison ? `<div class="today-compare-box">${r.todayComparison}</div>` : '';
  // 🎮 라이트 팁 (귀여운 캐릭터들)
  const tipEmojis = ['🍵','🚶','🛌','💧','🥗','🧘','☀️','🌙'];
  let lightTipsHtml = '';
  if (r.lightTips && r.lightTips.length > 0) {
    lightTipsHtml = `<div class="light-tips-box">
      <div class="light-tips-title">💡 건강 관리 꿀팁</div>
      ${r.lightTips.map((t, i) => `<div class="tip-game-row">
        <div class="tip-game-emoji">${tipEmojis[i % tipEmojis.length]}</div>
        <div class="tip-game-text">${t}</div>
      </div>`).join('')}
    </div>`;
  }
  // ⭐ 영양소 사전 — 모든 keyNutrients를 한 곳에 모음 (어떤 재료에서 왔는지)
  const nutrientMap = {};
  (r.foods || []).forEach(f => {
    (f.keyNutrients || []).forEach(n => {
      const cleanName = stripEng(n.name);
      const cleanBenefit = stripEng(n.benefit);
      if (!nutrientMap[cleanName]) nutrientMap[cleanName] = { benefit: cleanBenefit, foods: [] };
      nutrientMap[cleanName].foods.push(f.name);
    });
  });
  // 🎮 영양소 사전 (스킬북 스타일)
  const nutEmojiMap = {
    '라이코펜':'🍅','오메가3':'🐟','DHA':'🧠','EPA':'🐟','비타민C':'🍋','비타민A':'🥕','비타민D':'☀️',
    '비타민E':'🥑','비타민K':'🌿','비타민B':'🥩','콜린':'🥚','엽산':'🥬','철분':'🩸','칼슘':'🥛',
    '마그네슘':'🥜','칼륨':'🍌','셀레늄':'🌰','아연':'🦪','알리신':'🧄','안토시아닌':'🫐',
    '베타카로틴':'🥕','이소플라본':'🫘','프로바이오틱스':'🥬','케르세틴':'🧅','설포라판':'🥦',
    '식이섬유':'🌾','단백질':'💪'
  };
  const getNutEmoji = (name) => {
    for (const k of Object.keys(nutEmojiMap)) {
      if (name.includes(k)) return nutEmojiMap[k];
    }
    return '✨';
  };
  let nutrientDictHtml = '';
  if (Object.keys(nutrientMap).length > 0) {
    nutrientDictHtml = `<div class="nutrient-skillbook">
      <div class="nutrient-skillbook-title">📖 핵심 영양소 도감</div>
      ${Object.entries(nutrientMap).map(([name, d]) => `
        <div class="nutrient-skill">
          <div class="nutrient-skill-emoji">${getNutEmoji(name)}</div>
          <div class="nutrient-skill-body">
            <div class="nutrient-skill-name">${name}</div>
            <div class="nutrient-skill-benefit">${d.benefit}</div>
            <div class="nutrient-skill-source">${d.foods.join(', ')}에서</div>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  // 옛 nextMealBox / tipsBox 숨김 (새로운 디자인으로 대체)
  const oldNextBox = document.getElementById('foodNextMealBox');
  if (oldNextBox) oldNextBox.style.display = 'none';
  const oldTipsBox = document.getElementById('foodTipsBox');
  if (oldTipsBox) oldTipsBox.style.display = 'none';

  // ⚔️ 사진 전체의 궁합·상극 모음 (한 박스에 통합)
  const allGoods = [];
  const allBads = [];
  (r.foods || []).forEach(f => {
    const fname = stripEng(f.name);
    (f.ingredients || []).forEach(ing => {
      if (!ing.pairings) return;
      const iname = stripEng(ing.name);
      (ing.pairings.good || []).forEach(g => allGoods.push({ from: iname, fromFood: fname, with: g.with, reason: g.reason }));
      (ing.pairings.bad || []).forEach(b => allBads.push({ from: iname, fromFood: fname, with: b.with, reason: b.reason }));
    });
    if (f.dishPairings) {
      (f.dishPairings.good || []).forEach(g => allGoods.push({ from: fname, fromFood: fname, with: g.with, reason: g.reason }));
      (f.dishPairings.bad || []).forEach(b => allBads.push({ from: fname, fromFood: fname, with: b.with, reason: b.reason }));
    }
  });
  // 🌿 본 재료로 정규화 (무말랭이무침 → 무, 깻잎장아찌 → 깻잎, 미역줄기 → 미역 등)
  const normalizeIngName = (name) => {
    const n = stripEng(name);
    if (!n) return n;
    // ING_PAIRING_DICT에 정확히 있으면 그대로 (예: '무'는 그대로)
    if (ING_PAIRING_DICT[n]) return n;
    // 포함된 본 재료 찾기 — 가장 긴 매칭 우선
    const matches = Object.keys(ING_PAIRING_DICT).filter(k =>
      k !== n && k.length >= 2 && n.includes(k)
    );
    if (matches.length === 0) return n;
    matches.sort((a, b) => b.length - a.length); // 긴 것 우선
    return matches[0];
  };

  // 중복 제거 — 양방향 페어 + from·with 모두 정규화 + 사진 안 매칭 필터
  const dedupePair = (arr) => {
    const seen = new Map();
    arr.forEach(item => {
      const w = stripEng(item.with || '');
      if (!w) return;
      if (!isInPhoto(item.with)) return;
      const fr = stripEng(item.from || '');
      // 🔑 양쪽 모두 본 재료로 정규화
      const frNorm = normalizeIngName(fr);
      const wNorm = normalizeIngName(w);
      // 같은 재료끼리는 페어 제외 (예: 무 + 무)
      if (frNorm && wNorm && frNorm === wNorm) return;
      // 양방향 페어 키 (정렬해서 같은 조합은 한 번만)
      const pairKey = [wNorm, frNorm].sort().join('|');
      if (!seen.has(pairKey)) {
        // 표시할 때도 정규화된 이름 사용
        seen.set(pairKey, { ...item, from: frNorm, with: wNorm });
      }
    });
    return [...seen.values()];
  };
  // 2단계 정규화 dedupe — 정규화된 페어 키로 한 번 더 중복 제거 (안전망)
  const finalDedupe = (arr) => {
    const seen = new Map();
    arr.forEach(item => {
      const w = normalizeIngName(stripEng(item.with || ''));
      const f = normalizeIngName(stripEng(item.from || ''));
      if (!w || !f || w === f) return;
      const key = [w, f].sort().join('|');
      if (!seen.has(key)) {
        seen.set(key, { ...item, with: w, from: f });
      }
    });
    return [...seen.values()];
  };
  const finalGoods = finalDedupe(dedupePair(allGoods));
  const finalBads = finalDedupe(dedupePair(allBads));

  // 🎯 가독성을 위해 처음 5개만 + 더 보기 버튼
  const GOOD_VISIBLE = 5;
  const BAD_VISIBLE = 3;
  // 렌더 시에도 한 번 더 정규화 (보호막)
  const renderGoodRow = g => {
    const w = normalizeIngName(stripEng(g.with));
    const f = normalizeIngName(stripEng(g.from));
    return `<div class="card-pair-row good"><i class="ph-fill ph-heart pair-icon-good"></i> <strong>${w}</strong> + ${f} <span class="card-pair-reason">— ${stripEng(g.reason)}</span></div>`;
  };
  const renderBadRow = b => {
    const w = normalizeIngName(stripEng(b.with));
    const f = normalizeIngName(stripEng(b.from));
    return `<div class="card-pair-row bad"><i class="ph-fill ph-heart-break pair-icon-bad"></i> <strong>${w}</strong> + ${f} <span class="card-pair-reason">— ${stripEng(b.reason)}</span></div>`;
  };

  const goodTop = finalGoods.slice(0, GOOD_VISIBLE);
  const goodMore = finalGoods.slice(GOOD_VISIBLE);
  const badTop = finalBads.slice(0, BAD_VISIBLE);
  const badMore = finalBads.slice(BAD_VISIBLE);

  const overallGoodRows = goodTop.map(renderGoodRow).join('') +
    (goodMore.length > 0 ? `
      <div id="goodMoreRows" style="display:none">${goodMore.map(renderGoodRow).join('')}</div>
      <button id="goodMoreBtn" class="pair-more-btn" onclick="togglePairMore('good')">▼ 좋은 조합 ${goodMore.length}개 더 보기</button>
    ` : '');
  const overallBadRows = badTop.map(renderBadRow).join('') +
    (badMore.length > 0 ? `
      <div id="badMoreRows" style="display:none">${badMore.map(renderBadRow).join('')}</div>
      <button id="badMoreBtn" class="pair-more-btn" onclick="togglePairMore('bad')">▼ 효율↓ 조합 ${badMore.length}개 더 보기</button>
    ` : '');

  // 📝 이 식단의 궁합 총평 — 실제 조합 내용을 분석한 구체 평
  const goodCount = finalGoods.length;
  const badCount = finalBads.length;

  // 좋은 조합의 효과를 카테고리화
  const goodCats = new Set();
  let bigBoost = null; // "2배·4배·8배" 같은 강한 효과
  finalGoods.forEach(g => {
    const r = (g.reason || '');
    if (/지용성|비타민\s?[AKDE]|라이코펜|베타카로틴|안토시아닌|콜린|엽산/i.test(r)) goodCats.add('비타민');
    if (/철분|칼슘|미네랄|요오드|아연|마그네슘|칼륨/i.test(r)) goodCats.add('미네랄');
    if (/단백질|아미노산|콜린/i.test(r)) goodCats.add('단백질');
    if (/유산균|프로바이오틱스|소화|장\s?건강/i.test(r)) goodCats.add('소화·장');
    if (/식이섬유|섬유질/i.test(r)) goodCats.add('식이섬유');
    if (/항산화|항균|면역/i.test(r)) goodCats.add('항산화·면역');
    if (/혈당/i.test(r)) goodCats.add('혈당 안정');
    if (/오메가|EPA|DHA/i.test(r)) goodCats.add('오메가3');
    if (/B1|B6|B12|비타민B/i.test(r)) goodCats.add('에너지 대사');
    if (!bigBoost && /2배|3배|4배|5배|8배|10배/.test(r)) bigBoost = g;
  });

  // 효율↓ 조합의 영향을 카테고리화
  const badCats = new Set();
  finalBads.forEach(b => {
    const r = (b.reason || '');
    if (/철분/.test(r)) badCats.add('철분');
    if (/칼슘/.test(r)) badCats.add('칼슘');
    if (/비타민\s?C/i.test(r)) badCats.add('비타민C');
    if (/단백질|아미노산/.test(r)) badCats.add('단백질');
    if (/소화/.test(r)) badCats.add('소화');
    if (/혈당/.test(r)) badCats.add('혈당');
  });

  const goodCatList = [...goodCats];
  const badCatList = [...badCats];
  const stripIcon = (s) => stripEng(s);

  let pairingSummary = '';

  // ── 좋은 조합 평 ──
  if (goodCount > 0) {
    const cats = goodCatList.length > 0 ? goodCatList.slice(0, 3).join('·') : '영양소';
    if (goodCount >= 5) {
      pairingSummary += `이 식단은 <strong>${cats}</strong> 흡수를 강화하는 시너지 조합이 <strong>${goodCount}가지</strong>나 있어 영양 효율이 매우 높은 식사예요. `;
    } else if (goodCount >= 3) {
      pairingSummary += `<strong>${cats}</strong> 흡수에 좋은 조합 <strong>${goodCount}가지</strong>가 있어 균형 잡힌 식단이에요. `;
    } else {
      pairingSummary += `<strong>${cats}</strong> 시너지 조합이 <strong>${goodCount}가지</strong> 있어요. `;
    }
    // 강력 효과 하이라이트 (2~8배 흡수↑ 같은 거)
    if (bigBoost) {
      pairingSummary += `특히 <strong>${stripIcon(bigBoost.from)} + ${stripIcon(bigBoost.with)}</strong> 조합은 ${stripIcon(bigBoost.reason)}. `;
    }
  }

  // ── 효율↓ 조합 평 ──
  if (badCount > 0) {
    const bcats = badCatList.length > 0 ? badCatList.slice(0, 3).join('·') : '일부 영양소';
    if (badCount >= 3) {
      pairingSummary += `다만 <strong>${bcats}</strong> 흡수를 떨어뜨리는 조합이 <strong>${badCount}가지</strong> 있어요. 시간차를 두고 드시면 흡수율을 살릴 수 있어요.`;
    } else {
      const sample = finalBads[0];
      pairingSummary += `다만 <strong>${stripIcon(sample.from)} + ${stripIcon(sample.with)}</strong>처럼 <strong>${bcats}</strong> 흡수에 영향 주는 조합이 ${badCount > 1 ? badCount + '가지 ' : ''}있으니 가능하면 따로 드시면 좋아요.`;
    }
  }

  // 둘 다 없을 때
  if (!pairingSummary) {
    pairingSummary = `사진 안 음식들끼리 특별한 시너지나 흡수 방해 조합이 없어요. 부담 없는 무난한 한 끼예요 🍽`;
  }
  pairingSummary = pairingSummary.trim();

  const overallPairingsBox = (overallGoodRows || overallBadRows)
    ? `<div class="overall-pairings-box">
        <div class="overall-pairings-title">이 식단의 궁합 모음</div>
        <div class="overall-pairings-summary">${pairingSummary}</div>
        ${overallGoodRows ? `<div class="card-pairings-title good-title" style="margin-top:14px">함께 먹으면 좋은 조합</div>${overallGoodRows}` : ''}
        ${overallBadRows ? `<div class="card-pairings-title bad-title" style="margin-top:14px">같이 먹으면 효율 떨어지는 조합</div>${overallBadRows}` : ''}
      </div>`
    : `<div class="overall-pairings-box">
        <div class="overall-pairings-title">이 식단의 궁합 모음</div>
        <div class="overall-pairings-summary">${pairingSummary}</div>
      </div>`;

  // 💡 궁합 안내 마무리 멘트
  const pairingNoteHtml = `
    <div class="pairing-note">
      <div class="pairing-note-icon">💡</div>
      <div class="pairing-note-text">
        <strong>꼭 알아두세요!</strong><br>
        궁합 정보는 <strong>이 사진 안의 음식·재료끼리</strong>만 매칭해서 보여드려요.<br><br>
        "효율↓ 조합"이라고 해서 몸에 나쁜 건 아니에요. 영양소 흡수율을 높이거나 소화 부담을 줄이려면 좋은 궁합은 챙기시고, 효율↓ 조합은 살짝 피해주시면 같은 음식도 훨씬 알차게 드실 수 있어요 😊
      </div>
    </div>`;

  // 컨테이너에 모두 모아서 삽입 (highlights는 영양소 균형 박스랑 중복이라 제거)
  const container = document.getElementById('foodHighlights');
  container.innerHTML = todayHtml + nutrientDictHtml + lightTipsHtml + nextMealHtml + pairingNoteHtml;

  // ⭐ 통합 궁합 박스를 음식 카드 바로 위에 강제 삽입 (제일 위로!)
  try {
    const itemsList = document.getElementById('foodItemsList');
    if (itemsList) {
      let pairBox = document.getElementById('overallPairBoxWrap');
      if (!pairBox) {
        pairBox = document.createElement('div');
        pairBox.id = 'overallPairBoxWrap';
        // 음식 카드 바로 앞 형제로 삽입 → 음식 카드보다 위
        itemsList.parentNode.insertBefore(pairBox, itemsList);
      }
      pairBox.innerHTML = overallPairingsBox;
    } else {
      container.insertAdjacentHTML('afterbegin', overallPairingsBox);
    }
  } catch(e) { console.error('통합 궁합 박스 삽입 실패:', e); }
  // 영양소 막대 — 매크로 + 미네랄 + 비타민 (17종)
  const n = r.nutrition || {};
  // micronutrients가 비어있으면 음식 기반 추정
  let m = r.micronutrients;
  if (!m || typeof m !== 'object' || Object.keys(m).filter(k => Number(m[k]) > 0).length < 3) {
    try { m = estimateMicronutrients(r.foods || []); } catch(e) { m = {}; }
  }
  // 그룹 정의
  const STAT_GROUPS = {
    macro: {
      title: '기본 영양소',
      src: n,
      items: {
        carbs:   { label:'탄수화물', target:300,  unit:'g',  bad:false },
        protein: { label:'단백질',   target:60,   unit:'g',  bad:false },
        fat:     { label:'지방',     target:65,   unit:'g',  bad:false },
        fiber:   { label:'식이섬유', target:25,   unit:'g',  bad:false },
        sodium:  { label:'나트륨',   target:2000, unit:'mg', bad:true },
        sugar:   { label:'당류',     target:50,   unit:'g',  bad:true }
      }
    },
    mineral: {
      title: '미네랄',
      src: m,
      items: {
        calcium:   { label:'칼슘',     target:800,  unit:'mg' },
        iron:      { label:'철분',     target:12,   unit:'mg' },
        magnesium: { label:'마그네슘', target:320,  unit:'mg' },
        zinc:      { label:'아연',     target:9,    unit:'mg' },
        potassium: { label:'칼륨',     target:3500, unit:'mg' }
      }
    },
    vitamin: {
      title: '비타민',
      src: m,
      items: {
        vitaminA: { label:'비타민 A',  target:800, unit:'μg' },
        vitaminC: { label:'비타민 C',  target:100, unit:'mg' },
        vitaminD: { label:'비타민 D',  target:10,  unit:'μg' },
        vitaminE: { label:'비타민 E',  target:12,  unit:'mg' },
        vitaminB: { label:'비타민 B군',target:5,   unit:'mg' },
        folate:   { label:'엽산',      target:400, unit:'μg' }
      }
    }
  };

  // 그룹별 HTML — 깔끔한 라인 디자인
  const renderStatRow = (k, info, src) => {
    const val = Math.round((src[k] || 0) * 10) / 10;
    const rawPct = (val / info.target) * 100;
    const pct = Math.min(100, Math.round(rawPct));
    const isBad = !!info.bad;
    let barColor, statusColor;
    if (isBad) {
      if (rawPct >= 110) { barColor = '#EF4444'; statusColor = '#EF4444'; }
      else if (rawPct >= 70) { barColor = '#F59E0B'; statusColor = '#F59E0B'; }
      else { barColor = '#10B981'; statusColor = '#10B981'; }
    } else {
      if (rawPct >= 80) { barColor = '#10B981'; statusColor = '#10B981'; }
      else if (rawPct >= 50) { barColor = '#94A3B8'; statusColor = '#64748B'; }
      else { barColor = '#EF4444'; statusColor = '#EF4444'; }
    }
    return `<div class="game-stat-row">
      <div class="game-stat-head">
        <span class="game-stat-name">${info.label}</span>
        <span class="game-stat-value"><span style="color:${statusColor};font-weight:800">${val}${info.unit}</span> <span style="color:#94A3B8;font-weight:500">/ ${info.target}${info.unit}</span></span>
      </div>
      <div class="game-stat-bar-wrap">
        <div class="game-stat-bar" style="width:${pct}%;background-color:${barColor}"></div>
      </div>
    </div>`;
  };

  const nutriHtml = Object.values(STAT_GROUPS).map(grp => {
    const rows = Object.entries(grp.items).map(([k, info]) => renderStatRow(k, info, grp.src)).join('');
    return `<div class="stat-group">
      <div class="stat-group-title">${grp.title}</div>
      ${rows}
    </div>`;
  }).join('');

  document.getElementById('foodNutriItems').innerHTML = nutriHtml;
  // 영양소 분석 박스를 게임 카드로 스타일 변경
  const nutriGrid = document.querySelector('.nutri-grid');
  if (nutriGrid) {
    nutriGrid.className = 'game-stats-card';
    const t = nutriGrid.querySelector('.nutri-title');
    if (t) { t.className = 'game-stats-title'; t.innerHTML = '영양 스텟'; }
  }
  // 요약
  document.getElementById('foodSummary').textContent = r.summary || '';
  // 옛 영양사 코멘트 박스 숨김 (새 말풍선이 위에서 같은 내용 보여줌)
  const oldSumBox = document.getElementById('foodSummary')?.parentElement;
  if (oldSumBox && oldSumBox.classList.contains('card')) oldSumBox.style.display = 'none';
  // 하이라이트
  const hl = (r.highlights || []).map(h => {
    const ic = h.type === 'good' ? '✅' : h.type === 'warning' ? '⚠️' : '🚨';
    return `<div class="highlight-item ${h.type || 'good'}">${ic} ${h.text}</div>`;
  }).join('');
  document.getElementById('foodHighlights').innerHTML = hl;
  // 부족/과다
  const missing = (r.missing || []).join(', ');
  const excessive = (r.excessive || []).join(', ');
  const missBox = document.getElementById('foodMissingBox');
  if (missing) {
    document.getElementById('foodMissingText').textContent = missing;
    document.getElementById('foodMissingItem').style.display = '';
  } else { document.getElementById('foodMissingItem').style.display = 'none'; }
  if (excessive) {
    document.getElementById('foodExcessiveText').textContent = excessive;
    document.getElementById('foodExcessiveItem').style.display = '';
  } else { document.getElementById('foodExcessiveItem').style.display = 'none'; }
  missBox.style.display = (missing || excessive) ? 'block' : 'none';
  // 옛 nextMeal / tips 박스는 새 디자인으로 대체 (옛 박스 강제 숨김)
  const oldNextBoxEl = document.getElementById('foodNextMealBox');
  if (oldNextBoxEl) oldNextBoxEl.style.display = 'none';
  const oldTipsBoxEl = document.getElementById('foodTipsBox');
  if (oldTipsBoxEl) oldTipsBoxEl.style.display = 'none';
  // 영양제
  const supp = r.supplements || [];
  if (supp.length > 0) {
    document.getElementById('foodSuppList').innerHTML = supp.map(s =>
      `<div class="supp-card priority-권장">
        <div class="supp-top"><span class="supp-name">${s.name}</span></div>
        <div class="supp-reason">${s.reason}</div>
      </div>`).join('');
    document.getElementById('foodSuppSection').style.display = 'block';
  } else { document.getElementById('foodSuppSection').style.display = 'none'; }
  document.getElementById('foodResultImg').src = foodImageSrc;
}

function saveFoodHistory(result) {
  // 🗄 Supabase에도 저장 (백그라운드)
  try {
    if (SB.ready) {
      SB.insert('food_records', {
        user_uuid: getCurrentUserUuid(),
        meal_time: selectedMealTime,
        foods: result.foods || [],
        nutrition: result.nutrition || {},
        micronutrients: result.micronutrients || {},
        balance_score: result.balanceScore,
        balance_grade: result.balanceGrade,
        pairings: { foodPairings: result.foodPairings, dishPairings: null },
        summary: result.summary,
        total_calories: result.totalCalories
      });
      logActivity('analyze_food', { score: result.balanceScore, cal: result.totalCalories });

      // 🎯 마케팅 인사이트 자동 업데이트 (영양제 추천 자동 판정)
      try { updateNutritionInsights(result); } catch(e) { console.warn('[SB] insights:', e); }
    }
  } catch(e) { console.warn('[SB] saveFood:', e); }

  try {
    const key = 'foodHistoryV1';
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      mealTime: selectedMealTime,
      totalCalories: result.totalCalories,
      balanceScore: result.balanceScore,
      balanceGrade: result.balanceGrade,
      foods: (result.foods || []).map(f => f.name).join(', '),
      nutrition: result.nutrition,
      missing: result.missing,
      excessive: result.excessive,
      summary: result.summary
    });
    localStorage.setItem(key, JSON.stringify(history.slice(0, 60)));
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════
// 🎯 마케팅 인사이트 자동 업데이트 (영양제 추천 판정)
// ════════════════════════════════════════════════════════════════
// 한국인 일일 권장량 (RDA)
const RDA = {
  protein_g: 55,       // 단백질
  iron_mg: 12,         // 철분 (남 10 / 여 14 평균)
  calcium_mg: 750,     // 칼슘
  vitamin_d_iu: 400,   // 비타민D
  vitamin_c_mg: 100,   // 비타민C
  vitamin_b12_mcg: 2.4,// 비타민B12
  omega3_mg: 1000,     // 오메가3
  fiber_g: 25,         // 식이섬유
  calories: 2200       // 칼로리
};

// 영양제 카탈로그 (확장 가능 — 추후 본인 제품으로 교체)
const SUPPLEMENT_CATALOG = {
  iron:       { name: '철분제',         tag: 'iron_supp',     price: 25000 },
  calcium:    { name: '칼슘+비타민D 복합', tag: 'calcium_supp',  price: 32000 },
  vitamin_d:  { name: '비타민D 5000IU',  tag: 'vd_supp',       price: 18000 },
  vitamin_c:  { name: '비타민C 1000mg',  tag: 'vc_supp',       price: 22000 },
  vitamin_b12:{ name: '비타민B12 메코발', tag: 'b12_supp',      price: 28000 },
  omega3:     { name: 'rTG 오메가3',     tag: 'omega3_supp',   price: 45000 },
  fiber:      { name: '프리바이오틱 식이섬유', tag: 'fiber_supp', price: 35000 },
  protein:    { name: 'WPI 단백질 파우더', tag: 'protein_supp', price: 55000 },
  multi:      { name: '종합비타민',       tag: 'multi_supp',    price: 38000 }
};

async function updateNutritionInsights(result) {
  if (!SB.ready) return;
  const userUuid = getCurrentUserUuid();
  if (!userUuid) return;

  // 1. 현재 인사이트 가져오기 (없으면 새로 시작)
  let existing = null;
  try {
    const res = await fetch(`${SB.url}/rest/v1/nutrition_insights?user_uuid=eq.${userUuid}&select=*`, {
      headers: SB.headers()
    });
    if (res.ok) {
      const data = await res.json();
      existing = data && data[0] ? data[0] : null;
    }
  } catch(e) {}

  // 2. 현재 분석 결과의 영양소 추출
  const macro = result.nutrition || {};
  const micro = result.micronutrients || {};
  const cur = {
    protein:  Number(macro.protein) || 0,
    carbs:    Number(macro.carbs) || 0,
    fat:      Number(macro.fat) || 0,
    calories: Number(result.totalCalories) || 0,
    iron:     Number(micro.iron) || 0,
    calcium:  Number(micro.calcium) || 0,
    vitaminD: Number(micro.vitaminD) || 0,
    vitaminC: Number(micro.vitaminC) || 0,
    vitaminB12: Number(micro.vitaminB12) || 0,
    omega3:   Number(micro.omega3) || 0,
    fiber:    Number(micro.fiber) || 0,
    balance:  Number(result.balanceScore) || 0
  };

  // 3. 누적 합계 계산 (러닝 평균)
  const prev = existing || {};
  const count = (prev.analyses_count || 0) + 1;
  const totals = {
    total_protein_g:     (Number(prev.total_protein_g) || 0) + cur.protein,
    total_carbs_g:       (Number(prev.total_carbs_g) || 0) + cur.carbs,
    total_fat_g:         (Number(prev.total_fat_g) || 0) + cur.fat,
    total_iron_mg:       (Number(prev.total_iron_mg) || 0) + cur.iron,
    total_calcium_mg:    (Number(prev.total_calcium_mg) || 0) + cur.calcium,
    total_vitamin_d_iu:  (Number(prev.total_vitamin_d_iu) || 0) + cur.vitaminD,
    total_vitamin_c_mg:  (Number(prev.total_vitamin_c_mg) || 0) + cur.vitaminC,
    total_vitamin_b12_mcg:(Number(prev.total_vitamin_b12_mcg) || 0) + cur.vitaminB12,
    total_omega3_mg:     (Number(prev.total_omega3_mg) || 0) + cur.omega3,
    total_fiber_g:       (Number(prev.total_fiber_g) || 0) + cur.fiber,
    total_calories:      (Number(prev.total_calories) || 0) + cur.calories,
    total_balance_score: (Number(prev.total_balance_score) || 0) + cur.balance
  };

  // 4. 평균 계산
  const avgs = {
    avg_protein_g:      totals.total_protein_g / count,
    avg_carbs_g:        totals.total_carbs_g / count,
    avg_fat_g:          totals.total_fat_g / count,
    avg_iron_mg:        totals.total_iron_mg / count,
    avg_calcium_mg:     totals.total_calcium_mg / count,
    avg_vitamin_d_iu:   totals.total_vitamin_d_iu / count,
    avg_vitamin_c_mg:   totals.total_vitamin_c_mg / count,
    avg_vitamin_b12_mcg:totals.total_vitamin_b12_mcg / count,
    avg_omega3_mg:      totals.total_omega3_mg / count,
    avg_fiber_g:        totals.total_fiber_g / count,
    avg_calories:       totals.total_calories / count,
    avg_balance_score:  totals.total_balance_score / count
  };

  // 5. 부족 영양소 판정 (3회 이상 분석 + 평균이 RDA의 60% 미만)
  const deficient = [];
  const flags = {
    needs_iron_supplement:       false,
    needs_calcium_supplement:    false,
    needs_vitamin_d_supplement:  false,
    needs_vitamin_c_supplement:  false,
    needs_vitamin_b12_supplement:false,
    needs_omega3_supplement:     false,
    needs_fiber_supplement:      false,
    needs_protein_supplement:    false,
    needs_multivitamin:          false
  };
  if (count >= 3) {
    if (avgs.avg_iron_mg < RDA.iron_mg * 0.6)             { deficient.push('iron');       flags.needs_iron_supplement = true; }
    if (avgs.avg_calcium_mg < RDA.calcium_mg * 0.6)       { deficient.push('calcium');    flags.needs_calcium_supplement = true; }
    if (avgs.avg_vitamin_d_iu < RDA.vitamin_d_iu * 0.6)   { deficient.push('vitamin_d');  flags.needs_vitamin_d_supplement = true; }
    if (avgs.avg_vitamin_c_mg < RDA.vitamin_c_mg * 0.6)   { deficient.push('vitamin_c');  flags.needs_vitamin_c_supplement = true; }
    if (avgs.avg_vitamin_b12_mcg < RDA.vitamin_b12_mcg*0.6){deficient.push('vitamin_b12');flags.needs_vitamin_b12_supplement = true;}
    if (avgs.avg_omega3_mg < RDA.omega3_mg * 0.6)         { deficient.push('omega3');     flags.needs_omega3_supplement = true; }
    if (avgs.avg_fiber_g < RDA.fiber_g * 0.6)             { deficient.push('fiber');      flags.needs_fiber_supplement = true; }
    if (avgs.avg_protein_g < RDA.protein_g * 0.6)         { deficient.push('protein');    flags.needs_protein_supplement = true; }
    if (deficient.length >= 3)                            { flags.needs_multivitamin = true; }
  }

  // 6. 추천 제품 태그 생성
  const recommendedTags = deficient.map(n => {
    const sup = SUPPLEMENT_CATALOG[n] || SUPPLEMENT_CATALOG[n === 'vitamin_d' ? 'vitamin_d' : n];
    return sup ? sup.tag : null;
  }).filter(Boolean);
  if (flags.needs_multivitamin) recommendedTags.push('multi_supp');

  // 7. nutrition_insights upsert
  await SB.upsert('nutrition_insights', {
    user_uuid: userUuid,
    ...totals,
    ...avgs,
    deficient_nutrients: deficient,
    ...flags,
    recommended_product_tags: recommendedTags,
    analyses_count: count,
    last_analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, 'user_uuid');

  // 8. users 테이블에 마케팅 세그먼트 업데이트
  await updateUserMarketingSegments(userUuid, deficient, count);

  // 9. supplement_opportunities 생성 (영양제 추천 기회)
  for (const nutrient of deficient) {
    const sup = SUPPLEMENT_CATALOG[nutrient];
    if (!sup) continue;
    const ratio = (avgs['avg_'+nutrient+'_mg'] || avgs['avg_'+nutrient+'_iu'] || avgs['avg_'+nutrient+'_mcg'] || avgs['avg_'+nutrient+'_g'] || 0)
                  / (RDA[nutrient+'_mg'] || RDA[nutrient+'_iu'] || RDA[nutrient+'_mcg'] || RDA[nutrient+'_g'] || 1);
    const confidence = Math.min(100, Math.round((1 - ratio) * 100 + count * 2));
    await SB.insert('supplement_opportunities', {
      user_uuid: userUuid,
      supplement_type: nutrient,
      product_name: sup.name,
      reason: `최근 ${count}회 분석 평균이 권장량의 ${Math.round(ratio*100)}%입니다`,
      confidence_score: confidence,
      status: 'pending',
      revenue_potential_krw: sup.price
    });
  }

  console.log(`[마케팅] 인사이트 업데이트 — ${count}회 분석, 부족: ${deficient.join(',') || '없음'}`);
}

// 사용자 마케팅 세그먼트 자동 분류
async function updateUserMarketingSegments(userUuid, deficient, totalAnalyses) {
  try {
    const profile = getUserProfile() || {};
    const age = profile.birthYear ? new Date().getFullYear() - parseInt(profile.birthYear) : 0;
    const gender = profile.gender;

    const segments = [];

    // 부족 영양소 기반
    deficient.forEach(n => segments.push('low_' + n));

    // 인구통계 기반
    if (gender === '여' && age >= 40) segments.push('menopause_risk');
    if (gender === '여' && age >= 20 && age < 50) segments.push('female_reproductive_age');
    if (age >= 50) segments.push('senior_health');
    if (age >= 20 && age < 35) segments.push('young_adult');
    if (profile.sasangType) segments.push('sasang_' + profile.sasangType);

    // 행동 기반
    if (totalAnalyses >= 10) segments.push('engaged_user');
    if (totalAnalyses >= 30) segments.push('loyal_user');

    // LTV 점수 (0-100)
    let ltv = 0;
    if (totalAnalyses >= 5) ltv += 20;
    if (totalAnalyses >= 20) ltv += 20;
    if (deficient.length >= 2) ltv += 30;
    if (profile.sasangType) ltv += 15;
    if (profile.height && profile.weight) ltv += 15;
    ltv = Math.min(100, ltv);

    // 영양제 구매 가능성 (0-100)
    let propensity = 0;
    propensity += deficient.length * 15;
    if (totalAnalyses >= 7) propensity += 20;
    if (deficient.length >= 3) propensity += 25;
    propensity = Math.min(100, propensity);

    // 추천 제품 (마케팅에 즉시 활용)
    const recommendedProducts = deficient
      .map(n => SUPPLEMENT_CATALOG[n])
      .filter(Boolean)
      .map(s => ({ name: s.name, tag: s.tag, price: s.price }));

    await SB.upsert('users', {
      user_uuid: userUuid,
      marketing_segments: segments,
      recommended_products: recommendedProducts,
      total_analyses: totalAnalyses,
      lifetime_value_score: ltv,
      supplement_propensity: propensity,
      last_analyzed_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    }, 'user_uuid');
  } catch(e) {
    console.warn('[마케팅] 세그먼트 업데이트 실패:', e);
  }
}

// ════════════════════════════════════════════════════════════════
// 📊 종합 영양 리포트 (오늘/이번 주)
// ════════════════════════════════════════════════════════════════
let reportTab = 'today';
function goReport() {
  reportTab = 'today';
  switchReport('today');
  showScreen('screenReport');
}
function switchReport(tab) {
  reportTab = tab;
  document.getElementById('rtToday').classList.toggle('active', tab === 'today');
  document.getElementById('rtWeek').classList.toggle('active', tab === 'week');
  renderReport();
}
function renderReport() {
  const target = document.getElementById('reportContent');
  try {
    const all = JSON.parse(localStorage.getItem('foodHistoryV1') || '[]');
    const cutoff = reportTab === 'today'
      ? new Date(new Date().toISOString().split('T')[0]).getTime()
      : Date.now() - 7*24*60*60*1000;
    const list = all.filter(h => new Date(h.date || h.timestamp || 0).getTime() >= cutoff);
    if (list.length === 0) {
      target.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#94A3B8;font-size:13px;line-height:1.7">
        ${reportTab === 'today' ? '오늘' : '이번 주'} 식단 기록이 없어요!<br>식단 분석을 한 번 해보세요 🍽
      </div>`;
      return;
    }
    const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };

    // 누적 통계
    const totalCal = list.reduce((s,h) => s + num(h.totalCalories), 0);
    const avgScore = Math.round(list.reduce((s,h) => s + num(h.balanceScore), 0) / list.length);
    const totalNutri = { carbs:0, protein:0, fat:0, fiber:0, sodium:0, sugar:0 };
    const totalMicro = { vitaminA:0, vitaminC:0, vitaminD:0, vitaminE:0, vitaminB:0, folate:0, calcium:0, iron:0, magnesium:0, zinc:0, potassium:0 };
    list.forEach(h => {
      if (h.nutrition) Object.keys(totalNutri).forEach(k => totalNutri[k] += num(h.nutrition[k]));
      // 비타민·미네랄 — 없으면 음식 기반 자동 추정
      let micro = h.micronutrients;
      if (!micro || typeof micro !== 'object' || Object.keys(micro).filter(k => num(micro[k]) > 0).length < 3) {
        try { micro = estimateMicronutrients(h.foods || []); } catch(e) { micro = null; }
      }
      if (micro) Object.keys(totalMicro).forEach(k => totalMicro[k] += num(micro[k]));
    });

    // 부족·과다 영양소 빈도
    const missCount = {}, excCount = {};
    list.forEach(h => {
      (h.missing || []).forEach(m => missCount[m] = (missCount[m]||0) + 1);
      (h.excessive || []).forEach(e => excCount[e] = (excCount[e]||0) + 1);
    });
    const topMissing = Object.entries(missCount).sort((a,b) => b[1]-a[1]).slice(0, 5);
    const topExcessive = Object.entries(excCount).sort((a,b) => b[1]-a[1]).slice(0, 3);

    // 권장량 비교 (오늘 vs 일주일) — 매크로/미네랄/비타민 3그룹
    const isWeek = reportTab !== 'today';
    const mult = isWeek ? 7 : 1;
    const NUT_GROUPS_R = {
      macro: {
        title: '기본 영양소',
        items: {
          carbs:    { label:'탄수화물',  target:300*mult,  unit:'g',  bad:false },
          protein:  { label:'단백질',    target:60*mult,   unit:'g',  bad:false },
          fat:      { label:'지방',      target:65*mult,   unit:'g',  bad:false },
          fiber:    { label:'식이섬유',  target:25*mult,   unit:'g',  bad:false },
          sodium:   { label:'나트륨',    target:2000*mult, unit:'mg', bad:true },
          sugar:    { label:'당류',      target:50*mult,   unit:'g',  bad:true }
        },
        src: totalNutri
      },
      mineral: {
        title: '미네랄',
        items: {
          calcium:   { label:'칼슘',      target:800*mult,  unit:'mg' },
          iron:      { label:'철분',      target:12*mult,   unit:'mg' },
          magnesium: { label:'마그네슘',  target:320*mult,  unit:'mg' },
          zinc:      { label:'아연',      target:9*mult,    unit:'mg' },
          potassium: { label:'칼륨',      target:3500*mult, unit:'mg' }
        },
        src: totalMicro
      },
      vitamin: {
        title: '비타민',
        items: {
          vitaminA: { label:'비타민 A',  target:800*mult, unit:'μg' },
          vitaminC: { label:'비타민 C',  target:100*mult, unit:'mg' },
          vitaminD: { label:'비타민 D',  target:10*mult,  unit:'μg' },
          vitaminE: { label:'비타민 E',  target:12*mult,  unit:'mg' },
          vitaminB: { label:'비타민 B군',target:5*mult,   unit:'mg' },
          folate:   { label:'엽산',      target:400*mult, unit:'μg' }
        },
        src: totalMicro
      }
    };

    const renderRow = ([k, info], src) => {
      const v = Math.round(src[k] * 10) / 10 || 0;
      const t = info.target;
      const rawPct = (v / t) * 100;
      const pct = Math.min(100, Math.round(rawPct));
      const isBad = !!info.bad;
      let color;
      if (isBad) {
        color = rawPct >= 110 ? '#EF4444' : rawPct >= 70 ? '#F59E0B' : '#10B981';
      } else {
        color = rawPct >= 80 ? '#10B981' : rawPct >= 50 ? '#F59E0B' : '#EF4444';
      }
      return `<div style="margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
          <span style="color:#475569;font-weight:600">${info.label}</span>
          <span style="font-weight:700">${v}${info.unit} <span style="color:#94A3B8">/ ${t}${info.unit} (${pct}%)</span></span>
        </div>
        <div style="height:6px;background:#F1F5F9;border-radius:3px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div>
        </div>
      </div>`;
    };

    const nutriHtml = Object.values(NUT_GROUPS_R).map(grp => {
      const rows = Object.entries(grp.items).map(e => renderRow(e, grp.src)).join('');
      return `<div class="nut-group">
        <div class="nut-group-title">${grp.title}</div>
        ${rows}
      </div>`;
    }).join('');

    // 부족·과다 영양소 keyed 분석 (영양제 추천용)
    const NUT_SUPPS_MAP = {
      carbs:[], protein:['유청 단백질 25g — 근육·회복'],
      fat:['오메가3 (EPA·DHA) — 혈관·두뇌'],
      fiber:['차전자피 분말 — 장 건강·포만감'],
      sodium:[], sugar:['크롬 보충제 — 혈당 안정'],
      calcium:['칼슘+비타민D — 뼈 건강'],
      iron:['철분 18mg + 비타민C — 빈혈 예방'],
      magnesium:['마그네슘 (비스글리시네이트)'],
      zinc:['아연 (피콜리네이트)'],
      potassium:['종합 미네랄'],
      vitaminA:['비타민A 보충제'], vitaminC:['비타민C 1000mg — 항산화·면역'],
      vitaminD:['비타민D3 2000IU — 면역·뼈 건강'], vitaminE:['비타민E 보충제'],
      vitaminB:['비타민B 컴플렉스'], folate:['엽산 (활성형 메틸엽산)']
    };
    // 그룹의 부족 항목 (pct < 70 %) 모음
    const lackedKeys = [];
    Object.values(NUT_GROUPS_R).forEach(grp => {
      Object.entries(grp.items).forEach(([k, info]) => {
        if (info.bad) return;
        const v = grp.src[k] || 0;
        const pct = (v / info.target) * 100;
        if (pct < 70) lackedKeys.push({ k, label: info.label, pct: Math.round(pct) });
      });
    });
    lackedKeys.sort((a,b) => a.pct - b.pct);
    const top3Supps = lackedKeys.slice(0, 3).map(it => {
      const opts = NUT_SUPPS_MAP[it.k] || [];
      return opts[0] ? `✓ ${opts[0]} <span style="color:#94A3B8">(${it.pct}%)</span>` : null;
    }).filter(Boolean);

    // 칭찬·따끔 멘트
    let coachMsg = '', coachClass = 'neutral';
    if (avgScore >= 85 && lackedKeys.length === 0) {
      coachMsg = `🌟 <strong>정말 훌륭해요!</strong> ${avgScore}점, 부족·과다 없음. 이대로 계속!`;
      coachClass = 'praise';
    } else if (avgScore >= 75 && lackedKeys.length <= 2) {
      coachMsg = `👍 <strong>잘 드시고 계세요!</strong> ${avgScore}점 균형 좋아요. ${lackedKeys.length > 0 ? `${lackedKeys.length}가지만 살짝 채워주세요.` : '유지 부탁!'}`;
      coachClass = 'praise';
    } else if (lackedKeys.length >= 5) {
      coachMsg = `<strong>${reportTab === 'today' ? '오늘은' : '이번 주는'} 신경 더 써야겠어요.</strong> 부족 ${lackedKeys.length}가지가 보여요. 추천 음식을 챙기세요.`;
      coachClass = 'warn';
    } else if (lackedKeys.length >= 3) {
      coachMsg = `💪 <strong>괜찮지만 더 좋아질 수 있어요.</strong> 부족 ${lackedKeys.length}가지가 있어요.`;
      coachClass = 'neutral';
    } else {
      coachMsg = `🍽 ${avgScore}점, 평균적인 식단이에요.`;
      coachClass = 'neutral';
    }

    // 📝 식단 기록 관리 섹션 (잘못 입력한 거 삭제)
    const recordsHtml = list.slice().reverse().slice(0, 30).map(h => {
      const id = h.timestamp || h.date || JSON.stringify(h).slice(0,40);
      const dt = new Date(h.date || h.timestamp || Date.now());
      const dateStr = `${dt.getMonth()+1}/${dt.getDate()}`;
      // foods가 string·array·null 다 처리 (옛 저장 형식 호환)
      let foodsArr = h.foods;
      if (typeof foodsArr === 'string') foodsArr = foodsArr.split(/[,、+·]/).map(s => s.trim()).filter(Boolean);
      if (!Array.isArray(foodsArr)) foodsArr = [];
      const foods = foodsArr.map(f => typeof f === 'string' ? f : (f.name || '')).filter(Boolean).slice(0, 3).join(', ');
      const moreFoods = foodsArr.length > 3 ? ` 외 ${foodsArr.length - 3}개` : '';
      return `<div class="food-record-row">
        <div class="food-record-info">
          <div class="food-record-date">📅 ${dateStr} · ${h.mealTime || '식사'}</div>
          <div class="food-record-foods">${foods}${moreFoods}</div>
          <div class="food-record-cal">${h.totalCalories || 0} kcal</div>
        </div>
        <button class="food-record-del" onclick="deleteReportRecord('${String(id).replace(/'/g,'')}')">🗑</button>
      </div>`;
    }).join('');

    target.innerHTML = `
      <div class="report-summary-card">
        <div class="report-summary-num">${avgScore}<span style="font-size:14px"> 점</span></div>
        <div class="report-summary-label">평균 영양 균형 점수</div>
      </div>
      <div class="coach-msg ${coachClass}">${coachMsg}</div>
      <div class="report-stats-grid">
        <div class="report-stat-card">
          <div class="report-stat-num">${list.length}</div>
          <div class="report-stat-label">식사 횟수</div>
        </div>
        <div class="report-stat-card">
          <div class="report-stat-num">${totalCal.toLocaleString()}</div>
          <div class="report-stat-label">총 칼로리</div>
        </div>
      </div>
      <div class="report-section">
        <div class="report-section-title">누적 영양소 (${reportTab === 'today' ? '오늘' : '이번 주'} 권장량 대비)</div>
        ${nutriHtml}
      </div>
      ${topMissing.length > 0 ? `
      <div class="report-section">
        <div class="report-section-title">자주 부족한 영양소</div>
        ${topMissing.map(([n, c]) => `<div style="font-size:12.5px;color:#9F1239;margin-bottom:5px;display:flex;justify-content:space-between"><span>• ${n}</span><span style="color:#94A3B8">${c}회 부족</span></div>`).join('')}
      </div>` : ''}
      ${topExcessive.length > 0 ? `
      <div class="report-section">
        <div class="report-section-title">자주 과다 섭취</div>
        ${topExcessive.map(([n, c]) => `<div style="font-size:12.5px;color:#9A3412;margin-bottom:5px;display:flex;justify-content:space-between"><span>• ${n}</span><span style="color:#94A3B8">${c}회</span></div>`).join('')}
      </div>` : ''}
      <div class="report-section" style="background:linear-gradient(135deg,#F5F3FF,#EDE9FE);border:1.5px solid #C4B5FD">
        <div class="report-section-title" style="color:var(--gray-800)">추천 영양제 (가장 부족한 3개)</div>
        <div style="font-size:12px;color:#4C1D95;line-height:1.8">
          ${top3Supps.length > 0 ? top3Supps.map(s => `<div style="margin-bottom:4px">${s}</div>`).join('') : '<div>현재 부족한 영양소 없음 ✨</div>'}
        </div>
      </div>
      <div class="report-section" style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border:1.5px solid #6EE7B7">
        <div class="report-section-title" style="color:var(--gray-800)">추천 운동</div>
        <div style="font-size:12px;color:#064E3B;line-height:1.7">
          ${avgScore >= 80
            ? '✓ 식단 균형 좋아요! 가벼운 유산소 30분/일 (걷기·자전거)<br>✓ 주 2회 근력 운동으로 근육 유지'
            : '✓ 식이섬유·단백질 더 챙기면서<br>✓ 가벼운 산책 20~30분/일 — 소화 + 혈당 관리<br>✓ 식후 30분~1시간 후가 베스트'}
        </div>
      </div>
      <div class="report-section">
        <div class="report-section-title">식단 기록 관리</div>
        <div style="font-size:11.5px;color:#64748B;margin-bottom:8px;line-height:1.5">잘못 입력된 식단이 있으면 삭제하세요. 리포트가 정확해져요.</div>
        <div class="food-records-list">${recordsHtml}</div>
      </div>`;
  } catch(e) {
    console.error(e);
    target.innerHTML = '<div style="color:#EF4444;padding:20px">리포트 생성 중 오류가 발생했어요</div>';
  }
}

// 종합 리포트 화면의 식단 삭제
function deleteReportRecord(id) {
  if (!confirm('이 식단 기록을 삭제할까요?\n삭제 후 리포트가 다시 계산돼요.')) return;
  try {
    let history = JSON.parse(localStorage.getItem('foodHistoryV1') || '[]');
    history = history.filter(h => {
      const hid = h.timestamp || h.date || JSON.stringify(h).slice(0,40);
      return String(hid) !== String(id);
    });
    localStorage.setItem('foodHistoryV1', JSON.stringify(history));
    renderReport();
  } catch(e) { alert('삭제 중 오류: ' + (e.message || '')); }
}

// 📸 범용 이미지 저장 (iOS·Android·PC 모두 OK)
async function saveImageUniversal(captureId, fileName, bgColor) {
  const el = document.getElementById(captureId);
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: bgColor || '#FAFCFF' });
  const dataUrl = canvas.toDataURL('image/png');
  // 1. navigator.share 시도 (iOS/Android 사진앱 저장)
  if (navigator.share) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      await navigator.share({ files: [file], title: '건강어때' });
      return;
    } catch(e) {
      if (e.name === 'AbortError') return;
      console.warn('share 실패, 모달 폴백:', e);
    }
  }
  // 2. 모달로 이미지 표시 (확실한 폴백)
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;overflow:auto;padding:20px;display:flex;flex-direction:column;align-items:center;font-family:inherit';
  modal.innerHTML = '<div style="background:#FEF3C7;padding:14px 18px;border-radius:14px;margin-bottom:14px;font-size:14px;color:#78350F;line-height:1.55;text-align:center;max-width:400px">📸 <strong>아래 이미지를 길게 눌러서</strong><br><strong>"사진에 추가"</strong> 또는 <strong>"이미지 저장"</strong>을 선택하세요!</div>' +
    '<img src="' + dataUrl + '" style="max-width:100%;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3)">' +
    '<button onclick="this.parentElement.remove()" style="margin-top:18px;padding:14px 32px;background:#fff;color:#1D1D1F;border:none;border-radius:14px;font-size:14px;font-weight:800;cursor:pointer">닫기</button>';
  document.body.appendChild(modal);
}

async function downloadFoodResult() {
  try {
    const dateStr = new Date().toLocaleDateString('ko-KR').replace(/\./g,'').replace(/ /g,'');
    await saveImageUniversal('foodResultCapture', `식단분석_${selectedMealTime||''}_${dateStr}.png`, '#FAFCFF');
  } catch(e) { alert('저장 중 오류: ' + e.message); }
}

// 촬영 화면에서 뒤로
function backToForm() {
  showScreen(subjectMode === 'human' ? 'screenHumanForm' : 'screenPetForm');
}

// ══════════════════════════════════════
// 생년도 셀렉트 채우기
// ══════════════════════════════════════
(function() {
  const cur = new Date().getFullYear();
  const petSel = document.getElementById('petBirthYear');
  for (let y = cur; y >= cur - 25; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '년';
    petSel.appendChild(opt);
  }
  const humanSel = document.getElementById('humanBirthYear');
  for (let y = cur; y >= cur - 100; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '년';
    humanSel.appendChild(opt);
  }
})();

// ══════════════════════════════════════
// 반려동물 / 환경 선택
// ══════════════════════════════════════
function selectPet(type) {
  selectedPet = selectedPet === type ? null : type;
  document.getElementById('btnDog').classList.toggle('active', selectedPet === 'dog');
  document.getElementById('btnCat').classList.toggle('active', selectedPet === 'cat');
}
function selectGender(type) {
  selectedGender = selectedGender === type ? null : type;
  document.getElementById('genderMale').classList.toggle('active', selectedGender === '수컷');
  document.getElementById('genderFemale').classList.toggle('active', selectedGender === '암컷');
  document.getElementById('genderNeutered').classList.toggle('active', selectedGender === '중성화');
}
function selectEnv(type) {
  selectedEnv = selectedEnv === type ? null : type;
  document.getElementById('envIndoor').classList.toggle('active', selectedEnv === '실내');
  document.getElementById('envOutdoor').classList.toggle('active', selectedEnv === '실외');
  document.getElementById('envMixed').classList.toggle('active',  selectedEnv === '실내+실외');
}
function selectHumanGender(type) {
  humanGender = humanGender === type ? null : type;
  document.getElementById('hGenderMale').classList.toggle('active', humanGender === 'male');
  document.getElementById('hGenderFemale').classList.toggle('active', humanGender === 'female');
}
function selectLifestyle(type) {
  humanLifestyle = humanLifestyle === type ? null : type;
  document.getElementById('lsSedentary').classList.toggle('active', humanLifestyle === 'sedentary');
  document.getElementById('lsMixed').classList.toggle('active',     humanLifestyle === 'mixed');
  document.getElementById('lsActive').classList.toggle('active',    humanLifestyle === 'active');
  document.getElementById('lsShift').classList.toggle('active',     humanLifestyle === 'shift');
}

// ══════════════════════════════════════
// 전화번호 자동 포맷
// ══════════════════════════════════════
function formatPhone(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length <= 3) input.value = v;
  else if (v.length <= 7) input.value = v.slice(0,3) + '-' + v.slice(3);
  else input.value = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7,11);
}

// ══════════════════════════════════════
// 다음 단계 (촬영으로)
// ══════════════════════════════════════
function goCapture(mode) {
  // 필수 동의 확인
  if (mode === 'pet') {
    if (!document.getElementById('petConsentPrivacy').checked) {
      alert('개인정보 수집 및 이용에 동의해 주세요.');
      return;
    }
  } else {
    if (!document.getElementById('humanConsentPrivacy').checked) {
      alert('개인정보 수집 및 이용에 동의해 주세요.');
      return;
    }
  }
  subjectMode = mode;
  showScreen('screenCapture');
}

// ══════════════════════════════════════
// 파일 처리
// ══════════════════════════════════════
function handleFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    imageSrc = e.target.result;
    imageB64 = e.target.result.split(',')[1];
    document.getElementById('previewImg').src = imageSrc;
    clearError();
    showScreen('screenPreview');
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function showError(msg) {
  const box = document.getElementById('errorBox');
  box.textContent = '⚠️ ' + msg;
  box.classList.add('show');
}
function clearError() { document.getElementById('errorBox').classList.remove('show'); }

// ══════════════════════════════════════
// 사주 건강 분석
// ══════════════════════════════════════
function getSajuHealth(birthYear, birthMonth, mode) {
  if (!birthYear || !birthMonth) return null;
  const stemIdx = ((parseInt(birthYear) - 4) % 10 + 10) % 10;

  const petStemData = [
    { organ:'간·담낭',    tips:['이번 검사 수치상 지방이 적은 사료를 선택하시면 도움이 됩니다','간 수치 혈액 검사를 정기적으로 병행하시기 바랍니다'] },
    { organ:'간·담낭',    tips:['검사 결과상 항산화 성분이 풍부한 사료가 권장됩니다','과도한 단백질 섭취는 이번 수치에서 주의가 필요합니다'] },
    { organ:'심장·혈관',  tips:['이번 수치에서 과격한 운동보다 안정적인 환경 유지를 권장합니다','오메가3 보충이 혈관 건강 개선에 도움이 됩니다'] },
    { organ:'심장·혈관',  tips:['검사 결과를 바탕으로 정기적인 심장 청진 검사를 권장합니다','이번 수치상 저나트륨 식단이 적합합니다'] },
    { organ:'위장·소화기',tips:['이번 검사 수치에서 소화 부담을 줄이기 위해 소량씩 자주 급여를 권장합니다','프로바이오틱스 보충이 장 건강 회복에 도움이 됩니다'] },
    { organ:'위장·소화기',tips:['검사 결과상 규칙적인 식사 시간 유지가 중요합니다','식이섬유가 풍부한 사료 선택이 이번 수치에 적합합니다'] },
    { organ:'폐·기관지',  tips:['이번 수치에서 먼지나 자극적인 환경 노출을 피하시기 바랍니다','환기가 잘 되는 깨끗한 공간 유지가 중요합니다'] },
    { organ:'폐·기관지',  tips:['검사 결과를 바탕으로 정기적인 흉부 검사를 권장합니다','실내 공기 청정기 사용이 호흡기 건강에 도움이 됩니다'] },
    { organ:'신장·방광',  tips:['이번 검사에서 수분 섭취가 매우 중요한 것으로 나타났습니다. 신선한 물을 항상 제공하세요','소변 검사를 정기적으로 반복하여 신장 기능 변화를 모니터링하세요'] },
    { organ:'신장·방광',  tips:['이번 수치상 저인산·저단백 식단이 적합합니다','음수량과 소변량을 자주 확인하시기 바랍니다'] },
  ];
  const humanStemData = [
    { organ:'간·담낭',    tips:['이번 검사 수치상 기름진 음식과 음주를 줄이시는 것이 권장됩니다','정기적인 간 기능 혈액검사를 병행하시기 바랍니다'] },
    { organ:'간·담낭',    tips:['검사 결과상 항산화 성분(베리류·녹황색 채소) 섭취가 도움이 됩니다','과도한 단백질·약물 복용은 이번 수치에서 주의가 필요합니다'] },
    { organ:'심장·혈관',  tips:['이번 수치에서 과격한 운동보다 꾸준한 유산소를 권장합니다','오메가3·등푸른 생선 섭취가 혈관 건강 개선에 도움이 됩니다'] },
    { organ:'심장·혈관',  tips:['검사 결과를 바탕으로 정기적인 혈압·심전도 검사를 권장합니다','이번 수치상 저나트륨 식단이 적합합니다'] },
    { organ:'위장·소화기',tips:['이번 검사 수치에서 소화 부담을 줄이기 위해 소량씩 자주 드시는 것을 권장합니다','프로바이오틱스 보충이 장 건강 회복에 도움이 됩니다'] },
    { organ:'위장·소화기',tips:['검사 결과상 규칙적인 식사 시간 유지가 중요합니다','식이섬유가 풍부한 통곡물·채소 섭취가 이번 수치에 적합합니다'] },
    { organ:'폐·기관지',  tips:['이번 수치에서 먼지·미세먼지·흡연 노출을 피하시기 바랍니다','환기가 잘 되는 깨끗한 공간 유지가 중요합니다'] },
    { organ:'폐·기관지',  tips:['검사 결과를 바탕으로 정기적인 흉부 검진을 권장합니다','실내 공기 청정기 사용이 호흡기 건강에 도움이 됩니다'] },
    { organ:'신장·방광',  tips:['이번 검사에서 수분 섭취가 매우 중요한 것으로 나타났습니다. 하루 1.5~2L 물 섭취를 권장합니다','소변 검사를 정기적으로 반복하여 신장 기능 변화를 모니터링하세요'] },
    { organ:'신장·방광',  tips:['이번 수치상 저염·저단백 식단이 적합합니다','음수량과 소변 색을 자주 확인하시기 바랍니다'] },
  ];
  const monthDataPet = {
    1:'이번 검사에서 신장·방광 수치에 주의가 필요한 패턴이 감지되었습니다. 체온 유지와 수분 보충에 신경써 주세요.',
    2:'검사 수치상 간 기능과 면역력 관련 지표를 꾸준히 모니터링하시기 바랍니다.',
    3:'이번 수치에서 소화기 건강과 계절성 알레르기 반응 가능성이 나타납니다. 함께 관리해 주세요.',
    4:'검사 결과상 간·담낭 수치를 지속 관찰하시고, 외부 활동 후 위생 관리에 유의하세요.',
    5:'이번 검사에서 심장·혈관 관련 수치를 주의깊게 살필 필요가 있습니다. 체온 관리도 중요합니다.',
    6:'검사 수치에서 소화기 기능 저하 패턴이 감지됩니다. 수분 보충과 사료 신선도에 주의하세요.',
    7:'이번 수치 패턴상 심혈관 건강 관리가 중요하며, 탈수 예방을 위한 충분한 수분 공급이 필요합니다.',
    8:'검사 결과에서 소화기와 면역 수치를 함께 관리할 필요성이 나타납니다.',
    9:'이번 검사에서 호흡기 관련 수치에 주의 신호가 있습니다. 건조한 환경 관리가 도움이 됩니다.',
    10:'검사 수치상 폐·기관지 건강 집중 관리가 필요합니다. 호흡기 감염 예방에 유의하세요.',
    11:'이번 수치 패턴에서 신장 기능 모니터링이 권장됩니다. 체온 유지에도 신경써 주세요.',
    12:'검사 결과상 방광·신장 수치를 집중 관리하고, 충분한 보온과 수분 섭취를 유지하세요.',
  };
  const monthDataHuman = {
    1:'이번 검사에서 신장·방광 수치에 주의가 필요한 패턴이 감지되었습니다. 체온 유지와 따뜻한 수분 섭취에 신경써 주세요.',
    2:'검사 수치상 간 기능과 면역력 관련 지표를 꾸준히 모니터링하시기 바랍니다.',
    3:'이번 수치에서 소화기 건강과 계절성 알레르기 반응 가능성이 나타납니다. 함께 관리해 주세요.',
    4:'검사 결과상 간·담낭 수치를 지속 관찰하시고, 봄철 환절기 면역 관리에 유의하세요.',
    5:'이번 검사에서 심장·혈관 관련 수치를 주의깊게 살필 필요가 있습니다.',
    6:'검사 수치에서 소화기 기능 저하 패턴이 감지됩니다. 수분 보충과 음식 신선도에 주의하세요.',
    7:'이번 수치 패턴상 심혈관 건강 관리가 중요하며, 탈수 예방을 위한 충분한 수분 공급이 필요합니다.',
    8:'검사 결과에서 소화기와 면역 수치를 함께 관리할 필요성이 나타납니다.',
    9:'이번 검사에서 호흡기 관련 수치에 주의 신호가 있습니다. 건조한 환경과 미세먼지 관리가 도움이 됩니다.',
    10:'검사 수치상 폐·기관지 건강 집중 관리가 필요합니다. 호흡기 감염 예방에 유의하세요.',
    11:'이번 수치 패턴에서 신장 기능 모니터링이 권장됩니다. 체온 유지에도 신경써 주세요.',
    12:'검사 결과상 방광·신장 수치를 집중 관리하고, 충분한 보온과 수분 섭취를 유지하세요.',
  };

  const stemTable  = mode === 'human' ? humanStemData : petStemData;
  const monthTable = mode === 'human' ? monthDataHuman : monthDataPet;
  const data = stemTable[stemIdx];
  const month = parseInt(birthMonth);
  return { organ: data.organ, tips: data.tips, monthInfo: monthTable[month] || '' };
}

// ══════════════════════════════════════
// AI 분석
// ══════════════════════════════════════
async function analyze() {
  if (!imageB64) return;

  const btn     = document.getElementById('btnAnalyze');
  const loading = document.getElementById('loadingBox');
  btn.disabled = true;
  btn.textContent = '🔄 AI 분석 중...';
  loading.classList.add('show');
  clearError();

  let recordData, petHint = '', sajuInput = null;

  if (subjectMode === 'pet') {
    const petName   = document.getElementById('petName').value.trim();
    const petBreed  = document.getElementById('petBreed').value.trim();
    const petType   = selectedPet;
    const gender    = selectedGender;
    const birthYear = document.getElementById('petBirthYear').value;
    const birthMonth= document.getElementById('petBirthMonth').value;
    const region    = document.getElementById('region').value;
    const env       = selectedEnv;
    const contact   = document.getElementById('petContact').value.trim();
    const marketing = document.getElementById('petConsentMarketing').checked;

    petHint = petType
      ? `이 이미지는 ${petType==='dog'?'강아지':'고양이'}${petBreed?`(품종: ${petBreed})`:''}${petName?`(이름: ${petName})`:''}${gender?`(성별: ${gender})`:''}의 소변검사 키트입니다. `
      : '';

    recordData = { contact, marketing, petType, petName, breed: petBreed, gender, birthYear, birthMonth, region, environment: env };
    sajuInput = { birthYear, birthMonth };
  } else {
    const name      = document.getElementById('humanName').value.trim();
    const gender    = humanGender;
    const birthYear = document.getElementById('humanBirthYear').value;
    const birthMonth= document.getElementById('humanBirthMonth').value;
    const region    = document.getElementById('humanRegion').value;
    const lifestyle = humanLifestyle;
    const contact   = document.getElementById('humanContact').value.trim();
    const marketing = document.getElementById('humanConsentMarketing').checked;

    recordData = { contact, marketing, name, gender, birthYear, birthMonth, region, lifestyle };
    sajuInput = { birthYear, birthMonth };
  }

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageB64, petHint, recordData, subject: subjectMode })
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error);

    currentResult = result;
    const saju = getSajuHealth(sajuInput.birthYear, sajuInput.birthMonth, subjectMode);

    renderResult(result, {
      subject: subjectMode,
      petName: recordData.petName, petBreed: recordData.breed, petType: recordData.petType,
      humanName: recordData.name,
      gender: recordData.gender,
      region: recordData.region,
      env: recordData.environment, lifestyle: recordData.lifestyle,
      birthYear: recordData.birthYear, birthMonth: recordData.birthMonth,
      saju
    });

    saveToHistory({ result, recordData, subject: subjectMode });
    // 프로필 자동 저장/업데이트 (새 프로필이면 +50P)
    const wasExisting = !!getProfiles().find(p => p.type === subjectMode && p.name === (subjectMode === 'human' ? recordData.name : recordData.petName));
    const profile = saveOrUpdateProfile(recordData, subjectMode);
    if (!wasExisting && profile && profile.name) earnFromNewProfile(profile.name);
    // 검사 완료 +100P
    earnFromTest();
    showScreen('screenResult');

  } catch (err) {
    // 친절한 에러 메시지로 변환
    const msg = (err.message || '').toLowerCase();
    let title = '😢 분석을 완료하지 못했어요';
    let body = err.message || '분석 중 오류가 발생했습니다.';
    if (msg.includes('네트워크') || msg.includes('network') || msg.includes('failed to fetch')) {
      title = '📡 인터넷 연결을 확인해주세요';
      body = 'WiFi나 데이터가 연결됐는지 확인 후 다시 시도해주세요.';
    } else if (msg.includes('이미지') || msg.includes('image') || msg.includes('키트')) {
      title = '📷 키트를 다시 촬영해주세요';
      body = '이미지가 흐릿하거나 키트가 잘 안 보여요. 형광등 아래 평평한 곳에서 다시 찍어주세요.';
    } else if (msg.includes('prepayment') || msg.includes('credits') || msg.includes('quota')) {
      title = '⏳ 잠시 후 다시 시도해주세요';
      body = '서버가 일시적으로 분주해요. 1~2분 후 다시 시도해주세요.';
    } else if (msg.includes('api') || msg.includes('서버')) {
      title = '🔧 일시적인 오류예요';
      body = '잠시 후 다시 시도해주세요. 계속 안 되면 카카오톡 채널로 문의해주세요.';
    }
    showFriendlyError(title, body);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔬 AI 분석 시작';
    loading.classList.remove('show');
  }
}

// ══════════════════════════════════════
// 결과 렌더링
// ══════════════════════════════════════
// ══════════════════════════════════════
// 건강 종합 점수 계산
// ══════════════════════════════════════
function calculateHealthScore(testItems) {
  if (!testItems || testItems.length === 0) return null;
  const scores = { normal: 100, warning: 60, danger: 20 };
  const total = testItems.reduce((sum, item) => sum + (scores[item.status] || 60), 0);
  return Math.round(total / testItems.length);
}
function getGradeInfo(score) {
  if (score >= 90) return { grade: 'A', label: '최상', message: '훌륭한 건강 상태예요! 지금 컨디션을 잘 유지해주세요 ✨' };
  if (score >= 80) return { grade: 'A', label: '우수', message: '대부분 정상 범위의 양호한 건강 상태예요 💚' };
  if (score >= 70) return { grade: 'B', label: '양호', message: '전반적으로 좋아요. 몇 가지 항목 관리만 신경써주세요 👍' };
  if (score >= 60) return { grade: 'C', label: '주의', message: '주의가 필요한 수치들이 보여요. 관리 팁을 확인해주세요 ⚠️' };
  return { grade: 'D', label: '집중관리', message: '집중적인 관리가 필요해요. 전문가 상담을 권장합니다 🏥' };
}
function renderHealthScore(r) {
  const card = document.getElementById('healthScoreCard');
  const score = calculateHealthScore(r.testItems);
  if (score === null) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';
  const info = getGradeInfo(score);
  document.getElementById('scoreNum').textContent = score;
  const gradeEl = document.getElementById('scoreGrade');
  gradeEl.textContent = info.grade;
  gradeEl.className = 'score-grade ' + info.grade;
  document.getElementById('scoreGradeLabel').textContent = info.label;
  document.getElementById('scoreMessage').textContent = info.message;
  // 점수 막대 (10단계, 채워진 만큼)
  const bars = Math.round(score / 10);
  const barsEl = document.getElementById('scoreBars');
  barsEl.innerHTML = Array.from({length:10},(_,i)=>
    `<div class="score-bar${i < bars ? ' fill' : ''}"></div>`).join('');
  // 지난 점수 비교
  try {
    const history = JSON.parse(localStorage.getItem('urineHistoryV2')||'[]');
    const prevItem = history.find(h => h.fullResult);
    if (prevItem && prevItem.fullResult) {
      const prevScore = calculateHealthScore(prevItem.fullResult.testItems);
      if (prevScore !== null && prevScore !== score) {
        const diff = score - prevScore;
        const hint = document.getElementById('scoreTrendHint');
        document.getElementById('scoreTrendIcon').textContent = diff > 0 ? '↑' : '↓';
        document.getElementById('scoreTrendText').textContent =
          diff > 0 ? `지난번보다 +${diff}점` : `지난번보다 ${diff}점`;
        hint.style.background = diff > 0 ? 'rgba(16,185,129,.10)' : 'rgba(239,68,68,.10)';
        hint.style.color = diff > 0 ? '#059669' : '#dc2626';
        hint.style.display = 'inline-flex';
      } else {
        document.getElementById('scoreTrendHint').style.display = 'none';
      }
    }
  } catch(e) {}
}

// ══════════════════════════════════════
// 추세 그래프 (Chart.js)
// ══════════════════════════════════════
let trendChartInstance = null;
let currentTrendFilter = 'all';
function switchTrend(filter) {
  currentTrendFilter = filter;
  document.querySelectorAll('.trend-tab').forEach((btn, i) => {
    const filters = ['all','pet','human'];
    btn.classList.toggle('active', filters[i] === filter);
  });
  renderTrendChart();
}
function renderTrendChart() {
  const section = document.getElementById('trendSection');
  try {
    const history = JSON.parse(localStorage.getItem('urineHistoryV2')||'[]');
    let filtered = history.filter(h => h.fullResult);
    if (currentTrendFilter === 'pet') filtered = filtered.filter(h => h.subject !== 'human');
    if (currentTrendFilter === 'human') filtered = filtered.filter(h => h.subject === 'human');
    if (filtered.length < 2) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    document.getElementById('trendCount').textContent = filtered.length + '회';
    // 시간 오래된 순으로 정렬 (그래프 왼쪽이 과거)
    filtered = filtered.slice().reverse();
    const labels = filtered.map(h => {
      const d = new Date(h.date);
      return `${d.getMonth()+1}/${d.getDate()}`;
    });
    const scores = filtered.map(h => calculateHealthScore(h.fullResult.testItems) || 0);
    if (trendChartInstance) trendChartInstance.destroy();
    const ctx = document.getElementById('trendChart').getContext('2d');
    // 그라데이션 배경
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(99,102,241,.35)');
    gradient.addColorStop(1, 'rgba(99,102,241,.02)');
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '건강 점수',
          data: scores,
          borderColor: '#6366f1',
          backgroundColor: gradient,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#6366f1',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(29,29,31,.92)',
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: 'Gowun Dodum', size: 12 },
            bodyFont: { family: 'Gowun Dodum', size: 12 },
            callbacks: {
              label: (ctx) => ctx.parsed.y + '점'
            }
          }
        },
        scales: {
          y: { min: 0, max: 100, ticks: { stepSize: 25, font:{family:'Gowun Dodum', size: 10}, color:'#94a3b8' }, grid:{color:'#f1f5f9'} },
          x: { ticks: { font:{family:'Gowun Dodum', size: 10}, color:'#94a3b8' }, grid:{display:false} }
        }
      }
    });
  } catch(e) { section.style.display = 'none'; }
}

function renderResult(r, info) {
  // 🎯 변화 비교 카드 (이전 검사와)
  renderCompareCard(r, info);
  // 건강 종합 점수 계산 + 표시
  renderHealthScore(r);
  // 📅 액션 플랜 자동 생성
  renderActionPlan(r, info);
  // 📂 접기 카드 뱃지 갱신
  updateCollapseBadges(r);
  const isHuman = info.subject === 'human';
  const STATUS  = { normal:'정상', warning:'주의', danger:'이상' };
  const ICON    = { normal:'✅', warning:'⚠️', danger:'🚨' };
  const URGENCY_PET = {
    normal: '현재 건강 상태가 양호합니다. 정기 검진을 꾸준히 해주세요 🐾',
    soon:   '일부 수치가 불안정합니다. 가까운 시일 내 수의사 방문을 권장합니다 🏥',
    urgent: '이상 수치가 감지되었습니다. 빠른 시일 내 수의사 방문이 필요합니다 ⚠️',
  };
  const URGENCY_HUMAN = {
    normal: '현재 건강 상태가 양호합니다. 정기 검진을 꾸준히 해주세요 💚',
    soon:   '일부 수치가 불안정합니다. 가까운 시일 내 병원/의사 상담을 권장합니다 🏥',
    urgent: '이상 수치가 감지되었습니다. 빠른 시일 내 병원 방문이 필요합니다 ⚠️',
  };
  const URGENCY = isHuman ? URGENCY_HUMAN : URGENCY_PET;

  document.getElementById('resultBanner').className = 'result-banner bg-'+(r.overallStatus||'normal');
  document.getElementById('resultIcon').textContent    = ICON[r.overallStatus]  ||'🔬';
  document.getElementById('resultTitle').textContent   = '종합 결과: '+(STATUS[r.overallStatus]||'분석 완료');
  const subjLabel = isHuman
    ? (info.humanName ? info.humanName + '님의 검사 결과' : '')
    : (info.petName ? info.petName + '의 검사 결과' : '');
  document.getElementById('resultPetSub').textContent  = subjLabel;
  document.getElementById('resultSummary').textContent = r.summary||'';

  const items = r.testItems || [];
  const normalCount = items.filter(i => i.status === 'normal').length;
  const total = items.length || 1;
  const ratio = normalCount / total;
  let pctText = '';
  if      (ratio >= 0.95) pctText = '건강 상위 5% 🏆';
  else if (ratio >= 0.85) pctText = '건강 상위 15% ⭐';
  else if (ratio >= 0.70) pctText = '건강 상위 30%';
  else if (ratio >= 0.50) pctText = '건강 상위 50%';
  else if (ratio >= 0.30) pctText = '건강 하위 40%';
  else                    pctText = '집중 관리 필요';
  const badge = document.getElementById('percentileBadge');
  document.getElementById('percentileText').textContent = pctText;
  badge.style.display = items.length > 0 ? 'inline-flex' : 'none';

  const rec = document.getElementById('recBox');
  rec.className = 'rec-box rec-'+(r.overallStatus||'normal');
  rec.textContent = '🏥 ' + (URGENCY[r.urgency]||URGENCY.normal);

  const medBox = document.getElementById('medicalDisclaimerBox');
  if (isHuman) {
    document.getElementById('medicalDisclaimerText').textContent =
      r.medicalDisclaimer || '본 결과는 의학적 진단이 아닌 일반 건강 정보입니다. 증상이 지속되거나 우려되는 경우 반드시 의료 전문가의 진료를 받으세요.';
    medBox.style.display = 'block';
  } else {
    medBox.style.display = 'none';
  }

  const sajuBox = document.getElementById('sajuBox');
  if (info.saju) {
    document.getElementById('sajuOrgan').textContent = '집중 관리 수치 영역: '+info.saju.organ;
    document.getElementById('sajuTips').innerHTML = info.saju.tips
      .map(t=>`<div class="saju-tip">${t}</div>`).join('');
    document.getElementById('sajuMonth').textContent = info.saju.monthInfo;
    sajuBox.style.display = 'block';
  } else { sajuBox.style.display = 'none'; }

  const envHealthBox  = document.getElementById('envHealthBox');
  const envAnalysisItem = document.getElementById('envAnalysisItem');
  const breedAgeItem  = document.getElementById('breedAgeItem');
  let showEnvBox = false;
  if (r.envAnalysis) {
    document.getElementById('envAnalysisText').textContent = r.envAnalysis;
    envAnalysisItem.style.display = 'block';
    showEnvBox = true;
  } else { envAnalysisItem.style.display = 'none'; }
  if (r.breedAgeAnalysis) {
    document.getElementById('breedAgeText').textContent = r.breedAgeAnalysis;
    breedAgeItem.style.display = 'block';
    showEnvBox = true;
  } else { breedAgeItem.style.display = 'none'; }
  envHealthBox.style.display = showEnvBox ? 'block' : 'none';

  const container = document.getElementById('resultItems');
  container.innerHTML = '';
  (r.testItems||[]).forEach(item => {
    const s = item.status||'normal';
    container.innerHTML += `
      <div class="result-item border-${s}">
        <div class="ri-top">
          <span class="ri-name">${item.name||''}</span>
          <div class="ri-right">
            <span class="ri-val">${item.value||''}</span>
            <span class="badge badge-${s}">${STATUS[s]||s}</span>
          </div>
        </div>
        <div class="ri-desc">${item.description||''}</div>
      </div>`;
  });

  const tipsBox  = document.getElementById('tipsBox');
  const tipsList = document.getElementById('tipsList');
  if (r.tips && r.tips.length > 0) {
    tipsList.innerHTML = r.tips.map(t =>
      `<div class="tip-row"><span class="tip-check">✓</span><div class="tip-text">${t}</div></div>`
    ).join('');
    tipsBox.style.display = 'block';
  } else { tipsBox.style.display = 'none'; }

  const suppSection = document.getElementById('suppSection');
  const suppList    = document.getElementById('suppList');
  if (r.supplements && r.supplements.length > 0) {
    suppList.innerHTML = r.supplements.map(s => {
      const pri = s.priority || '권장';
      const cat = s.category || '';
      const catBadge = cat ? `<span class="supp-cat ${cat}">${cat}</span>` : '';
      const dose = s.dosage ? `<div class="supp-meta-row"><span class="supp-meta-label">💊 용량</span><span class="supp-meta-val">${s.dosage}</span></div>` : '';
      const time = s.timing ? `<div class="supp-meta-row"><span class="supp-meta-label">⏰ 타이밍</span><span class="supp-meta-val">${s.timing}</span></div>` : '';
      const syn = s.synergy && s.synergy !== '단독 복용 OK' ? `<div class="supp-meta-row"><span class="supp-meta-label">🔗 시너지</span><span class="supp-meta-val">${s.synergy}</span></div>` : '';
      const caut = s.caution && s.caution !== '특별한 주의 사항 없음' ? `<div class="supp-caution">⚠️ ${s.caution}</div>` : '';
      return `
        <div class="supp-card priority-${pri}">
          <div class="supp-top">
            <span class="supp-name">${s.name || ''}</span>
            <div class="supp-badges">${catBadge}<span class="supp-badge ${pri}">${pri}</span></div>
          </div>
          <div class="supp-reason">${s.reason || ''}</div>
          ${dose || time || syn ? `<div class="supp-meta">${dose}${time}${syn}</div>` : ''}
          ${caut}
        </div>`;
    }).join('');
    // 약사 조합 처방
    if (r.supplementCombo) {
      const c = r.supplementCombo;
      const morning = (c.morningStack || []).map(m => `<li>${m}</li>`).join('');
      const evening = (c.eveningStack || []).map(e => `<li>${e}</li>`).join('');
      suppList.innerHTML += `
        <div class="supp-combo">
          <div class="combo-title">💊 약사 조합 처방</div>
          ${morning ? `<div class="combo-stack"><div class="combo-stack-title">🌅 아침 스택</div><ul>${morning}</ul></div>` : ''}
          ${evening ? `<div class="combo-stack"><div class="combo-stack-title">🌙 저녁 스택</div><ul>${evening}</ul></div>` : ''}
          ${c.synergyNote ? `<div class="combo-note">${c.synergyNote}</div>` : ''}
          ${c.timingTip ? `<div class="combo-tip">💡 ${c.timingTip}</div>` : ''}
          ${c.estimatedMonthlyCost ? `<div class="combo-cost">📅 월 예상 비용: <strong>${c.estimatedMonthlyCost}</strong></div>` : ''}
        </div>`;
    }
    suppSection.style.display = 'block';
  } else { suppSection.style.display = 'none'; }

  document.getElementById('foodEmoji').textContent = isHuman ? '🥗' : '🍖';
  document.getElementById('foodTitle').textContent = isHuman
    ? '검사 결과 맞춤 식단'
    : '검사 결과 맞춤 사료 & 식단';
  const foodSection = document.getElementById('foodSection');
  const foodCard    = document.getElementById('foodCard');
  if (r.foodRecommendation) {
    const f = r.foodRecommendation;
    const ingrTags  = (f.ingredients||[]).map(i => `<span class="food-tag">✅ ${i}</span>`).join('');
    const avoidTags = (f.avoid||[]).map(a => `<span class="food-avoid">❌ ${a}</span>`).join('');
    foodCard.innerHTML = `
      <div class="food-card">
        <div class="food-type">🍽️ ${f.type || ''}</div>
        ${ingrTags ? `<div class="food-label">권장 ${isHuman?'음식':'성분'}</div><div class="food-row">${ingrTags}</div>` : ''}
        ${avoidTags ? `<div class="food-avoid-label">주의 ${isHuman?'음식':'성분'}</div><div class="food-row">${avoidTags}</div>` : ''}
        ${f.waterIntake ? `<div class="food-water">💧 ${f.waterIntake}</div>` : ''}
      </div>`;
    foodSection.style.display = 'block';
  } else { foodSection.style.display = 'none'; }

  const exerciseSection = document.getElementById('exerciseSection');
  const exerciseCard    = document.getElementById('exerciseCard');
  if (r.exerciseRecommendation) {
    const e = r.exerciseRecommendation;
    const typeTags = (e.type||[]).map(t => `<span class="exercise-type-tag">${t}</span>`).join('');
    exerciseCard.innerHTML = `
      <div class="exercise-card">
        ${e.frequency ? `<div class="exercise-freq">⏱️ ${e.frequency}</div>` : ''}
        ${typeTags ? `<div class="exercise-types">${typeTags}</div>` : ''}
        ${e.caution ? `<div class="exercise-caution">⚠️ ${e.caution}</div>` : ''}
        ${e.indoorTips ? `<div class="exercise-indoor">🏠 일상 팁: ${e.indoorTips}</div>` : ''}
      </div>`;
    exerciseSection.style.display = 'block';
  } else { exerciseSection.style.display = 'none'; }

  document.getElementById('resultImg').src = imageSrc;
  document.getElementById('disclaimerExpert').textContent = isHuman ? '의사·전문가' : '수의사';

  const parts = [];
  if (isHuman) {
    if (info.humanName) parts.push('🧑 ' + info.humanName);
    if (info.gender)    parts.push(info.gender === 'male' ? '남성' : info.gender === 'female' ? '여성' : info.gender);
    if (info.region)    parts.push('📍 ' + info.region);
    if (info.lifestyle) {
      const lsMap = { sedentary:'💺 좌식', active:'🏃 활동적', mixed:'🚶 보통', shift:'🌙 교대근무' };
      parts.push(lsMap[info.lifestyle] || info.lifestyle);
    }
    if (info.birthYear && info.birthMonth) parts.push('🎂 ' + info.birthYear + '년 ' + info.birthMonth + '월생');
  } else {
    if (info.petType)  parts.push((info.petType==='dog'?'🐶 강아지':'🐱 고양이'));
    if (info.petBreed) parts.push(info.petBreed);
    if (info.petName)  parts.push(info.petName);
    if (info.gender)   parts.push(info.gender);
    if (info.region)   parts.push('📍 ' + info.region);
    if (info.env)      parts.push('🏠 ' + info.env);
    if (info.birthYear && info.birthMonth) parts.push('🎂 ' + info.birthYear + '년 ' + info.birthMonth + '월생');
  }
  parts.push('📅 ' + new Date().toLocaleDateString('ko-KR'));
  document.getElementById('infoSummary').innerHTML = parts.join(' &nbsp;|&nbsp; ');
}

// ══════════════════════════════════════
// 결과 다운로드
// ══════════════════════════════════════
// ══════════════════════════════════════
// 🎁 작은 개선 기능들 (촬영 팁, 친절한 에러, 리마인더, SNS 공유)
// ══════════════════════════════════════

// 첫 검사 시 촬영 팁 자동 표시
function maybeShowCaptureTip() {
  if (!localStorage.getItem('captureTipShown')) {
    setTimeout(() => {
      document.getElementById('tipOverlay').classList.add('show');
    }, 400);
    localStorage.setItem('captureTipShown', '1');
  }
}
function closeTip() {
  document.getElementById('tipOverlay').classList.remove('show');
}

// 친절한 에러 표시
function showFriendlyError(title, body) {
  document.getElementById('friendlyErrorTitle').textContent = title || '😢 분석을 완료하지 못했어요';
  document.getElementById('friendlyErrorBody').textContent = body || '다시 시도해주세요.';
  document.getElementById('friendlyError').classList.add('show');
  document.getElementById('errorBox').classList.remove('show');
}
function hideFriendlyError() {
  document.getElementById('friendlyError').classList.remove('show');
}

// 다음 검사 리마인더 (마지막 검사로부터 30일 지났는지)
function checkReminder() {
  try {
    const history = JSON.parse(localStorage.getItem('urineHistoryV2')||'[]');
    if (history.length === 0) {
      document.getElementById('reminderBanner').style.display = 'none';
      return;
    }
    const last = history[0];
    const dismissedUntil = parseInt(localStorage.getItem('reminderDismissedUntil')||'0', 10);
    if (Date.now() < dismissedUntil) {
      document.getElementById('reminderBanner').style.display = 'none';
      return;
    }
    const daysSince = Math.floor((Date.now() - new Date(last.date).getTime()) / (1000*60*60*24));
    if (daysSince >= 30) {
      document.getElementById('reminderDays').textContent = daysSince;
      document.getElementById('reminderBanner').style.display = 'flex';
    } else {
      document.getElementById('reminderBanner').style.display = 'none';
    }
  } catch(e) {}
}
function dismissReminder() {
  // 7일 동안 안 보이게
  localStorage.setItem('reminderDismissedUntil', String(Date.now() + 7*24*60*60*1000));
  document.getElementById('reminderBanner').style.display = 'none';
}

// 카카오톡 공유
function shareKakao() {
  if (!window.Kakao || !Kakao.isInitialized()) {
    alert('카카오 SDK 로드 실패. 잠시 후 다시 시도해주세요.');
    return;
  }
  if (!currentResult) return;
  const subject = subjectMode === 'human'
    ? (document.getElementById('humanName').value.trim() || '내')
    : (document.getElementById('petName').value.trim() || '반려동물');
  const score = calculateHealthScore(currentResult.testItems) || 0;
  const STAT = { normal:'정상', warning:'주의', danger:'이상' };
  try {
    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `${subject}의 건강어때 검사 결과 🩺`,
        description: `건강 점수 ${score}점 · ${STAT[currentResult.overallStatus] || '분석 완료'}\n${currentResult.summary || ''}`.slice(0, 100),
        imageUrl: 'https://peepeekit-urine-app-5h3f.vercel.app/icon-512.png',
        link: {
          mobileWebUrl: 'https://peepeekit-urine-app-5h3f.vercel.app/',
          webUrl: 'https://peepeekit-urine-app-5h3f.vercel.app/'
        }
      },
      buttons: [{
        title: '나도 검사하기',
        link: {
          mobileWebUrl: 'https://peepeekit-urine-app-5h3f.vercel.app/',
          webUrl: 'https://peepeekit-urine-app-5h3f.vercel.app/'
        }
      }]
    });
  } catch(e) {
    alert('공유 실패: ' + (e.message || ''));
  }
}

// ══════════════════════════════════════
// 📄 PDF 리포트 다운로드 (병원/수의사용)
// ══════════════════════════════════════
async function downloadPDF() {
  const pdfBtns = document.querySelectorAll('.btn-download');
  const pdfBtn = pdfBtns[1]; // 두 번째가 PDF 버튼
  const originalText = pdfBtn ? pdfBtn.textContent : '';
  if (pdfBtn) { pdfBtn.textContent = '⏳ PDF 생성 중...'; pdfBtn.disabled = true; }
  try {
    const el = document.getElementById('resultCapture');
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: -window.scrollY
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    // jsPDF 호출
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20; // 양옆 10mm 여백
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let position = 10;
    let heightLeft = imgHeight;
    // 첫 페이지
    pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);
    // 페이지 넘치면 추가 페이지
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);
    }
    // 푸터: 생성일·앱명
    const pageCount = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      const footer = `건강어때 AI 소변검사 리포트 · 생성일: ${new Date().toLocaleDateString('ko-KR')} · ${i}/${pageCount}`;
      pdf.text(footer, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }
    const baseName = subjectMode === 'human'
      ? (document.getElementById('humanName').value.trim() || '본인')
      : (document.getElementById('petName').value.trim() || '반려동물');
    const dateStr = new Date().toLocaleDateString('ko-KR').replace(/\./g,'').replace(/ /g,'');
    pdf.save(`건강어때_${baseName}_${dateStr}.pdf`);
  } catch(e) {
    alert('PDF 생성 중 오류가 발생했습니다: ' + (e.message || ''));
  } finally {
    if (pdfBtn) { pdfBtn.textContent = '📄 PDF 리포트 다운로드 (병원용)'; pdfBtn.disabled = false; }
  }
}

async function downloadResult() {
  const btn = document.querySelector('.btn-download');
  if (btn) { btn.textContent = '⏳ 저장 중...'; btn.disabled = true; }
  try {
    const baseName = subjectMode === 'human'
      ? (document.getElementById('humanName').value.trim() || '본인')
      : (document.getElementById('petName').value.trim() || '반려동물');
    const dateStr = new Date().toLocaleDateString('ko-KR').replace(/\./g,'').replace(/ /g,'');
    await saveImageUniversal('resultCapture', `${baseName}_소변검사_${dateStr}.png`, '#f1f5f9');
  } catch(e) {
    alert('저장 중 오류가 발생했습니다: ' + e.message);
  } finally {
    if (btn) { btn.textContent = '📥 결과 이미지 저장'; btn.disabled = false; }
  }
}

// ══════════════════════════════════════
// 로컬 히스토리
// ══════════════════════════════════════
// 이미지 압축 (히스토리 저장 용량 절약)
function compressImageForHistory(dataUrl, maxWidth=700, quality=0.72) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch(e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function saveToHistory({ result, recordData, subject }) {
  try {
    const key = 'urineHistoryV2';
    const history = JSON.parse(localStorage.getItem(key)||'[]');
    // 이미지 압축
    const compressedImage = await compressImageForHistory(imageSrc);
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      subject: subject || 'pet',
      // 전체 결과 + 입력 정보 저장 (재조회용)
      fullResult: result,
      fullRecord: recordData,
      image: compressedImage,
      // 요약 (목록 표시용)
      petType: recordData.petType,
      name: subject === 'human' ? recordData.name : recordData.petName,
      region: recordData.region,
      overallStatus: result.overallStatus,
      summary: result.summary,
    });
    // 최근 12개만 보관 (localStorage 용량 절약)
    let trimmed = history.slice(0, 12);
    // 일단 저장 시도, 실패하면 단계적으로 줄임
    let saved = false;
    while (trimmed.length >= 1 && !saved) {
      try {
        localStorage.setItem(key, JSON.stringify(trimmed));
        saved = true;
      } catch(quotaErr) {
        if (trimmed.length === 1) {
          // 단 1개도 못 저장 → 이미지 빼고 재시도
          trimmed[0].image = null;
          try { localStorage.setItem(key, JSON.stringify(trimmed)); saved = true; }
          catch(e2) { console.error('히스토리 저장 실패 (이미지 제외해도):', e2); break; }
        } else {
          trimmed = trimmed.slice(0, trimmed.length - 1);
        }
      }
    }
    if (!saved) console.error('히스토리 저장 완전 실패');
  } catch(e) { console.error('히스토리 저장 실패:', e); }
}

// 히스토리 항목 클릭 → 처음 봤던 결과 화면 그대로 다시 보여주기
function viewHistoryItem(id) {
  try {
    const history = JSON.parse(localStorage.getItem('urineHistoryV2')||'[]');
    const item = history.find(h => String(h.id) === String(id));
    if (!item || !item.fullResult) {
      alert('이 기록은 자세한 정보가 저장되지 않은 옛날 기록이에요. 새 검사부터는 상세 결과가 저장돼요.');
      return;
    }
    // 이미지 복원
    imageSrc = item.image || null;
    currentResult = item.fullResult;
    subjectMode = item.subject || 'pet';
    const rec = item.fullRecord || {};
    const saju = getSajuHealth(rec.birthYear, rec.birthMonth, item.subject);
    renderResult(item.fullResult, {
      subject: item.subject,
      petName: rec.petName, petBreed: rec.breed, petType: rec.petType,
      humanName: rec.name,
      gender: rec.gender,
      region: rec.region,
      env: rec.environment, lifestyle: rec.lifestyle,
      birthYear: rec.birthYear, birthMonth: rec.birthMonth,
      saju
    });
    showScreen('screenResult');
  } catch(e) { alert('기록을 불러올 수 없습니다.'); }
}

function renderHistory() {
  const list = document.getElementById('historyList');
  try {
    const newH = JSON.parse(localStorage.getItem('urineHistoryV2')||'[]');
    const oldH = JSON.parse(localStorage.getItem('petUrineHistory')||'[]')
      .map(h => ({ ...h, subject: 'pet', name: h.petName }));
    const history = [...newH, ...oldH].sort((a,b) => new Date(b.date) - new Date(a.date));

    if (history.length === 0) {
      list.innerHTML = '<div class="empty-history">아직 검사 기록이 없습니다.<br>홈으로 가서 첫 검사를 시작해보세요! 🩺</div>';
      return;
    }
    const STATUS = { normal:'정상', warning:'주의', danger:'이상' };
    const ICON   = { normal:'✅', warning:'⚠️', danger:'🚨' };
    const BG     = { normal:'#22c55e', warning:'#f59e0b', danger:'#ef4444' };
    list.innerHTML = history.map(h => {
      const d = new Date(h.date);
      const dateStr = d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
      const subjectIcon = h.subject === 'human' ? '🧑'
        : h.petType === 'dog' ? '🐶'
        : h.petType === 'cat' ? '🐱' : '🐾';
      const status = h.overallStatus||'normal';
      const hasFullResult = h.fullResult ? '' : 'opacity:.7';
      const clickAttr = h.fullResult ? `onclick="viewHistoryItem('${h.id}')"` : '';
      // 점수 계산 (있으면)
      const score = h.fullResult ? calculateHealthScore(h.fullResult.testItems) : null;
      const scoreBadge = score !== null ? `<span class="history-score">💯 ${score}</span>` : '';
      return `
        <div class="history-item" ${clickAttr} style="${hasFullResult}">
          <div class="history-header">
            <div class="history-pet">${subjectIcon} ${h.name||'이름 없음'}${scoreBadge}${h.fullResult ? ' <span style="font-size:11px;color:#6366f1;font-weight:600">› 자세히</span>' : ''}</div>
            <div class="history-date">${dateStr}</div>
          </div>
          <div class="history-info">${h.region||''} ${h.region?'·':''} ${h.summary||''}</div>
          <span class="history-badge" style="background:${BG[status]}">${ICON[status]} ${STATUS[status]||'결과 없음'}</span>
        </div>`;
    }).join('');
  } catch(e) {
    list.innerHTML = '<div class="empty-history">기록을 불러올 수 없습니다.</div>';
  }
}

// ══════════════════════════════════════
// 초기화 (홈으로)
// ══════════════════════════════════════
function resetAll() {
  imageSrc = null; imageB64 = null; currentResult = null;
  clearError();
  document.getElementById('loadingBox').classList.remove('show');
  document.getElementById('btnAnalyze').disabled = false;
  document.getElementById('btnAnalyze').textContent = '🔬 AI 분석 시작';
  goHome();
}

// ════════════════════════════════════════════════════════════════
// ★ 설정 모달 (이름 변경 + 데이터 초기화)
// ════════════════════════════════════════════════════════════════
function openSettings() {
  const currentName = localStorage.getItem('userName') || '아직 설정 안됨';
  document.getElementById('settingsCurrentName').textContent = currentName;
  document.getElementById('settingsNameInput').value = '';
  document.getElementById('settingsOverlay').classList.add('show');
  setTimeout(() => document.getElementById('settingsNameInput').focus(), 100);
}
function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('show');
}
function saveNewName() {
  const inp = document.getElementById('settingsNameInput');
  const v = (inp.value || '').trim();
  if (!v) {
    inp.focus();
    inp.placeholder = '새 이름을 입력해주세요!';
    return;
  }
  localStorage.setItem('userName', v);
  closeSettings();
  // 환영 화면으로 돌아가서 새 이름으로 인사
  document.getElementById('welcomeReturn').style.display = 'block';
  document.getElementById('welcomeFirst').style.display = 'none';
  document.getElementById('welcomeGreet').textContent = '반가워요';
  document.getElementById('welcomeName').textContent = v;
  showScreen('screenWelcome');
  setTimeout(() => goHome(), 1800);
}
function manageProfilesFromSettings() {
  closeSettings();
  // 사람·반려동물 둘 다 보여주기 위해 subjectMode 일시 변경 → 모두 표시 모드
  const allProfiles = getProfiles();
  if (allProfiles.length === 0) {
    alert('아직 저장된 프로필이 없어요.\n첫 검사 후 자동으로 프로필이 생성돼요!');
    return;
  }
  // 첫 프로필의 type으로 시작 (편집 모드 자동 진입)
  subjectMode = allProfiles[0].type;
  document.getElementById('profilePickerTitle').innerHTML = '프로필 관리';
  document.getElementById('profilePickerSub').textContent = '편집 모드입니다. ✕ 버튼으로 삭제하세요.';
  document.getElementById('profileAddLabel').textContent = '새 프로필 추가';
  profileEditMode = true;
  renderProfileList();
  document.getElementById('profileEditToggle').textContent = '완료';
  showScreen('screenProfilePicker');
}

function resetAllData() {
  if (!confirm('정말로 모든 기록과 이름을 삭제할까요?\n\n이 작업은 되돌릴 수 없어요.')) return;
  // 🧹 모든 데이터 완전 삭제 (가입 화면부터 다시 시작)
  localStorage.removeItem('userProfileV2');        // 통합 가입 프로필 (중요!)
  localStorage.removeItem('userUuid');             // 사용자 UUID
  localStorage.removeItem('userName');
  localStorage.removeItem('kakaoId');
  localStorage.removeItem('loginProvider');
  localStorage.removeItem('userProfileImg');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userPhysicalProfile');  // 키/몸무게/생년월일 옛 키
  localStorage.removeItem('urineHistoryV2');
  localStorage.removeItem('petUrineHistory');
  localStorage.removeItem('profilesV1');
  localStorage.removeItem('userPoints');
  localStorage.removeItem('pointHistoryV1');
  localStorage.removeItem('lastCheckIn');
  localStorage.removeItem('streakCount');
  localStorage.removeItem('earnedFlags');
  localStorage.removeItem('rewardOrdersV1');
  localStorage.removeItem('dailyCountsV1');
  localStorage.removeItem('waterIntakeV1');        // 물 섭취 기록
  localStorage.removeItem('foodHistoryV1');        // 식단 기록
  localStorage.removeItem('captureTipShown');      // 캡처 안내 플래그
  localStorage.removeItem('reminderDismissedUntil'); // 리마인더 닫기 플래그
  closeSettings();
  alert('모든 데이터가 삭제되었어요. 가입 화면으로 돌아갑니다.');
  location.reload();
}

// ════════════════════════════════════════════════════════════════
// 🗄 Supabase REST API (fetch 기반, CDN 의존성 0)
// ════════════════════════════════════════════════════════════════
const SB = {
  url: window.SUPABASE_URL,
  key: window.SUPABASE_ANON_KEY,
  ready: false,
  headers() {
    return {
      apikey: this.key,
      Authorization: 'Bearer ' + this.key,
      'Content-Type': 'application/json'
    };
  },
  async insert(table, body) {
    try {
      const res = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...this.headers(), Prefer: 'return=minimal' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[SB] insert ${table} 실패:`, res.status, errText);
        // 첫 실패면 사용자에게 알림 (디버그용)
        if (!window._sbErrorShown) {
          window._sbErrorShown = true;
          console.error(`🚨 Supabase 동기화 실패\n테이블: ${table}\n상태: ${res.status}\n에러: ${errText}`);
        }
      } else {
        console.log(`[SB] ✅ insert ${table} 성공`);
      }
      return res.ok;
    } catch(e) { console.warn(`[SB] insert ${table} 오류:`, e); return false; }
  },
  async upsert(table, body, conflictCol) {
    try {
      const res = await fetch(`${this.url}/rest/v1/${table}?on_conflict=${conflictCol}`, {
        method: 'POST',
        headers: { ...this.headers(), Prefer: 'return=minimal,resolution=merge-duplicates' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[SB] upsert ${table} 실패:`, res.status, errText);
        if (!window._sbErrorShown) {
          window._sbErrorShown = true;
          console.error(`🚨 Supabase 동기화 실패\n테이블: ${table}\n상태: ${res.status}\n에러: ${errText}`);
        }
      } else {
        console.log(`[SB] ✅ upsert ${table} 성공`);
      }
      return res.ok;
    } catch(e) { console.warn(`[SB] upsert ${table} 오류:`, e); return false; }
  }
};
if (SB.url && SB.key) { SB.ready = true; console.log('[SB] REST API 준비됨'); }

// 현재 사용자 UUID 가져오기 (없으면 새로 생성)
function getCurrentUserUuid() {
  let uuid = localStorage.getItem('userUuid');
  if (!uuid) {
    uuid = crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2));
    localStorage.setItem('userUuid', uuid);
  }
  return uuid;
}

// 현재 사용자 프로필 가져오기 (통합)
function getUserProfile() {
  try {
    const p = JSON.parse(localStorage.getItem('userProfileV2') || 'null');
    return p;
  } catch(e) { return null; }
}

function saveUserProfileLocal(profile) {
  localStorage.setItem('userProfileV2', JSON.stringify(profile));
  // 옛 키들도 동기화 (호환성)
  if (profile.name) localStorage.setItem('userName', profile.name);
  if (profile.gender || profile.birthYear || profile.height) {
    const old = {
      gender: profile.gender,
      birthYear: profile.birthYear,
      birthMonth: profile.birthMonth,
      birthDay: profile.birthDay,
      height: profile.height,
      weight: profile.weight
    };
    localStorage.setItem('userPhysicalProfile', JSON.stringify(old));
  }
}

// Supabase에 사용자 저장
async function syncUserToSupabase(profile) {
  if (!SB.ready) return null;
  try {
    const uuid = getCurrentUserUuid();
    const payload = {
      user_uuid: uuid,
      name: profile.name,
      phone: profile.phone,
      gender: profile.gender,
      birth_year: profile.birthYear ? parseInt(profile.birthYear) : null,
      birth_month: profile.birthMonth ? parseInt(profile.birthMonth) : null,
      birth_day: profile.birthDay ? parseInt(profile.birthDay) : null,
      height: profile.height ? parseFloat(profile.height) : null,
      weight: profile.weight ? parseFloat(profile.weight) : null,
      sasang_type: profile.sasangType || null,
      consent_privacy: !!profile.consentPrivacy,
      consent_terms: !!profile.consentTerms,
      consent_marketing: !!profile.consentMarketing,
      last_active: new Date().toISOString()
    };
    return SB.upsert('users', payload, 'user_uuid');
  } catch(e) { console.warn('[SB] syncUser:', e); return null; }
}

// 활동 로그 기록
async function logActivity(action, metadata = {}) {
  if (!SB.ready) return;
  try {
    SB.insert('activity_logs', { user_uuid: getCurrentUserUuid(), action, metadata });
  } catch(e) {}
}

// 동의 기록
async function logConsent(type, consented) {
  if (!SB.ready) return;
  try {
    SB.insert('consent_logs', {
      user_uuid: getCurrentUserUuid(),
      consent_type: type,
      consented,
      user_agent: navigator.userAgent
    });
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════
// 📋 통합 가입 폼 함수들
// ════════════════════════════════════════════════════════════════
function formatPhone(input) {
  let v = input.value.replace(/[^0-9]/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length >= 8) v = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7);
  else if (v.length >= 4) v = v.slice(0,3) + '-' + v.slice(3);
  input.value = v;
}

function updateAgeHint() {
  const y = parseInt(document.getElementById('su_year').value);
  const hint = document.getElementById('su_ageHint');
  if (hint && y && y >= 1920 && y <= new Date().getFullYear()) {
    const age = new Date().getFullYear() - y;
    hint.textContent = `만 ${age}세`;
  } else if (hint) hint.textContent = '';
}

async function submitSignup() {
  // 🌟 "전체 동의 후 가입하기" — 모든 동의 자동 체크
  const consentBoxes = ['su_consent_age','su_consent_privacy','su_consent_terms','su_consent_medical','su_consent_marketing'];
  consentBoxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });

  const name = document.getElementById('su_name').value.trim();
  const phone = document.getElementById('su_phone').value.trim();
  const gender = document.querySelector('input[name="su_gender"]:checked')?.value;
  const birthYear = document.getElementById('su_year').value;
  const birthMonth = document.getElementById('su_month').value;
  const birthDay = document.getElementById('su_day').value;
  const height = document.getElementById('su_height').value;
  const weight = document.getElementById('su_weight').value;
  // 동의는 모두 true로 강제 (위에서 체크박스 자동 체크됨)
  const consentAge = true;
  const consentPrivacy = true;
  const consentTerms = true;
  const consentMedical = true;
  const consentMarketing = true;

  // 검증 (개인정보만 — 동의는 위에서 자동 처리)
  if (!name) return alert('이름을 입력해주세요.');
  if (name.length < 1) return alert('이름은 1글자 이상이어야 해요.');
  if (!phone || phone.replace(/-/g,'').length < 10) return alert('휴대폰번호를 정확히 입력해주세요.');
  if (!gender) return alert('성별을 선택해주세요.');
  if (!birthYear || !birthMonth || !birthDay) return alert('생년월일을 모두 입력해주세요.');
  const yNum = parseInt(birthYear), mNum = parseInt(birthMonth), dNum = parseInt(birthDay);
  if (yNum < 1920 || yNum > new Date().getFullYear()) return alert('생년이 올바르지 않아요.');
  if (mNum < 1 || mNum > 12) return alert('월이 올바르지 않아요.');
  if (dNum < 1 || dNum > 31) return alert('일이 올바르지 않아요.');

  const profile = {
    name, phone, gender, birthYear, birthMonth, birthDay, height, weight,
    consentPrivacy, consentTerms, consentMarketing,
    consentAge, consentMedical
  };

  // 로컬 저장
  saveUserProfileLocal(profile);

  // Supabase 동기화
  const submitBtn = document.querySelector('.signup-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '저장 중...'; }
  try {
    await syncUserToSupabase(profile);
    await logConsent('age_14plus', consentAge);
    await logConsent('privacy', consentPrivacy);
    await logConsent('terms', consentTerms);
    await logConsent('medical_disclaimer', consentMedical);
    await logConsent('marketing', consentMarketing);
    await logActivity('signup', { name, phone: phone.slice(0,3) + '****' });
  } catch(e) { console.error('가입 동기화 실패:', e); }

  // 홈으로
  showScreen('screenHome');
}

// ════════════════════════════════════════════════════════════════
// 💧 물 섭취 시스템
// ════════════════════════════════════════════════════════════════
function getWaterAll() { try { return JSON.parse(localStorage.getItem('waterIntakeV1') || '{}'); } catch(e) { return {}; } }
function getWaterToday() { const today = new Date().toISOString().split('T')[0]; return getWaterAll()[today] || 0; }
function setWaterToday(ml) {
  const today = new Date().toISOString().split('T')[0];
  const all = getWaterAll();
  all[today] = Math.max(0, Math.round(ml));
  localStorage.setItem('waterIntakeV1', JSON.stringify(all));
  // 🗄 Supabase 동기화 (REST API)
  try {
    if (SB.ready) {
      SB.upsert('water_intake', {
        user_uuid: getCurrentUserUuid(),
        date: today,
        amount_ml: all[today]
      }, 'user_uuid,date');
    }
  } catch(e) {}
}
function addWater(ml) {
  setWaterToday(getWaterToday() + ml);
  renderWaterWidget();
  renderHomeWaterWidget();
}
function resetWaterToday() {
  if (!confirm('오늘 물 섭취 기록을 리셋할까요?')) return;
  setWaterToday(0);
  renderWaterWidget();
  renderHomeWaterWidget();
}
function getWaterRecommendation() {
  const p = getPersonalProfile();
  const w = parseFloat(p?.weight);
  if (!w || w <= 0) return 2000; // 기본 2L
  return Math.round(w * 33); // 체중 × 33ml (중간값)
}
function getWaterEvalColor(pct) {
  if (pct >= 80) return '#10B981';
  if (pct >= 50) return '#F59E0B';
  return '#3B82F6';
}
function renderWaterWidget() {
  const el = document.getElementById('waterWidget');
  if (!el) return;
  const today = getWaterToday();
  const target = getWaterRecommendation();
  const pct = Math.min(100, Math.round((today / target) * 100));
  const rawPct = (today / target) * 100;
  const color = getWaterEvalColor(rawPct);
  const cups = Math.floor(today / 250);
  const cupsDisplay = cups === 0 ? '🥛 0잔' : `💧 ${cups}잔`;
  let msg;
  if (rawPct >= 100) msg = '💪 오늘 물 섭취 목표 달성! 신장·피부 건강에 좋아요';
  else if (rawPct >= 80) msg = '👍 거의 다 왔어요! 한 컵만 더 마셔보세요';
  else if (rawPct >= 50) msg = '💧 절반은 했어요. 천천히 더 마셔주세요';
  else if (rawPct >= 25) msg = '⚠️ 부족해요. 컵 옆에 두고 자주 마셔주세요';
  else msg = '🚨 너무 적어요! 지금 한 컵 마시는 거 추천!';
  el.innerHTML = `<div class="water-widget">
    <div class="water-head">
      <div>
        <div class="water-title">💧 오늘 물 섭취량</div>
        <div class="water-stats">${today.toLocaleString()}<span class="water-unit">ml</span> / ${target.toLocaleString()}ml <span class="water-pct" style="color:${color}">(${pct}%)</span></div>
      </div>
      <div class="water-cups">${cupsDisplay}</div>
    </div>
    <div class="water-bar-wrap">
      <div class="water-bar" style="width:${pct}%;background-color:${color}"></div>
    </div>
    <div class="water-msg">${msg}</div>
    <div class="water-buttons">
      <button class="water-btn primary" onclick="addWater(250)">💧 +한 컵 (250ml)</button>
      <button class="water-btn" onclick="addWater(500)">+500ml</button>
      <button class="water-btn small" onclick="addWater(-250)">−</button>
      <button class="water-btn small reset" onclick="resetWaterToday()" title="리셋">↺</button>
    </div>
  </div>`;
}
function renderHomeWaterWidget() {
  const el = document.getElementById('homeWaterWidget');
  if (!el) return;
  const today = getWaterToday();
  const target = getWaterRecommendation();
  const pct = Math.min(100, Math.round((today / target) * 100));
  const rawPct = (today / target) * 100;
  const color = getWaterEvalColor(rawPct);
  el.innerHTML = `<div class="home-water">
    <div class="home-water-top">
      <div class="home-water-label">💧 오늘 물 섭취</div>
      <div class="home-water-val">${today.toLocaleString()} / ${target.toLocaleString()}<span style="color:#94A3B8">ml</span></div>
    </div>
    <div class="home-water-bar"><div class="home-water-fill" style="width:${pct}%;background-color:${color}"></div></div>
    <div class="home-water-actions">
      <button class="home-water-btn" onclick="event.stopPropagation();addWater(250)">+250ml</button>
      <button class="home-water-btn" onclick="event.stopPropagation();addWater(500)">+500ml</button>
      <button class="home-water-btn small" onclick="event.stopPropagation();addWater(-250)">−</button>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// 🧬 맞춤 분석 (개인 프로필 기반 BMI·BMR·사상체질·사주 영양 조언)
// ════════════════════════════════════════════════════════════════
function getPersonalProfile() {
  // 1순위: 통합 가입 프로필 V2
  try {
    const v2 = JSON.parse(localStorage.getItem('userProfileV2') || 'null');
    if (v2 && v2.gender) return v2;
  } catch(e) {}
  // 2순위: 옛 physical profile
  try {
    const saved = JSON.parse(localStorage.getItem('userPhysicalProfile') || 'null');
    if (saved) return saved;
  } catch(e) {}
  // 3순위: 옛 가족 프로필
  const hp = (getProfiles() || []).filter(p => p.type === 'human')[0];
  if (hp) return { gender: hp.gender, birthYear: hp.birthYear, birthMonth: hp.birthMonth, lifestyle: hp.lifestyle };
  return null;
}
function openPersonalProfile() {
  const p = getPersonalProfile() || {};
  document.getElementById('pp_gender').value = p.gender || '';
  document.getElementById('pp_birthYear').value = p.birthYear || '';
  document.getElementById('pp_birthMonth').value = p.birthMonth || '';
  document.getElementById('pp_birthDay').value = p.birthDay || '';
  document.getElementById('pp_height').value = p.height || '';
  document.getElementById('pp_weight').value = p.weight || '';
  updateAgePreview();
  document.getElementById('personalProfileModal').style.display = 'block';
}
function closePersonalProfile() {
  document.getElementById('personalProfileModal').style.display = 'none';
}
function updateAgePreview() {
  const y = parseInt(document.getElementById('pp_birthYear').value);
  const preview = document.getElementById('pp_agePreview');
  if (preview && y && y > 1900 && y < 2100) {
    const age = new Date().getFullYear() - y;
    preview.textContent = `만 ${age}세`;
  } else if (preview) preview.textContent = '';
}
function savePersonalProfile() {
  const data = {
    gender: document.getElementById('pp_gender').value,
    birthYear: document.getElementById('pp_birthYear').value,
    birthMonth: document.getElementById('pp_birthMonth').value,
    birthDay: document.getElementById('pp_birthDay').value,
    height: document.getElementById('pp_height').value,
    weight: document.getElementById('pp_weight').value
  };
  localStorage.setItem('userPhysicalProfile', JSON.stringify(data));
  closePersonalProfile();
  // 양쪽 다 갱신
  try { renderCaptureProfileBanner(); } catch(e){}
  try { renderPersonalAnalysis(currentFoodResult); } catch(e){}
}

// 📸 사진 찍기 화면의 프로필 배너 (사진 찍기 전 입력 유도)
function renderCaptureProfileBanner() {
  const el = document.getElementById('captureProfileBanner');
  if (!el) return;
  const p = getPersonalProfile();
  const hasMin = p && p.gender && p.birthYear && p.height && p.weight;
  if (!hasMin) {
    // 프로필 없을 때 — 입력 유도
    el.innerHTML = `<div class="capture-profile-empty" onclick="openPersonalProfile()">
      <div class="cpe-icon">🧬</div>
      <div class="cpe-body">
        <div class="cpe-title">맞춤 분석을 위해 내 정보 입력</div>
        <div class="cpe-sub">성별·생년월일·키·몸무게만 입력하면 BMI·사상체질·사주 영양 조언까지 자동!</div>
      </div>
      <div class="cpe-arrow">›</div>
    </div>`;
  } else {
    // 프로필 있을 때 — 요약 + 수정 버튼
    const age = p.birthYear ? new Date().getFullYear() - parseInt(p.birthYear) : '?';
    const sasangInfo = inferSasangType(p.gender, p.height, p.weight, p.birthYear, p.birthMonth);
    const bmi = sasangInfo?.bmi || '';
    const genderStr = p.gender === 'female' ? '여성' : p.gender === 'male' ? '남성' : '';
    el.innerHTML = `<div class="capture-profile-filled">
      <div class="cpf-row">
        <div class="cpf-stats">
          <span class="cpf-chip">${age}세 ${genderStr}</span>
          ${p.height && p.weight ? `<span class="cpf-chip">${p.height}cm · ${p.weight}kg</span>` : ''}
          ${bmi ? `<span class="cpf-chip">BMI ${bmi}</span>` : ''}
        </div>
        <button class="cpf-edit" onclick="openPersonalProfile()">✏️</button>
      </div>
      <div class="cpf-note">맞춤 영양 분석 적용 중</div>
    </div>`;
  }
}

// 🔮 사상체질 자동 추정 (BMI + 키·몸무게 + 사주 오행)
function inferSasangType(gender, height, weight, birthYear, birthMonth) {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || !w) return null;
  const bmi = w / ((h/100)*(h/100));

  // 사주 오행 (천간 기준)
  let fiveEl = null;
  if (birthYear) {
    const stemIdx = ((parseInt(birthYear) - 4) % 10 + 10) % 10;
    fiveEl = ['목','목','화','화','토','토','금','금','수','수'][stemIdx];
  }

  // BMI 임계값 (한국 기준)
  // 태음인: 체격이 크고 살집 있음 (BMI 25+, 또는 키 큰 편 + BMI 23+)
  // 태양인: 마르고 뼈가 가늘음 (BMI 18.5-)
  // 소양인: 활동적·열많음, 보통 체격~약간 마름 (BMI 19-23 + 화·목 기운)
  // 소음인: 차갑고 마른 편, 작은 체격 (BMI 19-23 + 토·금·수 기운)

  let type = null, reason = '';
  if (bmi >= 25) {
    type = '태음인';
    reason = `BMI ${bmi.toFixed(1)} — 체격이 크고 살집 있는 편`;
  } else if (bmi >= 23) {
    if (fiveEl === '토' || fiveEl === '수') {
      type = '태음인';
      reason = `BMI ${bmi.toFixed(1)} + ${fiveEl}(土·水) 기운 — 살집 있고 차분한 체질`;
    } else {
      type = '소양인';
      reason = `BMI ${bmi.toFixed(1)} + ${fiveEl||'?'} 기운 — 단단하고 활동적인 체질`;
    }
  } else if (bmi < 18.5) {
    if (fiveEl === '목' || fiveEl === '금') {
      type = '태양인';
      reason = `BMI ${bmi.toFixed(1)} (매우 마름) + ${fiveEl}(木·金) 기운 — 마르고 예민한 체질`;
    } else {
      type = '소음인';
      reason = `BMI ${bmi.toFixed(1)} (매우 마름) — 차고 약한 체질`;
    }
  } else {
    // BMI 18.5 ~ 23 (정상)
    if (fiveEl === '화' || fiveEl === '목') {
      type = '소양인';
      reason = `BMI ${bmi.toFixed(1)} + ${fiveEl}(火·木) 기운 — 활동적·열 많은 체질`;
    } else {
      type = '소음인';
      reason = `BMI ${bmi.toFixed(1)} + ${fiveEl||'?'} 기운 — 차분하고 차가운 체질`;
    }
  }
  return { type, reason, bmi: bmi.toFixed(1) };
}

// BMR 계산 (Mifflin-St Jeor) + TDEE
function calcBMR(gender, weight, height, age) {
  const w = parseFloat(weight); const h = parseFloat(height); const a = parseFloat(age);
  if (!w || !h || !a) return null;
  if (gender === 'female') return Math.round(10*w + 6.25*h - 5*a - 161);
  return Math.round(10*w + 6.25*h - 5*a + 5);
}
function calcTDEE(bmr, activity) {
  const mult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 }[activity || 'sedentary'] || 1.2;
  return Math.round(bmr * mult);
}

// 사상체질별 식단 가이드
const SASANG_GUIDE = {
  '태양인': { good: ['해산물', '메밀', '냉성 채소(오이·배추)', '포도', '키위'], bad: ['매운 음식', '뜨거운 음식', '소고기', '꿀'], tip: '간(肝) 기능을 도와 열을 식히는 시원한 음식이 잘 맞아요. 자극적인 양념은 조금만 즐기시면 좋아요.' },
  '태음인': { good: ['소고기', '뿌리채소(무·당근)', '콩류', '땅콩', '버섯'], bad: ['닭고기', '돼지고기 과다', '맵고 짠 음식'], tip: '폐(肺) 기능이 약한 편이라 단백질·식이섬유 풍부한 음식과 적절한 운동이 잘 어울려요.' },
  '소양인': { good: ['돼지고기', '오리고기', '신선한 채소', '수박', '참외'], bad: ['닭고기', '인삼·홍삼', '맵고 뜨거운 음식'], tip: '소화 빠르고 열이 많은 체질이라 차가운 성질의 음식과 충분한 수분이 잘 맞아요.' },
  '소음인': { good: ['닭고기', '인삼', '대추', '생강', '꿀'], bad: ['차가운 음식', '돼지고기', '냉면', '맥주'], tip: '소화력이 섬세한 편이라 따뜻하고 부드러운 음식을 천천히 즐기시면 좋아요. 적당량이 베스트!' }
};

// 사주 오행 → 영양 권장 (간단 매핑)
function getSajuNutritionAdvice(birthYear, birthMonth) {
  if (!birthYear || !birthMonth) return null;
  // 천간(년) 기준 오행
  const stemIdx = ((parseInt(birthYear) - 4) % 10 + 10) % 10;
  // 0,1=목 / 2,3=화 / 4,5=토 / 6,7=금 / 8,9=수
  const fiveEl = ['목','목','화','화','토','토','금','금','수','수'][stemIdx];
  const advice = {
    '목': { name:'木(목) 기운', good:['녹색 채소','신맛(레몬·식초)','간 건강 식품'], focus:'간 기능 강화. 푸른 잎채소·새싹·매실차가 잘 맞아요.' },
    '화': { name:'火(화) 기운', good:['붉은 음식(토마토·당근)','쓴맛','심장 건강 식품'], focus:'심혈관 관리. 토마토·견과류·등푸른 생선이 좋아요.' },
    '토': { name:'土(토) 기운', good:['노란 음식(고구마·호박)','단맛','소화기 식품'], focus:'비위(소화) 강화. 부드럽고 따뜻한 음식, 규칙적인 식사가 중요.' },
    '금': { name:'金(금) 기운', good:['흰 음식(무·도라지)','매운맛 적당히','폐 건강 식품'], focus:'폐·기관지 관리. 배·도라지·무를 자주 드세요.' },
    '수': { name:'水(수) 기운', good:['검은 음식(검은콩·미역)','짠맛 적당히','신장 건강 식품'], focus:'신장·생식 건강. 검은콩·해조류·견과류가 잘 맞아요.' }
  };
  return { element: fiveEl, ...advice[fiveEl] };
}

function renderPersonalAnalysis(foodResult) {
  const card = document.getElementById('personalAnalysisCard');
  if (!card) return;
  const p = getPersonalProfile();

  // 프로필 없으면 입력 유도 카드
  if (!p || (!p.height && !p.weight && !p.birthYear)) {
    card.innerHTML = `<div class="personal-empty">
      <div style="font-size:14px;font-weight:800;color:var(--gray-900);margin-bottom:5px">맞춤 분석 시작하기</div>
      <div style="font-size:11.5px;color:#64748B;margin-bottom:10px;line-height:1.55">키·몸무게·생년월·체질을 입력하면<br>BMI·권장 칼로리·사상체질 식단·사주 영양 조언이 표시돼요.</div>
      <button onclick="openPersonalProfile()" style="width:100%;padding:11px;border:none;border-radius:12px;background:linear-gradient(135deg,#8B5CF6,#6366F1);color:#fff;font-size:12.5px;font-weight:800;cursor:pointer">📝 내 정보 입력하기</button>
    </div>`;
    return;
  }

  // 나이·BMI·BMR·TDEE 계산
  const age = p.birthYear ? new Date().getFullYear() - parseInt(p.birthYear) : null;
  const h = parseFloat(p.height) || 0;
  const w = parseFloat(p.weight) || 0;
  const bmi = (h && w) ? (w / ((h/100)*(h/100))).toFixed(1) : null;
  const bmiCat = bmi
    ? (bmi < 18.5 ? {label:'저체중', color:'#3B82F6'} :
       bmi < 23   ? {label:'정상',   color:'#10B981'} :
       bmi < 25   ? {label:'과체중', color:'#F59E0B'} :
       bmi < 30   ? {label:'비만',   color:'#EF4444'} :
                    {label:'고도비만', color:'#991B1B'})
    : null;
  const bmr = calcBMR(p.gender, p.weight, p.height, age);
  // 활동 수준은 기본 'moderate' 사용 (사용자 입력 없이 자동)
  const tdee = bmr ? calcTDEE(bmr, 'moderate') : null;

  // 이번 식단 칼로리 vs 권장 칼로리
  const mealCal = foodResult?.totalCalories || 0;
  const mealRatio = tdee ? Math.round((mealCal / (tdee/3)) * 100) : null; // 1끼 = TDEE/3 기준

  // 🔮 사상체질 자동 추정 (입력 안 받고 BMI + 사주로 자동)
  const sasangInfo = inferSasangType(p.gender, p.height, p.weight, p.birthYear, p.birthMonth);
  const sasangType = sasangInfo?.type;
  const sasangGuide = sasangType ? SASANG_GUIDE[sasangType] : null;
  // 사주 오행 조언
  const sajuAdvice = getSajuNutritionAdvice(p.birthYear, p.birthMonth);

  // ── 카드 HTML ──
  const statsHtml = `
    <div class="personal-stats">
      ${age ? `<div class="pstat"><div class="pstat-v">${age}</div><div class="pstat-l">세</div></div>` : ''}
      ${bmi ? `<div class="pstat"><div class="pstat-v" style="color:${bmiCat.color}">${bmi}</div><div class="pstat-l">BMI · ${bmiCat.label}</div></div>` : ''}
      ${tdee ? `<div class="pstat"><div class="pstat-v">${tdee}</div><div class="pstat-l">권장 kcal/일</div></div>` : ''}
      ${mealRatio !== null ? `<div class="pstat"><div class="pstat-v" style="color:${mealRatio>120?'#EF4444':mealRatio<70?'#F59E0B':'#10B981'}">${mealRatio}%</div><div class="pstat-l">1끼 권장 대비</div></div>` : ''}
    </div>`;

  const sasangHtml = sasangGuide ? `
    <div class="personal-section sasang">
      <div class="psect-title">맞춤 영양 조언</div>
      <div class="psect-tip">${sasangGuide.tip}</div>
      <div class="psect-row"><strong style="color:#065F46">💚 잘 맞는 음식</strong> ${sasangGuide.good.join(', ')}</div>
      <div class="psect-row"><strong style="color:#B45309">🍃 조금만 즐기시면 좋아요</strong> ${sasangGuide.bad.join(', ')}</div>
    </div>` : '';

  const sajuHtml = sajuAdvice ? `
    <div class="personal-section saju">
      <div class="psect-title">사주 ${sajuAdvice.name} 영양 조언</div>
      <div class="psect-tip">${sajuAdvice.focus}</div>
      <div class="psect-row"><strong style="color:#1E40AF">✓ 권장</strong> ${sajuAdvice.good.join(', ')}</div>
    </div>` : '';

  card.innerHTML = `
    <div class="personal-card">
      <div class="personal-header">
        <div style="font-size:14.5px;font-weight:800;color:var(--gray-900)">${age||'?'}세 ${p.gender==='female'?'여성':p.gender==='male'?'남성':''} 맞춤 분석</div>
        <button onclick="openPersonalProfile()" class="personal-edit-btn">✏️ 수정</button>
      </div>
      ${statsHtml}
      ${sasangHtml}
      ${sajuHtml}
      ${!sasangGuide && !sajuAdvice ? `<div style="font-size:11px;color:#94A3B8;text-align:center;padding:8px">체질·생년월을 추가하면 더 자세한 조언이 나옵니다</div>` : ''}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// 📊 식단 주간/월간 리포트
// ════════════════════════════════════════════════════════════════
function showFoodReport(period) {
  try {
    return _showFoodReportImpl(period);
  } catch(err) {
    console.error('리포트 생성 실패:', err);
    const content = document.getElementById('foodReportContent');
    if (content) {
      content.innerHTML = `
        <h2 style="font-size:18px;margin:0 0 14px;color:#1F2937">📊 리포트</h2>
        <div style="text-align:center;padding:40px 20px;color:#94A3B8">
          <div style="font-size:48px;margin-bottom:12px">⚠️</div>
          <div style="font-size:13px;line-height:1.6;color:#64748B">리포트 생성에 문제가 생겼어요.</div>
          <div style="font-size:10.5px;color:#EF4444;margin-top:14px;padding:10px;background:#FEF2F2;border-radius:8px;text-align:left;font-family:monospace;word-break:break-all;line-height:1.5">${(err && (err.stack || err.message)) || String(err)}</div>
        </div>`;
      document.getElementById('foodReportModal').style.display = 'block';
    }
  }
}
function _showFoodReportImpl(period) {
  const days = period === 'week' ? 7 : 30;
  const periodLabel = period === 'week' ? '주간 (최근 7일)' : '월간 (최근 30일)';

  let history = [];
  try { history = JSON.parse(localStorage.getItem('foodHistoryV1') || '[]'); } catch(e) { history = []; }

  const now = Date.now();
  const cutoff = now - days * 86400000;
  const filtered = history.filter(h => {
    const t = new Date(h.date || h.timestamp || 0).getTime();
    return t >= cutoff;
  });

  const modal = document.getElementById('foodReportModal');
  const content = document.getElementById('foodReportContent');

  if (filtered.length === 0) {
    content.innerHTML = `
      <h2 style="font-size:18px;margin:0 0 14px;color:#1F2937">📊 ${periodLabel} 리포트</h2>
      <div style="text-align:center;padding:50px 20px;color:#94A3B8">
        <div style="font-size:54px;margin-bottom:14px">📭</div>
        <div style="font-size:13px;line-height:1.6">이 기간엔 분석한 식단이 없어요.<br>식단을 더 많이 분석하면<br>풍부한 리포트가 만들어져요!</div>
      </div>`;
    modal.style.display = 'block';
    return;
  }

  // 통계 (안전한 숫자 변환)
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const totalCal = filtered.reduce((s, h) => s + num(h.totalCalories), 0);
  const avgCal = Math.round(totalCal / filtered.length);
  const avgScore = Math.round(filtered.reduce((s, h) => s + num(h.balanceScore), 0) / filtered.length);

  // 일별 데이터
  const dailyMap = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { cal: 0, score: 0, count: 0, label: `${d.getMonth()+1}/${d.getDate()}` };
  }
  filtered.forEach(h => {
    try {
      const dt = new Date(h.date || h.timestamp || 0);
      const key = dt.toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].cal += num(h.totalCalories);
        dailyMap[key].score += num(h.balanceScore);
        dailyMap[key].count++;
      }
    } catch(e) { /* 손상된 데이터 무시 */ }
  });

  // 자주 먹은 음식 top 5 (옛 데이터 호환: string / array / object 다 처리)
  const foodCount = {};
  filtered.forEach(h => {
    let foods = h.foods;
    // 문자열이면 쉼표로 분리해서 배열로
    if (typeof foods === 'string') {
      foods = foods.split(/[,、+·]/).map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(foods)) return;
    foods.forEach(f => {
      const name = (typeof f === 'string' ? f : (f && f.name)) || '';
      const cleanName = String(name).replace(/\s*\([A-Za-z][^)]*\)\s*/g, '').trim();
      if (cleanName) foodCount[cleanName] = (foodCount[cleanName] || 0) + 1;
    });
  });
  const topFoods = Object.entries(foodCount).sort((a,b) => b[1] - a[1]).slice(0, 5);

  // 평균 영양소 — 매크로 + 비타민 + 미네랄 다 누적 (안전 처리)
  const nutSum = { carbs:0, protein:0, fat:0, fiber:0, sodium:0, sugar:0 };
  const microSum = { vitaminA:0, vitaminC:0, vitaminD:0, vitaminE:0, vitaminB:0, folate:0, calcium:0, iron:0, magnesium:0, zinc:0, potassium:0 };
  let nutCount = 0;
  filtered.forEach(h => {
    if (h.nutrition && typeof h.nutrition === 'object') {
      Object.keys(nutSum).forEach(k => nutSum[k] += num(h.nutrition[k]));
      nutCount++;
    }
    // micronutrients 없으면 음식 기반 자동 추정
    let micro = h.micronutrients;
    if (!micro || typeof micro !== 'object' || Object.keys(micro).filter(k => num(micro[k]) > 0).length < 3) {
      try { micro = estimateMicronutrients(h.foods || []); } catch(e) { micro = null; }
    }
    if (micro && typeof micro === 'object') {
      Object.keys(microSum).forEach(k => microSum[k] += num(micro[k]));
    }
  });
  const nutAvg = {};
  Object.keys(nutSum).forEach(k => nutAvg[k] = nutCount ? Math.round(nutSum[k] / nutCount) : 0);
  const microAvg = {};
  Object.keys(microSum).forEach(k => microAvg[k] = nutCount ? Math.round(microSum[k] / nutCount * 10) / 10 : 0);

  // 칼로리 막대 차트
  const dailyArray = Object.entries(dailyMap);
  const maxCal = Math.max(...dailyArray.map(([, d]) => d.cal), 1);
  const labelEvery = Math.max(1, Math.floor(dailyArray.length / 8));
  const calBars = dailyArray.map(([, d], i) => {
    const height = d.cal > 0 ? Math.max(4, Math.round((d.cal / maxCal) * 100)) : 2;
    const showLabel = i % labelEvery === 0;
    return `<div class="chart-bar-wrap"><div class="chart-bar-val">${d.cal || ''}</div><div class="chart-bar" style="height:${height}px"></div><div class="chart-bar-label">${showLabel ? d.label : ''}</div></div>`;
  }).join('');

  // 균형 점수 차트
  const scoreBars = dailyArray.map(([, d], i) => {
    const avg = d.count > 0 ? Math.round(d.score / d.count) : 0;
    const height = avg > 0 ? Math.max(4, avg) : 2;
    const color = avg >= 80 ? 'linear-gradient(180deg,#10B981,#059669)' : avg >= 60 ? 'linear-gradient(180deg,#F59E0B,#EA580C)' : avg > 0 ? 'linear-gradient(180deg,#EF4444,#DC2626)' : '#E5E7EB';
    const showLabel = i % labelEvery === 0;
    return `<div class="chart-bar-wrap"><div class="chart-bar-val">${avg || ''}</div><div class="chart-bar" style="height:${height}px;background:${color}"></div><div class="chart-bar-label">${showLabel ? d.label : ''}</div></div>`;
  }).join('');

  // top 음식
  const topColors = ['#F59E0B','#FB923C','#FBBF24','#FCD34D','#FDE68A'];
  const maxCount = topFoods.length ? topFoods[0][1] : 1;
  const topFoodsHtml = topFoods.map(([name, count], i) => {
    const width = Math.round((count / maxCount) * 100);
    return `<div class="topfood-row"><div class="topfood-rank">${i+1}</div><div class="topfood-info"><div class="topfood-name">${name}</div><div class="topfood-bar"><div class="topfood-bar-fill" style="width:${width}%;background:${topColors[i]}"></div></div></div><div class="topfood-count">${count}회</div></div>`;
  }).join('') || '<div style="color:#94A3B8;font-size:12px;padding:10px;text-align:center">기록된 음식이 없어요</div>';

  // 📊 영양소 그룹 — 매크로 / 미네랄 / 비타민
  const NUT_GROUPS = {
    macro: {
      title: '🍚 매크로 영양소',
      items: {
        carbs:    { label:'탄수화물',  target:300,  unit:'g',  bad:false },
        protein:  { label:'단백질',    target:60,   unit:'g',  bad:false },
        fat:      { label:'지방',      target:65,   unit:'g',  bad:false },
        fiber:    { label:'식이섬유',  target:25,   unit:'g',  bad:false },
        sodium:   { label:'나트륨',    target:2000, unit:'mg', bad:true },
        sugar:    { label:'당류',      target:50,   unit:'g',  bad:true }
      },
      src: nutAvg
    },
    mineral: {
      title: '⛏ 미네랄',
      items: {
        calcium:   { label:'칼슘',      target:800,  unit:'mg' },
        iron:      { label:'철분',      target:12,   unit:'mg' },
        magnesium: { label:'마그네슘',  target:320,  unit:'mg' },
        zinc:      { label:'아연',      target:9,    unit:'mg' },
        potassium: { label:'칼륨',      target:3500, unit:'mg' }
      },
      src: microAvg
    },
    vitamin: {
      title: '💊 비타민',
      items: {
        vitaminA: { label:'비타민 A',  target:800, unit:'μg' },
        vitaminC: { label:'비타민 C',  target:100, unit:'mg' },
        vitaminD: { label:'비타민 D',  target:10,  unit:'μg' },
        vitaminE: { label:'비타민 E',  target:12,  unit:'mg' },
        vitaminB: { label:'비타민 B군',target:5,   unit:'mg' },
        folate:   { label:'엽산',      target:400, unit:'μg' }
      },
      src: microAvg
    }
  };

  // 영양소 행 렌더 — 색상: 좋음(초록)·보통(주황)·부족/과다(빨강)
  const renderNutRow = ([k, info], src) => {
    const v = src[k] || 0;
    const t = info.target;
    const rawPct = (v / t) * 100;
    const pct = Math.min(100, Math.round(rawPct));
    const isBad = !!info.bad;
    let color, status;
    if (isBad) {
      // 적게 먹을수록 좋음
      if (rawPct >= 110) { color = '#EF4444'; status = '과다'; }
      else if (rawPct >= 70) { color = '#F59E0B'; status = '주의'; }
      else { color = '#10B981'; status = '좋음'; }
    } else {
      // 많이 먹을수록 좋음
      if (rawPct >= 80) { color = '#10B981'; status = '좋음'; }
      else if (rawPct >= 50) { color = '#F59E0B'; status = '보통'; }
      else { color = '#EF4444'; status = '부족'; }
    }
    return `<div class="report-nut-row">
      <div class="report-nut-label">${info.label}</div>
      <div class="report-nut-bar"><div class="report-nut-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="report-nut-val">${v}/${t}${info.unit}</div>
    </div>`;
  };

  const nutHtml = Object.values(NUT_GROUPS).map(grp => {
    const rows = Object.entries(grp.items).map(e => renderNutRow(e, grp.src)).join('');
    return `<div class="nut-group">
      <div class="nut-group-title">${grp.title}</div>
      ${rows}
    </div>`;
  }).join('');

  // 🥗 부족·과다 영양소 — 매크로 + 비타민 + 미네랄 다 검사
  const NUT_RECO = {
    carbs:    { lacked:'에너지·집중력 저하 위험', foods:['잡곡밥','고구마','통밀빵','오트밀'] },
    protein:  { lacked:'근육 손실·면역력 약화 위험', foods:['닭가슴살','두부','계란','연어','콩'] },
    fat:      { lacked:'호르몬·뇌 기능 저하 위험', foods:['아보카도','견과류','올리브유','연어'] },
    fiber:    { lacked:'장 건강·변비·혈당 문제 위험', foods:['나물 반찬','잡곡밥','브로콜리','사과','콩나물'] },
    sodium:   { excess:'고혈압·신장 부담', tips:['국물 줄이기','싱겁게 조리','김치 적게'] },
    sugar:    { excess:'혈당·체지방·당뇨 위험', tips:['과일로 대체','믹스커피·음료 줄이기','달콤한 빵 자제'] },
    calcium:  { lacked:'골다공증·뼈 건강 약화 위험', foods:['우유','치즈','두부','멸치','브로콜리'] },
    iron:     { lacked:'빈혈·피로감 누적 위험', foods:['소고기','시금치','굴','콩','달걀'] },
    magnesium:{ lacked:'근육 경련·수면 장애 위험', foods:['견과류','시금치','검은콩','아보카도','다크초콜릿'] },
    zinc:     { lacked:'면역력 저하·상처 회복 지연', foods:['굴','소고기','호박씨','병아리콩'] },
    potassium:{ lacked:'근육 약화·혈압 조절 어려움', foods:['바나나','고구마','시금치','아보카도','감자'] },
    vitaminA: { lacked:'시력·점막 건강 저하', foods:['당근','시금치','고구마','브로콜리','계란노른자'] },
    vitaminC: { lacked:'면역력·피부 건강 저하', foods:['오렌지','딸기','키위','피망','브로콜리'] },
    vitaminD: { lacked:'뼈·근육·면역 약화 위험', foods:['연어','계란노른자','버섯','참치','적절한 햇볕'] },
    vitaminE: { lacked:'항산화 기능 저하', foods:['아몬드','해바라기씨','아보카도','시금치'] },
    vitaminB: { lacked:'에너지 대사·신경 기능 저하', foods:['돼지고기','현미','달걀','시금치','연어'] },
    folate:   { lacked:'세포 분열·신경 발달 저하', foods:['시금치','브로콜리','아스파라거스','콩'] }
  };

  const lackedItems = [];
  const excessItems = [];
  // 모든 그룹 순회
  Object.values(NUT_GROUPS).forEach(grp => {
    Object.entries(grp.items).forEach(([k, info]) => {
      const v = grp.src[k] || 0;
      const t = info.target;
      const pct = Math.round((v / t) * 100);
      if (info.bad) {
        if (pct >= 100) excessItems.push({ k, label: info.label, pct });
      } else {
        if (pct < 70 && NUT_RECO[k]) lackedItems.push({ k, label: info.label, pct });
      }
    });
  });
  // 심한 순서로 정렬 (가장 부족한 것 위로)
  lackedItems.sort((a, b) => a.pct - b.pct);
  excessItems.sort((a, b) => b.pct - a.pct);

  // 🌟 칭찬·따끔 멘트
  const lackedCnt = lackedItems.length;
  const excessCnt = excessItems.length;
  let coachMsg = '', coachClass = '';
  if (avgScore >= 85 && lackedCnt === 0 && excessCnt === 0) {
    coachMsg = `🌟 <strong>정말 훌륭해요!</strong> ${avgScore}점에 부족·과다 영양소도 없어요. 이 페이스 그대로 유지해주세요!`;
    coachClass = 'praise';
  } else if (avgScore >= 75 && lackedCnt <= 2) {
    coachMsg = `👍 <strong>잘 드시고 계세요!</strong> 점수 ${avgScore}점, 균형도 괜찮아요. ${lackedCnt > 0 ? `다만 ${lackedCnt}가지 영양소가 살짝 부족하니 채워보세요.` : '지금처럼 유지하세요.'}`;
    coachClass = 'praise';
  } else if (lackedCnt >= 5 || excessCnt >= 2) {
    coachMsg = period === 'month'
      ? `<strong>한 달간 식단 관리가 부족하셨어요.</strong> 부족 ${lackedCnt}가지, 과다 ${excessCnt}가지. 이대로 가면 건강에 문제가 생길 수 있어요. 식습관 개선이 시급합니다.`
      : `<strong>이번 주는 신경 더 써야겠어요.</strong> 부족 ${lackedCnt}가지, 과다 ${excessCnt}가지가 보여요. 추천 음식을 챙겨보세요.`;
    coachClass = 'warn';
  } else if (lackedCnt >= 3 || excessCnt >= 1) {
    coachMsg = `💪 <strong>괜찮지만 더 좋아질 수 있어요.</strong> 부족·과다 영양소가 ${lackedCnt+excessCnt}가지 보여요. 신경 쓰면 점수도 올라갈 거예요!`;
    coachClass = 'neutral';
  } else {
    coachMsg = `🍽 ${avgScore}점, 평균적인 식단이에요. 조금만 더 챙기면 좋아질 거예요.`;
    coachClass = 'neutral';
  }
  const coachHtml = `<div class="coach-msg ${coachClass}">${coachMsg}</div>`;

  let recoHtml = '';
  // 💊 공통 영양제 사전 (주간/월간 둘 다 사용)
  const NUT_SUPPLEMENTS = {
    carbs:    [],
    protein:  ['단백질 보충제 (WPI)','필수아미노산 (EAA)','BCAA'],
    fat:      ['오메가3 (EPA·DHA)','MCT 오일'],
    fiber:    ['차전자피 (사일리움)','이눌린','식이섬유 보충제'],
    sodium:   [],
    sugar:    ['크롬 (혈당 안정)','베르베린'],
    calcium:  ['칼슘+비타민D','마그네슘+칼슘 복합제'],
    iron:     ['철분제 (페로글로빈/훼럼)','비타민C+철분'],
    magnesium:['마그네슘 (비스글리시네이트)','ZMA'],
    zinc:     ['아연 (피콜리네이트)','종합 미네랄'],
    potassium:['종합 미네랄'],
    vitaminA: ['비타민A 보충제','종합 비타민'],
    vitaminC: ['비타민C 1000mg'],
    vitaminD: ['비타민D3 2000IU','오메가3+비타민D'],
    vitaminE: ['비타민E','종합 비타민'],
    vitaminB: ['비타민B 컴플렉스','액티폴린'],
    folate:   ['엽산 (활성형 메틸엽산)','비타민B 컴플렉스']
  };

  if (period === 'week') {
    // 주간 — 부드러운 추천 톤
    if (lackedItems.length > 0 || excessItems.length > 0) {
      const lackHtml = lackedItems.map(it => {
        const reco = NUT_RECO[it.k];
        return `<div class="reco-card reco-soft">
          <div class="reco-head"><strong>${it.label}</strong> ${it.pct}% 수준</div>
          <div class="reco-body">${reco?.lacked || ''} 가능성이 있어요. 다음 음식들을 추가해보면 좋아요:</div>
          <div class="reco-foods">${(reco?.foods||[]).map(f => `<span class="reco-food-tag">${f}</span>`).join('')}</div>
        </div>`;
      }).join('');
      const excessHtml = excessItems.map(it => {
        const reco = NUT_RECO[it.k];
        return `<div class="reco-card reco-soft warn">
          <div class="reco-head"><strong>${it.label}</strong> ${it.pct}% (권장량 초과)</div>
          <div class="reco-body">${reco?.excess || ''} 우려가 있어요. 다음을 시도해보세요:</div>
          <div class="reco-foods">${(reco?.tips||[]).map(f => `<span class="reco-food-tag">${f}</span>`).join('')}</div>
        </div>`;
      }).join('');

      // 💊 영양제 부드러운 추천 — 가장 부족한 3개 영양소만, 각 1개씩
      const top3Lacked = lackedItems.slice(0, 3);
      const uniqueSuppsW = top3Lacked.map(it => {
        const opts = NUT_SUPPLEMENTS[it.k] || [];
        return opts[0] ? { s: opts[0], reason: `${it.label} 보충 (${it.pct}%)` } : null;
      }).filter(Boolean);
      const suppHtmlW = uniqueSuppsW.length > 0 ? `
        <div class="reco-card reco-soft" style="background:linear-gradient(135deg,#FAF5FF,#F3E8FF);border-color:#D8B4FE">
          <div class="reco-head" style="color:var(--gray-800)"><strong>이번 주 추천 영양제</strong></div>
          <div class="reco-body" style="color:#7C3AED">음식으로 부족한 부분을 영양제로 가볍게 보완해보세요. (전문가 상담 후 복용을 권장드려요)</div>
          <div class="reco-foods">${uniqueSuppsW.map(x => `<span class="reco-food-tag" style="background:var(--gray-50);border-color:var(--gray-200);color:var(--gray-700)">${x.s}</span>`).join('')}</div>
          <div style="margin-top:7px;font-size:10.5px;color:#6B21A8;line-height:1.55">
            ${uniqueSuppsW.map(x => `• <strong>${x.s}</strong> — ${x.reason}`).join('<br>')}
          </div>
        </div>` : '';

      recoHtml = `<div class="report-section">
        <div class="report-section-title">이번 주 영양 추천</div>
        ${lackHtml}${excessHtml}${suppHtmlW}
      </div>`;
    } else {
      recoHtml = `<div class="report-section">
        <div class="report-section-title">이번 주 영양 추천</div>
        <div style="padding:14px;text-align:center;color:#10B981;font-size:12.5px;background:#ECFDF5;border-radius:10px;border:1px solid #A7F3D0">
          이번 주 영양 균형이 좋아요! 지금처럼 유지해주세요 👍
        </div>
      </div>`;
    }
  } else {
    // 월간 — 강한 권장 톤
    if (lackedItems.length > 0 || excessItems.length > 0) {
      const lackHtml = lackedItems.map(it => {
        const reco = NUT_RECO[it.k];
        return `<div class="reco-card reco-strong">
          <div class="reco-head"><strong>${it.label} 만성 부족 (${it.pct}%)</strong></div>
          <div class="reco-body">한 달 누적 데이터에서 ${reco?.lacked || ''}가 심각하게 우려됩니다.<br><strong>매끼 다음 음식을 반드시 챙겨 드셔야 합니다:</strong></div>
          <div class="reco-foods">${(reco?.foods||[]).map(f => `<span class="reco-food-tag strong">${f}</span>`).join('')}</div>
        </div>`;
      }).join('');
      const excessHtml = excessItems.map(it => {
        const reco = NUT_RECO[it.k];
        return `<div class="reco-card reco-strong danger">
          <div class="reco-head"><strong>${it.label} 만성 과다 (${it.pct}%)</strong></div>
          <div class="reco-body">${reco?.excess || ''} 위험이 누적되고 있습니다.<br><strong>지금 당장 다음 습관을 들이셔야 합니다:</strong></div>
          <div class="reco-foods">${(reco?.tips||[]).map(f => `<span class="reco-food-tag strong">${f}</span>`).join('')}</div>
        </div>`;
      }).join('');

      // 💊 영양제 추천 — 가장 부족한 3개 영양소만 (각 1개씩)
      const top3LackedM = lackedItems.slice(0, 3);
      const uniqueSupps = top3LackedM.map(it => {
        const opts = NUT_SUPPLEMENTS[it.k] || [];
        return opts[0] ? { s: opts[0], reason: `${it.label} 만성 부족 ${it.pct}%` } : null;
      }).filter(Boolean);
      // 부족 영양소가 4개 이상이면 종합 비타민·미네랄 추가
      if (lackedItems.length >= 4 && uniqueSupps.length < 3) {
        uniqueSupps.push({ s: '종합 비타민·미네랄', reason: '전반적인 영양 부족 보완' });
      }
      const suppHtml = uniqueSupps.length > 0 ? `
        <div class="reco-card reco-strong" style="background:linear-gradient(135deg,#F3E8FF,#FAE8FF);border-color:#A855F7">
          <div class="reco-head" style="color:var(--gray-800)"><strong>권장 영양제</strong></div>
          <div class="reco-body" style="color:#581C87">
            한 달간 누적된 부족·과다 영양소를 보완하려면 다음 영양제를 고려하세요.<br>
            <strong>약국·전문가 상담 후 복용을 권장드립니다.</strong>
          </div>
          <div class="reco-foods">${uniqueSupps.map(x => `<span class="reco-food-tag strong" style="background:#991B1B;border-color:#991B1B">${x.s}</span>`).join('')}</div>
          <div style="margin-top:8px;font-size:10.5px;color:#6B21A8;line-height:1.55">
            ${uniqueSupps.map(x => `• <strong>${x.s}</strong> — ${x.reason}`).join('<br>')}
          </div>
        </div>` : '';

      recoHtml = `<div class="report-section">
        <div class="report-section-title">한달 누적 영양 경고</div>
        <div style="font-size:11.5px;color:#92400E;margin-bottom:10px;line-height:1.5">한 달간 누적된 부족·과다 영양소예요. 건강을 위해 식습관 개선이 필요해요.</div>
        ${lackHtml}${excessHtml}${suppHtml}
      </div>`;
    } else {
      recoHtml = `<div class="report-section">
        <div class="report-section-title">한달 누적 영양 분석</div>
        <div style="padding:14px;text-align:center;color:#065F46;font-size:13px;background:#ECFDF5;border-radius:10px;border:1.5px solid #10B981;font-weight:700">
          🎉 한 달간 영양 균형이 매우 우수했어요!<br>지금처럼 꾸준히 유지해주세요.
        </div>
      </div>`;
    }
  }

  // 평가 멘트
  const scoreMsg = avgScore >= 85 ? '🌟 영양 균형이 정말 훌륭해요!' : avgScore >= 70 ? '👍 균형있게 잘 드시고 있어요' : avgScore >= 55 ? '💪 조금만 더 신경 쓰면 좋아질 거예요' : '🙌 다양한 음식을 더 챙겨보세요';

  content.innerHTML = `
    <h2 style="font-size:18px;margin:0 0 4px;color:#1F2937">📊 ${periodLabel} 리포트</h2>
    <div style="font-size:12px;color:#64748B;margin-bottom:10px">${scoreMsg}</div>

    ${coachHtml}

    <div class="report-stats">
      <div class="report-stat">
        <div class="report-stat-val">${filtered.length}</div>
        <div class="report-stat-label">분석 횟수</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-val">${avgCal}</div>
        <div class="report-stat-label">평균 kcal</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-val">${avgScore}</div>
        <div class="report-stat-label">평균 점수</div>
      </div>
    </div>

    <div class="report-section">
      <div class="report-section-title">일별 칼로리</div>
      <div class="chart-bars">${calBars}</div>
    </div>

    <div class="report-section">
      <div class="report-section-title">일별 균형 점수</div>
      <div class="chart-bars">${scoreBars}</div>
    </div>

    <div class="report-section">
      <div class="report-section-title">자주 먹은 음식 Top 5</div>
      ${topFoodsHtml}
    </div>

    <div class="report-section">
      <div class="report-section-title">평균 영양소 (1회당)</div>
      ${nutHtml}
    </div>

    ${recoHtml}

    <div class="report-section">
      <div class="report-section-title">📝 식단 기록 관리</div>
      <div style="font-size:11.5px;color:#64748B;margin-bottom:8px;line-height:1.5">잘못 입력된 식단이 있으면 삭제하세요. 리포트가 정확해져요.</div>
      <div class="food-records-list">
        ${filtered.slice().reverse().slice(0, 30).map(h => {
          const id = h.timestamp || h.date || JSON.stringify(h).slice(0,40);
          const dt = new Date(h.date || h.timestamp || Date.now());
          const dateStr = `${dt.getMonth()+1}/${dt.getDate()}`;
          // 옛 데이터 호환: foods가 string·null일 수 있음
          let foodsArr = h.foods;
          if (typeof foodsArr === 'string') foodsArr = foodsArr.split(/[,、+·]/).map(s => s.trim()).filter(Boolean);
          if (!Array.isArray(foodsArr)) foodsArr = [];
          const foods = foodsArr.map(f => typeof f === 'string' ? f : (f && f.name) || '').filter(Boolean).slice(0, 3).join(', ');
          const moreFoods = foodsArr.length > 3 ? ` 외 ${foodsArr.length - 3}개` : '';
          return `<div class="food-record-row">
            <div class="food-record-info">
              <div class="food-record-date">📅 ${dateStr} · ${h.mealTime || '식사'}</div>
              <div class="food-record-foods">${foods}${moreFoods}</div>
              <div class="food-record-cal">${h.totalCalories || 0} kcal</div>
            </div>
            <button class="food-record-del" onclick="deleteFoodRecord('${String(id).replace(/'/g,'')}', '${period}')">🗑</button>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
  modal.style.display = 'block';
}

// 🗑 식단 기록 삭제
function deleteFoodRecord(id, period) {
  if (!confirm('이 식단 기록을 삭제할까요?\n삭제 후 리포트가 다시 계산돼요.')) return;
  try {
    let history = JSON.parse(localStorage.getItem('foodHistoryV1') || '[]');
    history = history.filter(h => {
      const hid = h.timestamp || h.date || JSON.stringify(h).slice(0,40);
      return String(hid) !== String(id);
    });
    localStorage.setItem('foodHistoryV1', JSON.stringify(history));
    // 리포트 즉시 갱신
    showFoodReport(period || 'week');
  } catch(e) {
    alert('삭제 중 오류: ' + (e.message || ''));
  }
}

function closeFoodReport() {
  const m = document.getElementById('foodReportModal');
  if (m) m.style.display = 'none';
}

// 궁합 더 보기 토글
function togglePairMore(type) {
  const rowsEl = document.getElementById(type === 'good' ? 'goodMoreRows' : 'badMoreRows');
  const btnEl = document.getElementById(type === 'good' ? 'goodMoreBtn' : 'badMoreBtn');
  if (rowsEl) rowsEl.style.display = 'block';
  if (btnEl) btnEl.style.display = 'none';
}

// ════════════════════════════════════════════════════════════════
// 페이지 첫 로드 시 환영 화면 초기화
// ════════════════════════════════════════════════════════════════
document.body.classList.add('welcome-active');
// 모바일이면 카카오 버튼 숨김 (WebView OAuth 한계 때문)
if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
  document.body.classList.add('is-mobile');
}
initWelcome();
</script>
</body>
</html>
