// ═══════════════════════════════════════════════════════════════
// 🏥 Apple HealthKit / Google Health Connect 연동 레이어
//
// 공통 인터페이스:
//   HealthSync.isAvailable()            → boolean (플러그인 있나)
//   HealthSync.requestPermissions()     → Promise<boolean> (권한 허용?)
//   HealthSync.readAll({ from, to })    → Promise<{steps, heartRate[], bp[], glucose[], weight[], ...}>
//   HealthSync.syncToServer()           → Promise<{synced_count}>
//
// 작동:
//   - Capacitor 네이티브 앱 + HealthKit 플러그인 → 실제 데이터
//   - 웹 PWA / 플러그인 없음 → 조용히 fail (false 리턴)
// ═══════════════════════════════════════════════════════════════
(function(global){
  'use strict';

  const SUPPORTED_TYPES = [
    'steps',          // 걸음 수
    'heart_rate',     // 심박수
    'blood_pressure', // 혈압
    'blood_glucose',  // 혈당
    'weight',         // 체중
    'body_fat',       // 체지방률
    'sleep',          // 수면 (시간/단계)
    'active_energy'   // 운동 칼로리
  ];

  function isNative() {
    return !!(global.Capacitor && global.Capacitor.isNativePlatform && global.Capacitor.isNativePlatform());
  }
  function platform() {
    try { return global.Capacitor && global.Capacitor.getPlatform && global.Capacitor.getPlatform(); } catch(e) { return 'web'; }
  }

  async function getPlugin() {
    if (!isNative()) return null;
    try {
      // iOS: @perfood/capacitor-healthkit
      if (platform() === 'ios' && global.CapacitorHealthkit) return { kind: 'ios', plugin: global.CapacitorHealthkit };
      // Android: @kiwi-health/capacitor-health-connect
      if (platform() === 'android' && global.HealthConnect) return { kind: 'android', plugin: global.HealthConnect };
      // fallback · 통합 플러그인
      if (global.CapacitorHealth) return { kind: 'unified', plugin: global.CapacitorHealth };
      return null;
    } catch(e) { return null; }
  }

  async function isAvailable() {
    const p = await getPlugin();
    return !!p;
  }

  // 권한 요청
  async function requestPermissions() {
    const p = await getPlugin();
    if (!p) return false;
    try {
      if (p.kind === 'ios') {
        // Apple HealthKit
        const result = await p.plugin.requestAuthorization({
          all: [],
          read: [
            'HKQuantityTypeIdentifierStepCount',
            'HKQuantityTypeIdentifierHeartRate',
            'HKQuantityTypeIdentifierBloodPressureSystolic',
            'HKQuantityTypeIdentifierBloodPressureDiastolic',
            'HKQuantityTypeIdentifierBloodGlucose',
            'HKQuantityTypeIdentifierBodyMass',
            'HKQuantityTypeIdentifierBodyFatPercentage',
            'HKQuantityTypeIdentifierActiveEnergyBurned',
            'HKCategoryTypeIdentifierSleepAnalysis'
          ],
          write: []
        });
        return !!result;
      }
      if (p.kind === 'android') {
        // Google Health Connect
        const granted = await p.plugin.requestHealthPermissions({
          permissions: [
            { type: 'Steps', accessType: 'read' },
            { type: 'HeartRate', accessType: 'read' },
            { type: 'BloodPressure', accessType: 'read' },
            { type: 'BloodGlucose', accessType: 'read' },
            { type: 'Weight', accessType: 'read' },
            { type: 'BodyFat', accessType: 'read' },
            { type: 'ActiveCaloriesBurned', accessType: 'read' },
            { type: 'SleepSession', accessType: 'read' }
          ]
        });
        return granted && granted.grantedPermissions && granted.grantedPermissions.length > 0;
      }
      if (p.kind === 'unified') {
        const r = await p.plugin.requestPermissions({ permissions: SUPPORTED_TYPES });
        return !!(r && r.granted);
      }
    } catch(e) {
      console.warn('[HealthSync] permission error', e);
      return false;
    }
    return false;
  }

  // 데이터 읽기 (from~to 범위 · 기본 오늘)
  async function readAll(opts) {
    const p = await getPlugin();
    if (!p) return null;
    const from = opts && opts.from ? new Date(opts.from) : new Date(Date.now() - 86400000); // 24h ago
    const to   = opts && opts.to   ? new Date(opts.to)   : new Date();

    const result = {
      steps: null, heart_rate: [], blood_pressure: [], blood_glucose: [],
      weight: null, body_fat: null, sleep_minutes: null, active_energy: null
    };

    try {
      if (p.kind === 'ios') {
        const query = async (sampleName, unit) => {
          try {
            const res = await p.plugin.queryHKitSampleType({
              sampleName, startDate: from.toISOString(), endDate: to.toISOString(), limit: 500, unit
            });
            return (res && res.resultData) || [];
          } catch(e) { return []; }
        };
        const stepsR = await query('stepCount', 'count');
        if (stepsR.length) result.steps = stepsR.reduce((s, x) => s + (x.value||0), 0);
        result.heart_rate = (await query('heartRate', 'count/min')).map(x => ({ value: x.value, at: x.startDate }));
        const sys = await query('bloodPressureSystolic', 'mmHg');
        const dia = await query('bloodPressureDiastolic', 'mmHg');
        // 시간 매칭 (각각 같은 시각끼리 pair)
        result.blood_pressure = sys.map((s, i) => ({ systolic: s.value, diastolic: dia[i] ? dia[i].value : null, at: s.startDate })).filter(x => x.diastolic != null);
        result.blood_glucose = (await query('bloodGlucose', 'mg/dL')).map(x => ({ value: x.value, at: x.startDate }));
        const w = await query('bodyMass', 'kg');
        if (w.length) result.weight = w[w.length - 1].value;
        const bf = await query('bodyFatPercentage', '%');
        if (bf.length) result.body_fat = bf[bf.length - 1].value * 100;
        const kcal = await query('activeEnergyBurned', 'kcal');
        if (kcal.length) result.active_energy = kcal.reduce((s, x) => s + (x.value||0), 0);
      }
      else if (p.kind === 'android') {
        const query = async (type) => {
          try {
            const res = await p.plugin.readRecords({
              type, timeRangeFilter: { startTime: from.toISOString(), endTime: to.toISOString() }
            });
            return (res && res.records) || [];
          } catch(e) { return []; }
        };
        const stepsR = await query('Steps');
        if (stepsR.length) result.steps = stepsR.reduce((s, x) => s + (x.count||0), 0);
        result.heart_rate = (await query('HeartRate')).map(x => ({ value: x.beatsPerMinute, at: x.time }));
        result.blood_pressure = (await query('BloodPressure')).map(x => ({ systolic: x.systolic && x.systolic.inMillimetersOfMercury, diastolic: x.diastolic && x.diastolic.inMillimetersOfMercury, at: x.time }));
        result.blood_glucose = (await query('BloodGlucose')).map(x => ({ value: x.level && x.level.inMilligramsPerDeciliter, at: x.time }));
        const w = await query('Weight');
        if (w.length) result.weight = w[w.length - 1].weight && w[w.length - 1].weight.inKilograms;
        const bf = await query('BodyFat');
        if (bf.length) result.body_fat = bf[bf.length - 1].percentage;
        const kcal = await query('ActiveCaloriesBurned');
        if (kcal.length) result.active_energy = kcal.reduce((s, x) => s + (x.energy && x.energy.inKilocalories || 0), 0);
      }
    } catch(e) { console.warn('[HealthSync] readAll error', e); }

    return result;
  }

  // 서버 동기화 (body_logs에 저장)
  async function syncToServer() {
    const data = await readAll({ from: new Date(Date.now() - 86400000), to: new Date() });
    if (!data) return { synced: 0, note: 'not_available' };
    const payload = {};
    if (data.weight != null)    payload.weight_kg = data.weight;
    if (data.body_fat != null)  payload.body_fat_pct = data.body_fat;
    const bp = (data.blood_pressure || [])[0];
    if (bp && bp.systolic && bp.diastolic) { payload.bp_systolic = bp.systolic; payload.bp_diastolic = bp.diastolic; }
    const glu = (data.blood_glucose || [])[0];
    if (glu && glu.value) payload.glucose_mg_dl = glu.value;
    if (!Object.keys(payload).length) return { synced: 0, note: 'no_new_data' };
    try {
      if (typeof global._bodyApi === 'function') {
        await global._bodyApi('POST', '/api/body-log', Object.assign({ source: 'healthkit' }, payload));
        try { localStorage.setItem('healthSync_lastSync', String(Date.now())); } catch(e){}
        return { synced: Object.keys(payload).length, payload };
      }
    } catch(e) { console.warn('[HealthSync] syncToServer error', e); }
    return { synced: 0, note: 'api_unavailable' };
  }

  function isEnabled() {
    try { return localStorage.getItem('healthSync_enabled') === '1'; } catch(e) { return false; }
  }
  function setEnabled(on) {
    try { localStorage.setItem('healthSync_enabled', on ? '1' : '0'); } catch(e){}
  }

  // 자동 동기화 (앱 시작 시 · 12시간 간격)
  async function autoSyncIfNeeded() {
    if (!isEnabled()) return;
    try {
      const last = parseInt(localStorage.getItem('healthSync_lastSync') || '0', 10);
      if (Date.now() - last < 12 * 3600 * 1000) return; // 12시간 이내면 skip
      await syncToServer();
    } catch(e) {}
  }

  global.HealthSync = {
    isAvailable, requestPermissions, readAll, syncToServer, isEnabled, setEnabled, autoSyncIfNeeded,
    platform, isNative
  };
})(typeof window !== 'undefined' ? window : this);
