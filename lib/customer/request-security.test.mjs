import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('customer mutations compare Origin with the proxy-aware external origin', () => {
  const source = readFileSync(new URL('./request-security.ts', import.meta.url), 'utf8');

  assert.match(source, /getExternalOrigin\(request\)/);
  assert.doesNotMatch(source, /request\.nextUrl\.origin/);
});
