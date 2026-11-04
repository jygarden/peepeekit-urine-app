// ═══════════════════════════════════════════════════════════════
// 🤖 HealthCompanion · 건강어때 AI 캐릭터 컴포넌트
//
// 사용법:
//   const c = HealthCompanion.mount(element, { size: 80 });
//   c.setState('idle' | 'thinking' | 'result' | 'saved');
//   c.destroy();
//
// 상태:
//   idle     — 숨 쉬며 약하게 물결 (기본)
//   thinking — 가장자리 물결 커짐 · 눈 움직임 활발
//   result   — 한 번 튀며 웃는 눈 (2.6초) → idle 자동 복귀
//   saved    — 작게 끄덕인 뒤 idle 자동 복귀
//
// 특징:
//   · IntersectionObserver로 화면 밖이면 애니메이션 정지
//   · prefers-reduced-motion 자동 감지
//   · DPI 대응 · 투명 배경 · 비율 유지
//   · 실패/부정적 신호에 성공 표정 쓰지 않음 (setState만 노출 · 평가는 호출자 몫)
// ═══════════════════════════════════════════════════════════════
(function(global){
  'use strict';

  const DEFAULTS = {
    size: 80,              // px (정사각)
    speed: 0.8,            // 애니메이션 배속
    autoRevert: true,      // result/saved 끝나면 idle로 자동 복귀
    pauseOffscreen: true   // 화면 밖이면 정지 (성능)
  };

  function Companion(element, opts) {
    this.el = element;
    this.opts = Object.assign({}, DEFAULTS, opts || {});
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;background:transparent';
    this.canvas.setAttribute('aria-hidden', 'true');

    // wrapper (비율 유지)
    this.wrap = document.createElement('div');
    this.wrap.style.cssText =
      'display:block;width:' + this.opts.size + 'px;height:' + this.opts.size + 'px;' +
      'aspect-ratio:1;position:relative;overflow:hidden;background:transparent';
    this.wrap.appendChild(this.canvas);
    element.appendChild(this.wrap);

    // state
    this.mode = 'idle';
    this.t = 0;              // 숨 쉬는 시간
    this.e = 0;              // 현재 모드 경과 시간
    this.last = 0;
    this.blend = 0;          // thinking 가중치 (부드럽게 들어가기)
    this.visible = true;
    this.destroyed = false;

    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.playing = !reduce;
    this.reducedMotion = reduce;

    // 화면 밖이면 정지
    if (this.opts.pauseOffscreen && 'IntersectionObserver' in global) {
      this.io = new IntersectionObserver((entries) => {
        this.visible = entries.some(en => en.isIntersecting);
      }, { threshold: 0.01 });
      this.io.observe(this.wrap);
    }

    // 리사이즈 대응
    if ('ResizeObserver' in global) {
      this.ro = new ResizeObserver(() => this._draw());
      this.ro.observe(this.wrap);
    }

    // 사용자 motion 설정 변경 시 반영
    if (global.matchMedia) {
      this.mql = global.matchMedia('(prefers-reduced-motion: reduce)');
      this._mqlListener = (ev) => {
        this.reducedMotion = ev.matches;
        if (ev.matches) this.playing = false;
      };
      if (this.mql.addEventListener) this.mql.addEventListener('change', this._mqlListener);
    }

    this._raf = requestAnimationFrame(this._frame.bind(this));
    this._draw();
  }

  Companion.prototype.setState = function(mode) {
    if (!['idle','thinking','result','saved'].includes(mode)) return;
    this.mode = mode;
    this.e = 0;
    // result/saved 는 일정 시간 후 자동 복귀
    if (this.opts.autoRevert) {
      if (this._revertTO) clearTimeout(this._revertTO);
      if (mode === 'result') {
        this._revertTO = setTimeout(() => { if (this.mode === 'result') this.setState('idle'); }, 2600);
      } else if (mode === 'saved') {
        this._revertTO = setTimeout(() => { if (this.mode === 'saved') this.setState('idle'); }, 2000);
      }
    }
  };

  Companion.prototype.getState = function() { return this.mode; };

  Companion.prototype.setPlaying = function(on) {
    this.playing = !!on && !this.reducedMotion;
  };

  Companion.prototype.destroy = function() {
    this.destroyed = true;
    cancelAnimationFrame(this._raf);
    if (this._revertTO) clearTimeout(this._revertTO);
    if (this.io) this.io.disconnect();
    if (this.ro) this.ro.disconnect();
    if (this.mql && this.mql.removeEventListener) this.mql.removeEventListener('change', this._mqlListener);
    if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
  };

  Companion.prototype._frame = function(now) {
    if (this.destroyed) return;
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    if (this.playing && this.visible) {
      this.t += dt * this.opts.speed;
      this.e += dt;
      this.blend += (1 - this.blend) * dt * 3;
      this._draw();
    }
    this._raf = requestAnimationFrame(this._frame.bind(this));
  };

  Companion.prototype._draw = function() {
    const canvas = this.canvas;
    const w = this.wrap.clientWidth || this.opts.size;
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(w * dpr));
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    const c = canvas.getContext('2d');
    // viewBox 360×360 기준으로 그리고, canvas 크기에 맞춰 스케일
    c.setTransform(canvas.width / 360, 0, 0, canvas.height / 360, 0, 0);
    c.clearRect(0, 0, 360, 360);

    const mode = this.mode;
    const t = this.t, e = this.e;
    const active = mode === 'thinking' ? this.blend : 0;
    const hop = mode === 'result' ? Math.sin(e * 8) * Math.exp(-e * 1.5) * 15 : 0;
    const nod = mode === 'saved' ? Math.sin(e * 6) * Math.exp(-e * 1.7) * 0.12 : 0;
    const breath = Math.sin(t * 1.45) * 2.5;
    const cy = 181 + Math.sin(t * 0.95) * 2 - Math.abs(hop);

    c.save();
    c.translate(180, cy);
    c.rotate(nod);
    c.scale(1 + hop * 0.002, 1 - hop * 0.002);

    // 슬라임 바디 (220점 메타볼 · 한쪽이 살짝 솟은 실루엣)
    c.beginPath();
    for (let j = 0; j <= 220; j++) {
      const a = j / 220 * Math.PI * 2;
      // 한쪽에 작은 뿔 (angular = a + 1.03 라디안 · 약 11시 방향)
      const angular = Math.atan2(Math.sin(a + 1.03), Math.cos(a + 1.03));
      const tuft = 15 * Math.exp(-angular * angular / 0.075);
      const r = 91 + breath + tuft
              + (3 + active * 7) * Math.sin(a * 3 + t * (0.65 + active))
              + (2 + active * 3) * Math.cos(a * 4 - t * 0.6);
      const x = Math.cos(a) * r * 1.05;
      const y = Math.sin(a) * r;
      if (j) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();

    // 블루 그라데이션 (라이트 → 메인 블루)
    const g = c.createLinearGradient(-65, -90, 65, 95);
    g.addColorStop(0,   '#69a4ff');
    g.addColorStop(0.5, '#347af4');
    g.addColorStop(1,   '#2563eb');
    c.fillStyle = g;
    c.fill();

    // 눈 (result 모드에서는 웃는 아치, 그 외는 타원 + 간혹 깜박임)
    const blink = Math.pow(Math.max(0, Math.cos(t * 1.1 + 2)), 65);
    const fx = mode === 'thinking' ? Math.sin(t * 1.4) * 3 : Math.sin(t * 0.6) * 1.2;
    c.fillStyle = '#fff';
    c.strokeStyle = '#fff';
    c.lineCap = 'round';
    c.lineWidth = 4;
    for (const x of [-20, 20]) {
      c.beginPath();
      if (mode === 'result' && e < 2.6) {
        // 웃는 눈 ⌣⌣
        c.moveTo(x - 5, -2);
        c.quadraticCurveTo(x, -11, x + 5, -2);
        c.stroke();
      } else {
        // 타원 (깜박임 반영)
        c.ellipse(x + fx, -5, 5.3, Math.max(1.2, 7.5 * (1 - blink)), 0, 0, Math.PI * 2);
        c.fill();
      }
    }

    // 입 (작은 미소)
    c.beginPath();
    c.moveTo(-8 + fx, 12);
    c.quadraticCurveTo(fx, 23, 8 + fx, 12);
    c.stroke();

    c.restore();
  };

  // ═══ 공개 API ═══
  const HealthCompanion = {
    mount: function(element, opts) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (!element) throw new Error('HealthCompanion: element not found');
      return new Companion(element, opts);
    },
    // 전역 레지스트리 (같은 엘리먼트 여러 번 mount 방지용 · 선택)
    _reg: new WeakMap()
  };

  global.HealthCompanion = HealthCompanion;
})(typeof window !== 'undefined' ? window : this);
