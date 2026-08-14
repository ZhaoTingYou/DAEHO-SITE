import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const heroMedia = readFileSync(new URL('./hero-media.tsx', import.meta.url), 'utf8');

test('hero video is skipped on narrow viewports', () => {
  // 모바일에서는 영상 대신 대표 이미지만 노출한다.
  assert.match(heroMedia, /shouldRenderVideo =\s*[\s\S]*?mobileViewport === false/);
});

test('hero video is not fetched before the viewport is measured', () => {
  // mobileViewport 초기값은 null이다. false일 때만 재생해야 폭을 알기 전에 내려받지 않는다.
  assert.match(heroMedia, /const \[mobileViewport, setMobileViewport\] = useState<boolean \| null>\(null\)/);
  assert.doesNotMatch(heroMedia, /shouldRenderVideo =\s*[\s\S]*?mobileViewport !== true/);
});

test('existing video opt-outs are preserved', () => {
  // 화면 폭 조건을 더하는 변경이다. 기존 회피 조건은 그대로여야 한다.
  const condition = heroMedia.match(/const shouldRenderVideo =([\s\S]*?);/)?.[1] ?? '';
  assert.match(condition, /!prefersReducedMotion/);
  assert.match(condition, /!saveData/);
  assert.match(condition, /!videoFailed/);
  assert.match(condition, /Boolean\(resolvedVideoSrc \|\| resolvedWebmSrc\)/);
});

test('the non-video branch renders the responsive poster image', () => {
  // 영상을 건너뛴 자리에는 반응형 대표 이미지가 남아야 한다.
  assert.match(heroMedia, /shouldRenderVideo \? \(/);
  assert.match(heroMedia, /<ResponsiveCmsImage/);
  assert.match(heroMedia, /mobileFilename=\{resolvedMobilePoster\}/);
});
