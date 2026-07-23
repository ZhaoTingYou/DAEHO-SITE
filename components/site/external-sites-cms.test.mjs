import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const header = readFileSync(path.join(repoRoot, 'components/site/site-header.tsx'), 'utf8');
const footer = readFileSync(path.join(repoRoot, 'components/site/site-footer.tsx'), 'utf8');

test('header and footer consume the CMS external-site array', () => {
  assert.match(header, /footerText\.raw\('externalSites\.items'\)/);
  assert.match(header, /getVisibleExternalSites/);
  assert.match(footer, /getVisibleExternalSites\(text\.footer\.externalSites\.items\)/);
  assert.doesNotMatch(header, /showExternalHeaderLinks/);
  assert.doesNotMatch(footer, /showFooterExternalLinks/);
  assert.doesNotMatch(header, /externalLinks\./);
  assert.doesNotMatch(footer, /externalLinks\./);
});

test('all public positions iterate the same visible list', () => {
  assert.ok((header.match(/visibleExternalSites\.map/g) ?? []).length >= 2);
  assert.ok((footer.match(/visibleExternalSites\.map/g) ?? []).length >= 1);
});
