// 🔒 Vercel 빌드 스크립트
// index.html 안의 <script> 태그를 Terser로 minify + 난독화
// 결과물은 dist/index.html에 배포

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function build() {
  console.log('🔨 빌드 시작...');

  const rootDir = __dirname;
  const distDir = path.join(rootDir, 'dist');

  // dist 폴더 생성 (없으면)
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

  // index.html 읽기
  const inputPath = path.join(rootDir, 'index.html');
  if (!fs.existsSync(inputPath)) {
    console.error('❌ index.html이 없어요');
    process.exit(1);
  }
  let html = fs.readFileSync(inputPath, 'utf8');

  // <script> 태그 안 코드를 정규식으로 추출 후 minify
  // (외부 src 있는 스크립트는 건너뜀)
  const scriptRegex = /<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/g;
  let match;
  let totalOriginal = 0;
  let totalMinified = 0;
  let count = 0;

  const replacements = [];

  while ((match = scriptRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attrs = match[1] || '';
    const code = match[2] || '';
    if (!code.trim()) continue;

    totalOriginal += code.length;
    count++;

    try {
      const result = await minify(code, {
        compress: {
          drop_console: false, // 콘솔 로그 유지 (디버깅용)
          drop_debugger: true,
          passes: 2
        },
        mangle: {
          toplevel: false, // 전역 함수명은 유지 (HTML onclick에서 참조)
          reserved: [
            // HTML onclick에서 호출되는 함수들 (mangling 방지)
            'goHome', 'goPoints', 'goHistory', 'goReport', 'goAllergyProfile', 'goAddProfile',
            'openSettings', 'closeSettings', 'saveNewName', 'manageProfilesFromSettings', 'resetAllData',
            'openStreakInfo', 'openProfileSwitcher', 'closeProfileSwitcher', 'openCheckinModal', 'closeCheckin',
            'switchProfile', 'openAddProfileForm', 'saveNewProfile', 'saveCheckin',
            'openProfileManager', 'closeProfileManager', 'editFamilyProfileFromManager', 'confirmDeleteFamilyProfile',
            'enterPetFood', 'selectPetFoodType', 'selectPetFoodSide', 'handlePetFoodFile', 'analyzePetFood', 'renderPetFoodResult',
            'enterPetPantry', 'enterPetPantryOrCapture', 'renderPantryList', 'setCurrentFeedingFood', 'deletePetFoodRecord', 'markCurrentFeedingFromResult', '_confirmDeletePantryItem', 'filterPantry', 'selectPetFoodKind', '_apBreedSuggest', '_apSelectBreed', '_apSelectBreedOther', 'sharePetFoodStory', 'apSelectSpecies', '_renderPantryNutrition',
            'enterVetChat', '_renderVetChat', '_vetChatQuickAsk', '_resetVetChat', 'sendVetMessage',
            'enterPrescription', 'renderPrescription', 'generateMonthlyPrescription', 'apSelectNeuter',
            'startOnboardingSelf', 'startOnboardingPet', 'renderOnboarding', 'maybeShowOnboarding', 'completeOnboarding', '_obNext', '_obSkipToSelect', '_obShowSlide',
            'apSelectType', 'apSelectEmoji', 'apSelectGender',
            'saveAllergyProfile', 'toggleAllergy', 'openPersonalProfile', 'closePersonalProfile', 'savePersonalProfile', 'updateAgePreview',
            'enterHuman', 'enterPet', 'enterFood', 'enterIngredient', 'enterKidsSection',
            'enterKidsMeal', 'enterKidsIngredient', 'enterKidsCheck', 'saveKidsGrowth',
            'safeCameraClick', 'openFileInput', 'handleFile', 'handleFoodFile', 'handleIngredientFile',
            'handleKidsMealFile', 'handleKidsIngFile',
            'analyzeFood', 'analyzeIngredient', 'confirmAndAnalyze', 'analyzePicture',
            'downloadResult', 'downloadFoodResult', 'downloadPDF',
            'shareUrineStory', 'shareFoodStory', 'shareIngredientStory', 'shareWeeklyStory', 'shareChallengeStory',
            'openChallenge', 'stampToday', 'openWeeklyReport', 'startQuiz', 'answerQuiz', 'nextQuiz', 'exitQuiz',
            'selectFoodTarget', 'selectMealTime', 'selectKidsMealTime', 'selectKidsMealType',
            'toggleActionPlan', 'toggleFoodIngredients', 'addNewFood', 'removeFood', 'undoRemoveFood',
            'updateFoodName', 'updateIngredient', 'removeIngredient', 'addIngredient',
            'showScreen', 'showFoodReport', 'switchReport', 'closeFoodReport',
            'addWater', 'resetWaterToday',
            'submitSignup', 'kakaoLogin',
            'sendChatMessage', 'sendSuggest', 'enterChat',
            'selectPet', 'selectGender', 'selectEnv', 'selectHumanGender', 'selectLifestyle',
            'formatPhone', 'goCapture', 'showAgePicker',
            'saveNickname', 'closeReminder',
            'openFortune', 'openFortuneResult', 'startFortuneDraw', 'shareFortuneStory',
            'enterSupplement', 'goAddSupplement', 'saveNewSupplement', 'onSupplementTaken',
            'editSupplement', '_saveEditSupplement', '_confirmDeleteSupplement', '_previewSupplementTiming',
            'handleSupplementLabelFile',
            'openCuration', 'renderCuration', 'curateFromResult',
            'ggGoTab', 'updateGgTabbar', 'renderGgHomeV10', 'renderGgHomeV12',
            'switchCaptureSubject', '_apSelectBreedOther',
            'renderSupplementAggregate', 'aggregateAllSupplements', 'findKrdaKey', 'parseSupplementAmount', 'convertToKrdaUnit',
            'switchSupplementSubject', 'renderMyScreen',
            'calculateCompositeScore', 'getSmartTodayAction', 'getTodayCare', 'getTodayFortunePill',
            'computeTodayAvoidRecommend', 'NUTRIENT_INTERACTIONS', '_matchNutrient',
            'getTodayFoodPlan', '_ORGAN_FOODS', '_WARNING_FOODS', '_getSeasonalFoods',
            'renderV14Home', 'getMostUrgentAction', 'getRecentTestSummary', 'getTodayIntakeCount',
            'getTodayDinnerCandidates', 'loadFoodPhoto', '_v14PickAlt', '_v14PickThis', '_v14ShowWhy', '_v14OpenFortune',
            '_petShotCaptured', '_petUpdateCta', '_petSubmitShots', '_petMultiSelected',
            'KOREAN_FOOD_DB', 'RDA_ADULT', 'NUTRIENT_LABEL', 'sumNutrition', '_matchFoodInDB',
            'getTodayNutritionBalance', 'getShortageTop',
            'MEAL_POOL_BY_SITUATION', 'SHORTAGE_TO_FOODS', 'getWhatToEatNow', 'MEAL_TIME_EXCLUDE', '_mealTimeSlot',
            'MISSION_POOL', 'getTodayMissions',
            'getCoachInsights', 'COACH_SUGGESTED_QUESTIONS',
            // v2.0 신규 · 홈/추천 재작성
            'NUTRIENT_KNOWLEDGE', 'FOOD_ALIAS', '_getFoodHistory', '_foodsFromEntry',
            'get7DayScores', 'get7DayScoreAvg', 'getShortageDayCount', 'getHeroSummary',
            'renderV20Home', '_v20RenderMealSuggestion', '_v20SelectSituation',
            '_v20RenderMissions', '_v20RenderCoach', '_v20OpenChip', '_v20RenderChipAnswer',
            '_v20Esc', '_v20CurrentSituation',
            'renderV20Curation', '_v20RecSwitch', '_v20RecRenderNutrients',
            '_v20RecAppendMenus', '_v20RecRenderFoods', '_v20RecRenderLifestyle', '_v20RecCurrentTab',
            // v2.0 · 식단 스토리 카드 + Unsplash 통합
            'renderV20FoodStoryDOM', 'FOOD_ALIAS', '_v20FoodQueryMap', '_v20FetchFoodPhoto',
            // v2.0 v3 · 홈 재작성
            '_v20RenderRecentMeal', 'BODY_SIGNAL_MAP', '_v20RenderBodySignal', '_v20RenderBottomCards', '_v20MakeThumb',
            'receiveSleepData', 'requestSleepData', '_v20RenderHeroFace',
            // v20 · 영양제 복용 알림 Flutter 브릿지
            '_v20SetSupplementReminder', '_v20SyncAllReminders', '_v20OpenReminderModal',
            '_v20OpenRecentMealResult', '_v20OpenMealWhy', '_v20SelectAnalyzeTarget',
            'renderV20Report', 'NUTRIENT_QUICK_FOODS', 'NUTRIENT_TAGLINE', '_v20ToggleNutrientDetail',
            'HEX_AXES', '_v20RenderHexMap', '_v20OpenNutrientMap', 'FOOD_PORTION', '_foodPortion',
            'BODY_SIGNAL_CARDS', 'BODY_SIGNAL_MAP', 'pickBodySignalCard', '_v20RenderBodySignal',
            'foodUserMemo', '_foodMemoOnInput', '_foodMemoAppend',
            'markSupplementFromNotification', 'scheduleSupplementReminder', 'cancelSupplementReminder',
            // v20 · 수면 체크
            'SLEEP_QUESTIONS', 'SLEEP_VAL', 'calculateSleepPattern', 'getSleepLifestyleContext', 'buildSleepCoaching',
            'saveSleepCheck', 'getSleepCheckHistory', 'getLastSleepCheck', 'daysSinceLastSleepCheck',
            'enterSleepCheck', 'renderSleepIntro', '_sleepStartQuestions', '_sleepRenderQuestion',
            '_v20EstimateNutrition', '_sleepMakeHeadline', '_sleepMakeWhyText', '_sleepMakeEvidenceList', '_sleepPatternStatus', '_sleepInvertedStatus',
            '_sleepAnswer', '_sleepPrev', '_sleepShowLoading', 'renderSleepResult', '_sleepSetAsMission',
            '_sleepAnswers', '_sleepCurrentQ'
          ]
        },
        format: {
          comments: false,
          inline_script: true // 🛡️ 문자열 안 &lt;/script&gt; 등 자동 escape (스크립트 조기 종료 방지)
        }
      });

      // 🛡️ script 안의 raw &lt;/script&gt; 자동 escape (문자열 안 이면 브라우저가 조기 종료)
      const minified = (result.code || code)
        .replace(/<\/script/gi, '<\\/script')
        .replace(/<!--/g, '<\\!--');
      totalMinified += minified.length;
      const newScript = `<script${attrs}>${minified}</script>`;
      replacements.push({ from: fullMatch, to: newScript });
    } catch (err) {
      console.warn(`⚠️ script ${count} minify 실패 (원본 유지):`, err.message.slice(0, 100));
    }
  }

  // 교체 적용 (함수 콜백으로 $& 등 특수문자 오해석 방지)
  for (const rep of replacements) {
    html = html.replace(rep.from, () => rep.to);
  }

  // HTML 자체도 간단히 압축 (여러 줄 공백 → 한 줄)
  html = html.replace(/\n\s*\n\s*\n/g, '\n\n');

  // 결과 저장
  const outputPath = path.join(distDir, 'index.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  // 🗂 루트의 모든 정적 파일 자동 복사 (admin.html, sw.js, pet-idcard.html 등 자동 감지)
  const staticExts = ['.html', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.json', '.js', '.txt', '.xml', '.webp', '.woff', '.woff2', '.ttf', '.css'];
  const excludeFiles = new Set(['build.js', 'package.json', 'package-lock.json', 'vercel.json', 'index.html', '.env', '.env.local', '.gitignore']);
  const excludeDirs = new Set(['dist', 'node_modules', '.git', 'api', '.vercel', '.well-known']);

  let copiedCount = 0;
  for (const f of fs.readdirSync(rootDir)) {
    const fullPath = path.join(rootDir, f);
    let stat;
    try { stat = fs.statSync(fullPath); } catch(e) { continue; }
    if (stat.isDirectory()) continue;
    if (excludeFiles.has(f)) continue;
    if (f.startsWith('.')) continue;
    const ext = path.extname(f).toLowerCase();
    if (!staticExts.includes(ext)) continue;
    fs.copyFileSync(fullPath, path.join(distDir, f));
    copiedCount++;
  }

  // .well-known 폴더는 통째로 복사 (있는 경우)
  const wellKnownSrc = path.join(rootDir, '.well-known');
  if (fs.existsSync(wellKnownSrc) && fs.statSync(wellKnownSrc).isDirectory()) {
    const wellKnownDest = path.join(distDir, '.well-known');
    if (!fs.existsSync(wellKnownDest)) fs.mkdirSync(wellKnownDest, { recursive: true });
    for (const f of fs.readdirSync(wellKnownSrc)) {
      fs.copyFileSync(path.join(wellKnownSrc, f), path.join(wellKnownDest, f));
    }
  }

  // 🖼 assets 폴더 재귀 복사 (촬영 가이드 사진 등)
  function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return 0;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    let count = 0;
    for (const f of fs.readdirSync(src)) {
      if (f.startsWith('.')) continue; // .DS_Store 등 스킵
      const srcPath = path.join(src, f);
      const destPath = path.join(dest, f);
      const st = fs.statSync(srcPath);
      if (st.isDirectory()) {
        count += copyDirRecursive(srcPath, destPath);
      } else {
        try {
          if (fs.existsSync(destPath) && fs.statSync(destPath).size === st.size) continue;
          fs.copyFileSync(srcPath, destPath);
          count++;
        } catch(e) {
          if (e.code === 'EACCES') continue; // 권한 문제 파일은 스킵
          throw e;
        }
      }
    }
    return count;
  }
  const assetsCount = copyDirRecursive(path.join(rootDir, 'assets'), path.join(distDir, 'assets'));
  if (assetsCount > 0) console.log(`   assets 파일 ${assetsCount}개 복사`);

  // API 파일들 dist/api로 복사
  const apiSrcDir = path.join(rootDir, 'api');
  const apiDestDir = path.join(distDir, 'api');
  if (fs.existsSync(apiSrcDir)) {
    if (!fs.existsSync(apiDestDir)) fs.mkdirSync(apiDestDir);
    for (const f of fs.readdirSync(apiSrcDir)) {
      fs.copyFileSync(path.join(apiSrcDir, f), path.join(apiDestDir, f));
    }
  }

  const ratio = totalOriginal > 0 ? ((1 - totalMinified/totalOriginal) * 100).toFixed(1) : 0;
  console.log(`✅ 빌드 완료!`);
  console.log(`   스크립트 ${count}개 minify (${(totalOriginal/1024).toFixed(1)} KB → ${(totalMinified/1024).toFixed(1)} KB, ${ratio}% 절약)`);
  console.log(`   정적 파일 ${copiedCount}개 복사`);
  console.log(`   → dist/`);
}

build().catch(err => {
  console.error('❌ 빌드 실패:', err);
  process.exit(1);
});
