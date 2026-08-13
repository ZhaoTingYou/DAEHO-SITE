import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const provider = readFileSync(new URL('./analytics-provider.tsx', import.meta.url), 'utf8');

test('consent banner waits for web fonts before its first paint', () => {
  // 배너는 화면 하단에 고정돼 있다. 글꼴이 늦게 바뀌면 높이가 줄고, 그만큼 내용이
  // 아래로 밀려 레이아웃 이동으로 기록된다. 글꼴이 확정된 뒤 한 번만 그려야 한다.
  assert.match(provider, /const \[fontsSettled, setFontsSettled\] = useState\(false\)/);
  assert.match(provider, /document\.fonts/);
  assert.match(provider, /fonts\.ready\.then\(settle\)/);
  assert.match(provider, /\{bannerOpen && validMeasurementId && fontsSettled \?/);
});

test('consent banner still appears when web fonts never resolve', () => {
  // 글꼴 요청이 실패하거나 지연되어도 동의를 받을 수단이 사라지면 안 된다.
  assert.match(provider, /const FONT_SETTLE_TIMEOUT_MS = \d+/);
  assert.match(provider, /setTimeout\(settle, FONT_SETTLE_TIMEOUT_MS\)/);
  assert.match(provider, /\.catch\(settle\)/);
  // document.fonts 자체가 없는 환경에서는 기다리지 않고 바로 그린다.
  assert.match(provider, /\} else \{\n\s*settle\(\);\n\s*\}/);
});

test('waiting for fonts does not change consent behaviour', () => {
  // 렌더 시점만 늦추는 변경이다. 동의 상태 전이와 GA 초기화 조건은 그대로여야 한다.
  assert.match(provider, /consent === 'granted' && validMeasurementId/);
  assert.match(provider, /ANALYTICS_CONSENT_EVENT/);
  assert.doesNotMatch(provider, /fontsSettled[^)\n]*initializeGoogleAnalytics/);
});
