import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const buildScript = readFileSync(new URL('./scripts/build-frontend-only.mjs', import.meta.url), 'utf8');

test('frontend-only Golf inquiry patch preserves every supported query field', () => {
  assert.match(
    buildScript,
    /const query = \{\} as \{head\?: string; shaft\?: string; style\?: string; engraving\?: string\};/
  );
});

test('frontend-only build converts the RSS route to a static export', () => {
  assert.match(buildScript, /'app\/rss\.xml\/route\.ts'/);
  assert.match(
    buildScript,
    /relativePath === 'app\/sitemap\.ts' \|\|\s+relativePath === 'app\/rss\.xml\/route\.ts'/
  );
});
