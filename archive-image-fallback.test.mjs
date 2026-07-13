import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(
  new URL('./app/[locale]/(site)/archive/page.tsx', import.meta.url),
  'utf8'
);
const horizontalSource = readFileSync(
  new URL('./components/chronicle/chronicle-horizontal.tsx', import.meta.url),
  'utf8'
);

test('Archive slides provide bundled milestone images as CMS failure fallbacks', () => {
  assert.match(pageSource, /content\.timeline\.items\.map\(\(item, index\) => \(\{/);
  assert.match(pageSource, /fallbackImage: imageSrc\(`chronicle_milestone_\$\{String\(index \+ 1\)\.padStart\(2, '0'\)\}\.png`\)/);
  assert.match(horizontalSource, /fallbackImage: string/);
});

test('Archive image failures hide the broken node before switching to a local fallback', () => {
  assert.match(horizontalSource, /function ChronicleSlideImage/);
  assert.match(horizontalSource, /event\.currentTarget\.style\.visibility = 'hidden'/);
  assert.match(horizontalSource, /setSource\(fallbackImage\)/);
  assert.match(horizontalSource, /setFailed\(true\)/);
  assert.doesNotMatch(horizontalSource, /src=\{slide\.image\}/);
});
